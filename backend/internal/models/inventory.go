package models

import (
	"time"
)

// Company represents an issuer / business entity on the platform.
type Company struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"not null" json:"name"`
	RegNumber     string    `gorm:"uniqueIndex;not null" json:"reg_number"`
	WalletAddress string    `gorm:"uniqueIndex;not null" json:"wallet_address"`
	KYBStatus     string    `gorm:"default:'VERIFIED'" json:"kyb_status"` // PENDING, VERIFIED, REJECTED
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Inventory represents the core physical inventory batch registered and tracked.
type Inventory struct {
	ID                  string              `gorm:"primaryKey;size:64" json:"id"`                      // Internal UUID
	InventoryID         string              `gorm:"uniqueIndex;size:66;not null" json:"inventory_id"`  // 0x-prefixed 32-byte hex for blockchain
	CanonicalRecordHash string              `gorm:"size:66;not null" json:"canonical_record_hash"`     // 0x-prefixed 32-byte keccak256 hash
	IssuerAddress       string              `gorm:"index;not null" json:"issuer_address"`
	WarehouseID         string              `gorm:"not null" json:"warehouse_id"`
	WarehouseName       string              `json:"warehouse_name"`
	WarehouseLocation   string              `json:"warehouse_location"`
	Status              string              `gorm:"default:'PENDING_REGISTRATION'" json:"status"` // PENDING_REGISTRATION, REGISTERED, APPROVED, REJECTED, FINANCED, ACTIVE_MONITORING, SETTLED
	RegistrationTxHash  string              `json:"registration_tx_hash,omitempty"`
	
	// Inspection & Valuation
	Valuation             float64           `json:"valuation"` // Appraised value in USD / stablecoin equivalent
	InspectionEvidenceURI string            `json:"inspection_evidence_uri,omitempty"`
	InspectionTxHash      string            `json:"inspection_tx_hash,omitempty"`
	
	// Financing parameters
	FinancingVaultAddress string            `json:"financing_vault_address,omitempty"`
	InventoryTokenAddress string            `json:"inventory_token_address,omitempty"`
	TargetCapital         float64           `json:"target_capital,omitempty"`
	TokenPrice            float64           `json:"token_price,omitempty"`
	AdvanceRateBps        uint              `json:"advance_rate_bps,omitempty"`
	
	// Real-time telemetry & stock tracking
	TotalInitialQuantity   uint             `json:"total_initial_quantity"`
	TotalRemainingQuantity uint             `json:"total_remaining_quantity"`
	TotalSoldQuantity      uint             `json:"total_sold_quantity"`
	TotalSalesProceeds     float64          `json:"total_sales_proceeds"`
	
	// Relationships
	Items     []InventoryItem     `gorm:"foreignKey:InventoryRefID;constraint:OnDelete:CASCADE" json:"items"`
	Documents []InventoryDocument `gorm:"foreignKey:InventoryRefID;constraint:OnDelete:CASCADE" json:"documents"`
	Events    []WarehouseEvent    `gorm:"foreignKey:InventoryRefID;constraint:OnDelete:CASCADE" json:"events,omitempty"`

	CreatedAt time.Time           `json:"created_at"`
	UpdatedAt time.Time           `json:"updated_at"`
}

// InventoryItem represents a distinct SKU inside an inventory batch.
type InventoryItem struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	InventoryRefID string    `gorm:"index;size:64;not null" json:"inventory_ref_id"`
	SKU            string    `gorm:"not null" json:"sku"`
	Name           string    `gorm:"not null" json:"name"`
	Category       string    `json:"category"`
	Quantity       uint      `gorm:"not null" json:"quantity"`
	UnitPrice      float64   `gorm:"not null" json:"unit_price"`
	BatchNumber    string    `json:"batch_number"`
	CreatedAt      time.Time `json:"created_at"`
}

// InventoryDocument tracks inspection certificates, invoices, warehouse receipts.
type InventoryDocument struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	InventoryRefID string    `gorm:"index;size:64;not null" json:"inventory_ref_id"`
	DocType        string    `json:"doc_type"` // WAREHOUSE_RECEIPT, INSPECTION_REPORT, INVOICE, INSURANCE
	DocName        string    `json:"doc_name"`
	DocURI         string    `json:"doc_uri"` // IPFS / HTTPS link
	DocHash        string    `json:"doc_hash"`
	CreatedAt      time.Time `json:"created_at"`
}

// WarehouseEvent records real-time sales, restocks, or dispatches from WMS/ERP.
type WarehouseEvent struct {
	ID                   uint      `gorm:"primaryKey" json:"id"`
	InventoryRefID       string    `gorm:"index;size:64;not null" json:"inventory_ref_id"`
	EventType            string    `gorm:"not null" json:"event_type"` // SALE, DISPATCH, AUDIT_COUNT
	SKU                  string    `json:"sku"`
	QuantityDelta        int       `json:"quantity_delta"` // negative for sales/dispatch, positive for restock
	ProceedsAmount       float64   `json:"proceeds_amount"`
	ReferenceReceipt     string    `json:"reference_receipt"`
	Notes                string    `json:"notes"`
	CreatedAt            time.Time `json:"created_at"`
}

