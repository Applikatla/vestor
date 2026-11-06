package offer

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
	"tokenization_inventory/backend/internal/valuation"
)

func TestOfferCreationAndAdvanceRateLimits(t *testing.T) {
	valSvc := valuation.NewValuationService()
	offSvc := NewOfferService(0.70) // 70% max advance rate

	invID := uuid.New()
	// Gross value $500,000, 20% haircut -> $400,000 net eligible value
	val, err := valSvc.RecordValuation(
		invID,
		500000.0,
		"USD",
		"COMPARABLE_SALES",
		"Certified Appraisal Corp",
		20.0,
		90*24*time.Hour,
		[]byte("APPRAISAL_FILE_CONTENT"),
	)
	if err != nil {
		t.Fatalf("unexpected valuation error: %v", err)
	}

	if val.EligibleValue != 400000.0 {
		t.Fatalf("expected eligible value 400,000, got %f", val.EligibleValue)
	}

	inv := &domain.Inventory{
		ID:     invID,
		Status: domain.InventoryStatusRegistered,
	}

	// 1. Valid Offer: Target $280,000 (Advance rate = $280k / $400k = 70%), 2,800 tokens ($100 per token)
	offer, err := offSvc.CreateFinancingOffer(inv, val, 280000.0, 2800.0, "USDC", "REVENUE_SHARE", 14*24*time.Hour)
	if err != nil {
		t.Fatalf("unexpected offer error: %v", err)
	}

	if offer.IssuePrice != 100.0 {
		t.Fatalf("expected issue price $100, got %f", offer.IssuePrice)
	}
	if offer.TermsHash == "" || len(offer.TermsHash) != 66 {
		t.Fatalf("invalid terms hash: %s", offer.TermsHash)
	}

	// 2. Invalid Offer exceeding advance rate: Target $350,000 ($350k / $400k = 87.5% > 70%)
	_, err = offSvc.CreateFinancingOffer(inv, val, 350000.0, 3500.0, "USDC", "REVENUE_SHARE", 14*24*time.Hour)
	if err == nil {
		t.Fatalf("expected advance rate policy violation error")
	}
}
