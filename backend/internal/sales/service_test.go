package sales

import (
	"testing"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

func TestSalesMetricsCalculation(t *testing.T) {
	svc := NewSalesService()

	// 100 units sold @ $50 gross = $5,000 gross revenue
	// Discounts: $200, Returns: $100, Taxes: $300 -> Net Rev = $4,400
	// Cost basis: $20/unit -> COGS = $2,000
	// Gross profit = $4,400 - $2,000 = $2,400
	// Direct realization costs: $400 -> Net Realized Cash = $4,000
	metrics := svc.CalculateMetrics(
		100,
		50,
		200,
		100,
		300,
		20,
		400,
	)

	if metrics.GrossSalesRevenue != 5000.0 {
		t.Fatalf("expected gross sales $5000, got %f", metrics.GrossSalesRevenue)
	}
	if metrics.NetSalesRevenue != 4400.0 {
		t.Fatalf("expected net sales $4400, got %f", metrics.NetSalesRevenue)
	}
	if metrics.COGS != 2000.0 {
		t.Fatalf("expected COGS $2000, got %f", metrics.COGS)
	}
	if metrics.GrossProfit != 2400.0 {
		t.Fatalf("expected gross profit $2400, got %f", metrics.GrossProfit)
	}
	if metrics.NetRealizedCash != 4000.0 {
		t.Fatalf("expected net realized cash $4000, got %f", metrics.NetRealizedCash)
	}
}

func TestInventoryStockDecrement(t *testing.T) {
	svc := NewSalesService()
	batch := &domain.InventoryBatch{
		ID:                uuid.New(),
		SKU:               "INV-SKU-100",
		QuantityTotal:     500,
		QuantityAvailable: 500,
		CostBasis:         25.0,
	}

	// Normal sale: 150 units
	err := svc.ProcessSaleEvent(batch, 150, 4500, 4200, "USD")
	if err != nil {
		t.Fatalf("unexpected error processing sale: %v", err)
	}
	if batch.QuantityAvailable != 350.0 {
		t.Fatalf("expected remaining available 350, got %f", batch.QuantityAvailable)
	}

	// Overselling attempt: 400 units (only 350 left) -> must fail
	err = svc.ProcessSaleEvent(batch, 400, 12000, 11000, "USD")
	if err == nil {
		t.Fatalf("expected overselling error, but succeeded")
	}
}
