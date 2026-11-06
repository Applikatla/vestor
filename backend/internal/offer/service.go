package offer

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

type OfferService struct {
	MaxAdvanceRate float64 // e.g. 0.80 (80%)
}

func NewOfferService(maxAdvanceRate float64) *OfferService {
	if maxAdvanceRate <= 0 || maxAdvanceRate > 1.0 {
		maxAdvanceRate = 0.75 // Default 75% max advance rate
	}
	return &OfferService{MaxAdvanceRate: maxAdvanceRate}
}

// ComputeTermsHash produces an immutable cryptographic digest of offering terms
func (s *OfferService) ComputeTermsHash(
	inventoryID uuid.UUID,
	targetAmount float64,
	tokenSupply float64,
	issuePrice float64,
	currency string,
	waterfallBasis string,
) string {
	raw := fmt.Sprintf("%s:%.4f:%.4f:%.4f:%s:%s",
		inventoryID.String(), targetAmount, tokenSupply, issuePrice, currency, waterfallBasis)
	h := sha256.Sum256([]byte(raw))
	return "0x" + hex.EncodeToString(h[:])
}

// CreateFinancingOffer validates target amount against eligible value and computes issuance parameters
func (s *OfferService) CreateFinancingOffer(
	inventory *domain.Inventory,
	latestValuation *domain.Valuation,
	targetAmount float64,
	tokenSupply float64,
	currency string,
	waterfallBasis string,
	subscriptionWindow time.Duration,
) (*domain.FinancingOffer, error) {
	if inventory.Status != domain.InventoryStatusRegistered && inventory.Status != domain.InventoryStatusActive {
		return nil, fmt.Errorf("inventory must be REGISTERED on-chain before tokenization")
	}
	if targetAmount <= 0 {
		return nil, fmt.Errorf("target amount must be > 0")
	}
	if tokenSupply <= 0 {
		return nil, fmt.Errorf("token supply must be > 0")
	}

	// Verify advance rate against net eligible collateral value
	advanceRate := targetAmount / latestValuation.EligibleValue
	if advanceRate > s.MaxAdvanceRate {
		return nil, fmt.Errorf("advance rate %.2f%% exceeds maximum policy limit of %.2f%%",
			advanceRate*100, s.MaxAdvanceRate*100)
	}

	// Issue price = Target / Supply
	issuePrice := targetAmount / tokenSupply

	termsHash := s.ComputeTermsHash(
		inventory.ID,
		targetAmount,
		tokenSupply,
		issuePrice,
		currency,
		waterfallBasis,
	)

	now := time.Now()
	endAt := now.Add(subscriptionWindow)

	return &domain.FinancingOffer{
		ID:           uuid.New(),
		InventoryID:  inventory.ID,
		OfferVersion: 1,
		TargetAmount: targetAmount,
		Currency:     currency,
		TokenSupply:  tokenSupply,
		IssuePrice:   issuePrice,
		TermsHash:    termsHash,
		Status:       domain.OfferStatusDraft,
		StartAt:      &now,
		EndAt:        &endAt,
	}, nil
}
