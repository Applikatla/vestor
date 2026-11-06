package sales

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"tokenization_inventory/backend/internal/domain"
)

type SalesService struct{}

func NewSalesService() *SalesService {
	return &SalesService{}
}

type FinancialMetrics struct {
	GrossSalesRevenue float64 `json:"gross_sales_revenue"`
	NetSalesRevenue   float64 `json:"net_sales_revenue"`
	COGS              float64 `json:"cogs"`
	GrossProfit       float64 `json:"gross_profit"`
	NetRealizedCash   float64 `json:"net_realized_cash"`
}

// CalculateMetrics computes the financial metrics per the architectural specification formulas
func (s *SalesService) CalculateMetrics(
	quantitySold float64,
	grossUnitPrice float64,
	discounts float64,
	returns float64,
	taxes float64,
	unitCostBasis float64,
	directCosts float64,
) FinancialMetrics {
	grossRev := quantitySold * grossUnitPrice
	netRev := grossRev - discounts - returns - taxes
	cogs := quantitySold * unitCostBasis
	grossProfit := netRev - cogs
	netRealizedCash := netRev - directCosts

	return FinancialMetrics{
		GrossSalesRevenue: grossRev,
		NetSalesRevenue:   netRev,
		COGS:              cogs,
		GrossProfit:       grossProfit,
		NetRealizedCash:   netRealizedCash,
	}
}

// ProcessSaleEvent validates batch quantity and records state transition
func (s *SalesService) ProcessSaleEvent(
	batch *domain.InventoryBatch,
	quantity float64,
	grossAmount float64,
	netAmount float64,
	currency string,
) error {
	if quantity <= 0 {
		return fmt.Errorf("sale quantity must be positive")
	}
	if batch.QuantityAvailable < quantity {
		return fmt.Errorf("insufficient batch inventory: requested %.2f, available %.2f",
			quantity, batch.QuantityAvailable)
	}
	if netAmount > grossAmount {
		return fmt.Errorf("net amount cannot exceed gross amount")
	}

	// Decrement available stock
	batch.QuantityAvailable -= quantity
	return nil
}

// BuildEIP712SalePayload generates the canonical data elements for attestor signature
func (s *SalesService) BuildEIP712SalePayload(
	inventoryIDBytes32 string,
	batchID string,
	saleID string,
	quantity uint64,
	grossAmountMinor uint64,
	netAmountMinor uint64,
	buyerRef string,
	nonce uint64,
) map[string]interface{} {
	h := sha256.Sum256([]byte(buyerRef))
	buyerRefHash := "0x" + hex.EncodeToString(h[:])

	return map[string]interface{}{
		"inventoryId":  inventoryIDBytes32,
		"batchId":      batchID,
		"saleId":       saleID,
		"quantity":     quantity,
		"grossAmount":  grossAmountMinor,
		"netAmount":    netAmountMinor,
		"buyerRefHash": buyerRefHash,
		"timestamp":    time.Now().Unix(),
		"nonce":        nonce,
	}
}
