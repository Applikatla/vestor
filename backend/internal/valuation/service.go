package valuation

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

type ValuationService struct{}

func NewValuationService() *ValuationService {
	return &ValuationService{}
}

// RecordValuation computes net eligible collateral value after applying policy haircuts
func (s *ValuationService) RecordValuation(
	inventoryID uuid.UUID,
	grossValue float64,
	currency string,
	methodology string,
	valuer string,
	haircutPct float64,
	validityDuration time.Duration,
	rawReportData []byte,
) (*domain.Valuation, error) {
	if grossValue <= 0 {
		return nil, fmt.Errorf("gross valuation must be greater than zero")
	}
	if haircutPct < 0 || haircutPct > 90 {
		return nil, fmt.Errorf("haircut percentage must be between 0 and 90")
	}

	// Calculate eligible collateral value = Gross * (1 - Haircut%)
	eligibleValue := grossValue * (1.0 - (haircutPct / 100.0))

	h := sha256.Sum256(rawReportData)
	evidenceHash := "0x" + hex.EncodeToString(h[:])

	now := time.Now()
	return &domain.Valuation{
		ID:            uuid.New(),
		InventoryID:   inventoryID,
		Value:         grossValue,
		Currency:      currency,
		Methodology:   methodology,
		Valuer:        valuer,
		Haircut:       haircutPct,
		EligibleValue: eligibleValue,
		ValidFrom:     now,
		ExpiresAt:     now.Add(validityDuration),
		EvidenceHash:  evidenceHash,
	}, nil
}
