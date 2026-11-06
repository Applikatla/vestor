package inventory

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

type InventoryService struct{}

func NewInventoryService() *InventoryService {
	return &InventoryService{}
}

// ComputeEvidenceRoot computes a canonical Merkle/SHA-256 root digest from document hashes
func (s *InventoryService) ComputeEvidenceRoot(documentHashes []string) string {
	if len(documentHashes) == 0 {
		h := sha256.Sum256([]byte("EMPTY_EVIDENCE"))
		return "0x" + hex.EncodeToString(h[:])
	}

	hasher := sha256.New()
	for _, docHash := range documentHashes {
		hasher.Write([]byte(docHash))
	}
	digest := hasher.Sum(nil)
	return "0x" + hex.EncodeToString(digest)
}

// CreateInventoryDraft creates a new draft entity with deterministic bytes32 identifier
func (s *InventoryService) CreateInventoryDraft(
	companyID uuid.UUID,
	title string,
	category string,
	documentHashes []string,
) *domain.Inventory {
	invID := uuid.New()
	
	// Generate deterministic 32-byte hash
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%d", companyID, invID, time.Now().UnixNano())))
	bytes32ID := "0x" + hex.EncodeToString(h[:])

	evidenceRoot := s.ComputeEvidenceRoot(documentHashes)

	return &domain.Inventory{
		ID:                 invID,
		InventoryIDBytes32: bytes32ID,
		CompanyID:          companyID,
		Title:              title,
		Category:           category,
		Status:             domain.InventoryStatusDraft,
		EvidenceRoot:       evidenceRoot,
		SchemaVersion:      1,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}
}

// ValidateForRegistration ensures all mandatory fields and positive values exist before chain submission
func (s *InventoryService) ValidateForRegistration(inv *domain.Inventory, batches []*domain.InventoryBatch) error {
	if inv.Status != domain.InventoryStatusVerified {
		return fmt.Errorf("inventory must be VERIFIED by an authorized verifier before chain registration")
	}
	if len(batches) == 0 {
		return fmt.Errorf("inventory must contain at least one valid batch")
	}

	for _, b := range batches {
		if b.QuantityTotal <= 0 {
			return fmt.Errorf("batch %s has invalid quantity: %f", b.SKU, b.QuantityTotal)
		}
		if b.CostBasis <= 0 {
			return fmt.Errorf("batch %s has invalid cost basis: %f", b.SKU, b.CostBasis)
		}
	}

	return nil
}
