package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"ethglobal_mumbai/backend/internal/database"
	"ethglobal_mumbai/backend/internal/models"
	"ethglobal_mumbai/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// CreateInventoryRequest represents the input payload submitted by the issuer.
type CreateInventoryRequest struct {
	IssuerAddress     string                  `json:"issuer_address" binding:"required"`
	WarehouseID       string                  `json:"warehouse_id" binding:"required"`
	WarehouseName     string                  `json:"warehouse_name"`
	WarehouseLocation string                  `json:"warehouse_location" binding:"required"`
	Items             []CreateItemRequest     `json:"items" binding:"required,dive"`
	Documents         []CreateDocumentRequest `json:"documents"`
}

type CreateItemRequest struct {
	SKU         string  `json:"sku" binding:"required"`
	Name        string  `json:"name" binding:"required"`
	Category    string  `json:"category"`
	Quantity    uint    `json:"quantity" binding:"required,gt=0"`
	UnitPrice   float64 `json:"unit_price" binding:"required,gt=0"`
	BatchNumber string  `json:"batch_number"`
}

type CreateDocumentRequest struct {
	DocType string `json:"doc_type" binding:"required"` // WAREHOUSE_RECEIPT, INVOICE, INSPECTION_REPORT
	DocName string `json:"doc_name" binding:"required"`
	DocURI  string `json:"doc_uri" binding:"required"`
	DocHash string `json:"doc_hash"`
}

type ConfirmTxRequest struct {
	TxHash string `json:"tx_hash" binding:"required"`
}

type InspectionRequest struct {
	Valuation   float64 `json:"valuation" binding:"required,gt=0"`
	Status      string  `json:"status" binding:"required"` // APPROVED, REJECTED
	EvidenceURI string  `json:"evidence_uri" binding:"required"`
	TxHash      string  `json:"tx_hash"`
}

type ConfirmIssuanceRequest struct {
	InventoryTokenAddress string  `json:"inventory_token_address" binding:"required"`
	FinancingVaultAddress string  `json:"financing_vault_address" binding:"required"`
	TargetCapital         float64 `json:"target_capital" binding:"required,gt=0"`
	TokenPrice            float64 `json:"token_price" binding:"required,gt=0"`
	AdvanceRateBps        uint    `json:"advance_rate_bps" binding:"required"`
	TxHash                string  `json:"tx_hash"`
}

type WarehouseEventRequest struct {
	EventType        string  `json:"event_type" binding:"required"` // SALE, DISPATCH, AUDIT_COUNT
	SKU              string  `json:"sku" binding:"required"`
	QuantityDelta    int     `json:"quantity_delta" binding:"required"` // e.g. -5 for sales
	ProceedsAmount   float64 `json:"proceeds_amount"`
	ReferenceReceipt string  `json:"reference_receipt"`
	Notes            string  `json:"notes"`
}

// RegisterCompany registers a business entity with KYC/KYB.
func RegisterCompany(c *gin.Context) {
	var company models.Company
	if err := c.ShouldBindJSON(&company); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	company.WalletAddress = strings.ToLower(company.WalletAddress)
	if err := database.DB.Create(&company).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Company registration failed or already exists: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Company registered and verified successfully.",
		"company": company,
	})
}

// CreateInventory validates input, stores in DB, and generates on-chain hashes for frontend wallet signing.
func CreateInventory(registryAddress string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateInventoryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Validation failed: " + err.Error()})
			return
		}

		issuerAddress := strings.ToLower(req.IssuerAddress)
		internalID, bytes32InventoryID := services.GenerateInventoryID(issuerAddress, req.WarehouseID)

		var totalQty uint
		var items []models.InventoryItem
		for _, item := range req.Items {
			totalQty += item.Quantity
			items = append(items, models.InventoryItem{
				InventoryRefID: internalID,
				SKU:            item.SKU,
				Name:           item.Name,
				Category:       item.Category,
				Quantity:       item.Quantity,
				UnitPrice:      item.UnitPrice,
				BatchNumber:    item.BatchNumber,
			})
		}

		var docs []models.InventoryDocument
		for _, doc := range req.Documents {
			docs = append(docs, models.InventoryDocument{
				InventoryRefID: internalID,
				DocType:        doc.DocType,
				DocName:        doc.DocName,
				DocURI:         doc.DocURI,
				DocHash:        doc.DocHash,
			})
		}

		inv := models.Inventory{
			ID:                     internalID,
			InventoryID:            bytes32InventoryID,
			IssuerAddress:          issuerAddress,
			WarehouseID:            req.WarehouseID,
			WarehouseName:          req.WarehouseName,
			WarehouseLocation:      req.WarehouseLocation,
			Status:                 "PENDING_REGISTRATION",
			TotalInitialQuantity:   totalQty,
			TotalRemainingQuantity: totalQty,
			TotalSoldQuantity:      0,
			TotalSalesProceeds:     0,
			Items:                  items,
			Documents:              docs,
		}

		// Calculate canonical record hash
		canonicalHash, err := services.CalculateCanonicalRecordHash(&inv)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate canonical hash: " + err.Error()})
			return
		}
		inv.CanonicalRecordHash = canonicalHash

		// Save into Database
		if err := database.DB.Create(&inv).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database storage error: " + err.Error()})
			return
		}

		// Return confirmation and exact parameters for frontend ethers.js wallet signing
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Inventory stored in PostgreSQL. Ready for on-chain registration transaction.",
			"data": gin.H{
				"id":                    inv.ID,
				"inventory_id":          inv.InventoryID,
				"canonical_record_hash": inv.CanonicalRecordHash,
				"issuer_address":        inv.IssuerAddress,
				"status":                inv.Status,
				"total_quantity":        inv.TotalInitialQuantity,
				"blockchain_call": gin.H{
					"contract_address": registryAddress,
					"method":           "registerInventory",
					"args": gin.H{
						"inventoryId":         inv.InventoryID,
						"canonicalRecordHash": inv.CanonicalRecordHash,
						"issuer":              inv.IssuerAddress,
					},
				},
			},
		})
	}
}

// ConfirmRegistration updates DB after frontend successfully signs and broadcasts registerInventory tx.
func ConfirmRegistration(c *gin.Context) {
	id := c.Param("id")
	var req ConfirmTxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inv models.Inventory
	if err := database.DB.Where("id = ? OR inventory_id = ?", id, id).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	inv.RegistrationTxHash = req.TxHash
	inv.Status = "REGISTERED"

	if err := database.DB.Save(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update registration status: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Inventory registration confirmed and committed to database.",
		"inventory": inv,
	})
}

// RecordInspection updates valuation and approval status.
func RecordInspection(c *gin.Context) {
	id := c.Param("id")
	var req InspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inv models.Inventory
	if err := database.DB.Where("id = ? OR inventory_id = ?", id, id).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	status := strings.ToUpper(req.Status)
	if status != "APPROVED" && status != "REJECTED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be either APPROVED or REJECTED"})
		return
	}

	inv.Valuation = req.Valuation
	inv.Status = status
	inv.InspectionEvidenceURI = req.EvidenceURI
	inv.InspectionTxHash = req.TxHash

	if err := database.DB.Save(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inspection: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Inspection and valuation recorded.",
		"inventory": inv,
	})
}

// ConfirmIssuance updates DB when frontend deploys InventoryERC20 and initializes FinancingVault issuance.
func ConfirmIssuance(c *gin.Context) {
	id := c.Param("id")
	var req ConfirmIssuanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inv models.Inventory
	if err := database.DB.Where("id = ? OR inventory_id = ?", id, id).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	inv.InventoryTokenAddress = req.InventoryTokenAddress
	inv.FinancingVaultAddress = req.FinancingVaultAddress
	inv.TargetCapital = req.TargetCapital
	inv.TokenPrice = req.TokenPrice
	inv.AdvanceRateBps = req.AdvanceRateBps
	inv.Status = "FINANCED"

	if err := database.DB.Save(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update issuance: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Issuance records updated in database.",
		"inventory": inv,
	})
}

// IngestWarehouseEvent processes incoming sales / stock telemetry from ERP.
func IngestWarehouseEvent(c *gin.Context) {
	id := c.Param("id")
	var req WarehouseEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var inv models.Inventory
	if err := database.DB.Preload("Items").Where("id = ? OR inventory_id = ?", id, id).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	// Update stock ledger
	event := models.WarehouseEvent{
		InventoryRefID:   inv.ID,
		EventType:        strings.ToUpper(req.EventType),
		SKU:              req.SKU,
		QuantityDelta:    req.QuantityDelta,
		ProceedsAmount:   req.ProceedsAmount,
		ReferenceReceipt: req.ReferenceReceipt,
		Notes:            req.Notes,
	}

	if err := database.DB.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record event: " + err.Error()})
		return
	}

	// If sale/dispatch (negative delta), update totals
	if req.QuantityDelta < 0 {
		sold := uint(-req.QuantityDelta)
		inv.TotalSoldQuantity += sold
		if inv.TotalRemainingQuantity >= sold {
			inv.TotalRemainingQuantity -= sold
		} else {
			inv.TotalRemainingQuantity = 0
		}
		inv.TotalSalesProceeds += req.ProceedsAmount
	}

	database.DB.Save(&inv)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Warehouse telemetry ingested and inventory ledger recalculated.",
		"ledger": gin.H{
			"total_sold_quantity":      inv.TotalSoldQuantity,
			"total_remaining_quantity": inv.TotalRemainingQuantity,
			"total_sales_proceeds":     inv.TotalSalesProceeds,
		},
	})
}

// GetInventories lists inventories with optional filtering.
func GetInventories(c *gin.Context) {
	issuer := c.Query("issuer")
	status := c.Query("status")

	query := database.DB.Preload("Items").Preload("Documents").Order("created_at desc")
	if issuer != "" {
		query = query.Where("LOWER(issuer_address) = ?", strings.ToLower(issuer))
	}
	if status != "" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}

	var inventories []models.Inventory
	if err := query.Find(&inventories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"count":   len(inventories),
		"data":    inventories,
	})
}

// GetInventoryByID fetches single inventory details.
func GetInventoryByID(c *gin.Context) {
	id := c.Param("id")

	var inv models.Inventory
	if err := database.DB.Preload("Items").Preload("Documents").Preload("Events").
		Where("id = ? OR inventory_id = ?", id, id).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    inv,
	})
}

// BuyInventoryRequest represents input from a physical inventory buyer.
type BuyInventoryRequest struct {
	SKU          string  `json:"sku" binding:"required"`
	Quantity     uint    `json:"quantity" binding:"required,gt=0"`
	BuyerAddress string  `json:"buyer_address" binding:"required"`
	TxHash       string  `json:"tx_hash"`
	AmountPaid   float64 `json:"amount_paid"`
}

// BuyInventoryItem processes a physical item purchase by a buyer using Mock USDC.
func BuyInventoryItem(c *gin.Context) {
	id := c.Param("id")
	var req BuyInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase request: " + err.Error()})
		return
	}

	var inv models.Inventory
	if err := database.DB.Preload("Items").Where("id = ? OR inventory_id = ?", id, id).First(&inv).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inventory batch not found"})
		return
	}

	// Locate the specific SKU item
	var targetItem *models.InventoryItem
	for i := range inv.Items {
		if strings.EqualFold(inv.Items[i].SKU, req.SKU) {
			targetItem = &inv.Items[i]
			break
		}
	}

	if targetItem == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("SKU '%s' not found in this inventory batch", req.SKU)})
		return
	}

	if targetItem.Quantity < req.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Insufficient physical stock: %d requested but only %d available", req.Quantity, targetItem.Quantity)})
		return
	}

	totalCost := float64(req.Quantity) * targetItem.UnitPrice
	if req.AmountPaid > 0 {
		totalCost = req.AmountPaid
	}

	// Decrement specific SKU item quantity
	targetItem.Quantity -= req.Quantity
	if err := database.DB.Save(targetItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update item stock: " + err.Error()})
		return
	}

	// Update overall inventory batch totals
	inv.TotalSoldQuantity += req.Quantity
	if inv.TotalRemainingQuantity >= req.Quantity {
		inv.TotalRemainingQuantity -= req.Quantity
	} else {
		inv.TotalRemainingQuantity = 0
	}
	inv.TotalSalesProceeds += totalCost

	// Record telemetry event in ledger
	event := models.WarehouseEvent{
		InventoryRefID:   inv.ID,
		EventType:        "SALE",
		SKU:              req.SKU,
		QuantityDelta:    -int(req.Quantity),
		ProceedsAmount:   totalCost,
		ReferenceReceipt: req.TxHash,
		Notes:            fmt.Sprintf("Purchased by %s for $%.2f USDC", req.BuyerAddress, totalCost),
	}
	database.DB.Create(&event)

	if err := database.DB.Save(&inv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inventory batch ledger: " + err.Error()})
		return
	}

	// Dynamic calculation of Token Market Value from realized sales profit
	basePrice := inv.TokenPrice
	if basePrice <= 0 {
		basePrice = 1.0
	}
	targetCap := inv.TargetCapital
	if targetCap <= 0 {
		targetCap = 80000.0
	}

	// 20% margin on retail goods flows directly to tranche market valuation
	salesProfitPercent := (inv.TotalSalesProceeds * 0.20 / targetCap) * 100.0
	tokenMarketValue := basePrice * (1.0 + (salesProfitPercent / 100.0))

	c.JSON(http.StatusOK, gin.H{
		"success":              true,
		"message":              fmt.Sprintf("Successfully purchased %d units of %s", req.Quantity, targetItem.Name),
		"inventory_id":         inv.InventoryID,
		"sku":                  req.SKU,
		"quantity_purchased":   req.Quantity,
		"amount_paid":          totalCost,
		"tx_hash":              req.TxHash,
		"remaining_stock":      targetItem.Quantity,
		"total_sold_quantity":  inv.TotalSoldQuantity,
		"total_sales_proceeds": inv.TotalSalesProceeds,
		"sales_profit_percent": salesProfitPercent,
		"token_market_value":   tokenMarketValue,
	})
}

