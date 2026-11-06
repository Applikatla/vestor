package inventory

import (
	"testing"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

func TestInventoryDraftAndEvidenceRoot(t *testing.T) {
	svc := NewInventoryService()
	companyID := uuid.New()

	docs := []string{
		"0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", // SHA-256 of test document
		"0x5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // SHA-256 of warehouse report
	}

	root := svc.ComputeEvidenceRoot(docs)
	if root == "" || len(root) != 66 {
		t.Fatalf("expected 66-character hex root hash, got %s", root)
	}

	draft := svc.CreateInventoryDraft(companyID, "Grade-A Arabica Coffee Beans", "COMMODITY", docs)
	if draft.CompanyID != companyID {
		t.Fatalf("company ID mismatch")
	}
	if draft.Status != domain.InventoryStatusDraft {
		t.Fatalf("expected status DRAFT, got %s", draft.Status)
	}
	if draft.EvidenceRoot != root {
		t.Fatalf("expected evidence root to match")
	}
}

func TestValidationFailsWhenNotVerified(t *testing.T) {
	svc := NewInventoryService()
	draft := &domain.Inventory{
		Status: domain.InventoryStatusDraft,
	}
	batches := []*domain.InventoryBatch{
		{
			SKU:               "COFFEE-01",
			QuantityTotal:     1000,
			QuantityAvailable: 1000,
			CostBasis:         5.50,
		},
	}

	err := svc.ValidateForRegistration(draft, batches)
	if err == nil {
		t.Fatalf("expected error when validating draft that is not yet VERIFIED")
	}
}
