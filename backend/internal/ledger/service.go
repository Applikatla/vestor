package ledger

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

type DoubleEntryLedger struct{}

func NewDoubleEntryLedger() *DoubleEntryLedger {
	return &DoubleEntryLedger{}
}

// CreateJournalEntry creates balanced immutable debit and credit ledger pairs
func (l *DoubleEntryLedger) CreateJournalEntry(
	offerID *uuid.UUID,
	debitAccountID uuid.UUID,
	creditAccountID uuid.UUID,
	amount float64,
	currency string,
	description string,
	referenceTx string,
) (*domain.LedgerEntry, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("ledger entry amount must be strictly greater than zero")
	}
	if debitAccountID == creditAccountID {
		return nil, fmt.Errorf("debit and credit accounts must be distinct")
	}
	if currency == "" {
		return nil, fmt.Errorf("currency must be specified")
	}

	txID := uuid.New()
	entry := &domain.LedgerEntry{
		ID:              uuid.New(),
		TransactionID:   txID,
		OfferID:         offerID,
		DebitAccountID:  debitAccountID,
		CreditAccountID: creditAccountID,
		Amount:          amount,
		Currency:        currency,
		Description:     description,
		ReferenceTx:     referenceTx,
		CreatedAt:       time.Now(),
	}

	return entry, nil
}
