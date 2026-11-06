package domain

import (
	"time"

	"github.com/google/uuid"
)

type CompanyStatus string
const (
	CompanyStatusPending  CompanyStatus = "PENDING"
	CompanyStatusVerified CompanyStatus = "VERIFIED"
	CompanyStatusRejected CompanyStatus = "REJECTED"
)

type InventoryStatus string
const (
	InventoryStatusDraft               InventoryStatus = "DRAFT"
	InventoryStatusSubmitted           InventoryStatus = "SUBMITTED"
	InventoryStatusPendingVerification InventoryStatus = "PENDING_VERIFICATION"
	InventoryStatusVerified            InventoryStatus = "VERIFIED"
	InventoryStatusPendingChain        InventoryStatus = "PENDING_CHAIN"
	InventoryStatusRegistered          InventoryStatus = "REGISTERED"
	InventoryStatusActive              InventoryStatus = "ACTIVE"
	InventoryStatusClosed              InventoryStatus = "CLOSED"
	InventoryStatusChainFailed         InventoryStatus = "CHAIN_FAILED"
)

type OfferStatus string
const (
	OfferStatusDraft     OfferStatus = "DRAFT"
	OfferStatusReview    OfferStatus = "REVIEW"
	OfferStatusApproved  OfferStatus = "APPROVED"
	OfferStatusDeploying OfferStatus = "DEPLOYING"
	OfferStatusReady     OfferStatus = "READY"
	OfferStatusOpen      OfferStatus = "OPEN"
	OfferStatusFunded    OfferStatus = "FUNDED"
	OfferStatusSettling  OfferStatus = "SETTLING"
	OfferStatusClosed    OfferStatus = "CLOSED"
	OfferStatusFailed    OfferStatus = "FAILED"
	OfferStatusRefunding OfferStatus = "REFUNDING"
)

type OutboxStatus string
const (
	OutboxStatusPending    OutboxStatus = "PENDING"
	OutboxStatusProcessing OutboxStatus = "PROCESSING"
	OutboxStatusBroadcast  OutboxStatus = "BROADCAST"
	OutboxStatusConfirmed  OutboxStatus = "CONFIRMED"
	OutboxStatusFailed     OutboxStatus = "FAILED"
)

type Inventory struct {
	ID                 uuid.UUID       `json:"id"`
	InventoryIDBytes32 string          `json:"inventory_id_bytes32"`
	CompanyID          uuid.UUID       `json:"company_id"`
	Title              string          `json:"title"`
	Category           string          `json:"category"`
	Status             InventoryStatus `json:"status"`
	EvidenceRoot       string          `json:"evidence_root"`
	SchemaVersion      int             `json:"schema_version"`
	ChainID            int64           `json:"chain_id"`
	RegistryAddress    string          `json:"registry_address"`
	RegistrationTx     string          `json:"registration_tx"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

type InventoryBatch struct {
	ID                uuid.UUID `json:"id"`
	InventoryID       uuid.UUID `json:"inventory_id"`
	SKU               string    `json:"sku"`
	LotNo             string    `json:"lot_no"`
	WarehouseID       string    `json:"warehouse_id"`
	QuantityTotal     float64   `json:"quantity_total"`
	QuantityAvailable float64   `json:"quantity_available"`
	Unit              string    `json:"unit"`
	CostBasis         float64   `json:"cost_basis"`
	ExpiryOrAge       *time.Time `json:"expiry_or_age,omitempty"`
}

type Valuation struct {
	ID            uuid.UUID `json:"id"`
	InventoryID   uuid.UUID `json:"inventory_id"`
	Value         float64   `json:"value"`
	Currency      string    `json:"currency"`
	Methodology   string    `json:"methodology"`
	Valuer        string    `json:"valuer"`
	Haircut       float64   `json:"haircut"`
	EligibleValue float64   `json:"eligible_value"`
	ValidFrom     time.Time `json:"valid_from"`
	ExpiresAt     time.Time `json:"expires_at"`
	EvidenceHash  string    `json:"evidence_hash"`
}

type FinancingOffer struct {
	ID           uuid.UUID   `json:"id"`
	InventoryID  uuid.UUID   `json:"inventory_id"`
	OfferVersion int         `json:"offer_version"`
	TargetAmount float64     `json:"target_amount"`
	Currency     string      `json:"currency"`
	TokenSupply  float64     `json:"token_supply"`
	IssuePrice   float64     `json:"issue_price"`
	TermsHash    string      `json:"terms_hash"`
	Status       OfferStatus `json:"status"`
	StartAt      *time.Time  `json:"start_at,omitempty"`
	EndAt        *time.Time  `json:"end_at,omitempty"`
}

type OutboxMessage struct {
	ID             uuid.UUID    `json:"id"`
	EventType      string       `json:"event_type"`
	AggregateID    uuid.UUID    `json:"aggregate_id"`
	Payload        string       `json:"payload"`
	IdempotencyKey string       `json:"idempotency_key"`
	Status         OutboxStatus `json:"status"`
	Attempts       int          `json:"attempts"`
	CreatedAt      time.Time    `json:"created_at"`
}

type LedgerEntry struct {
	ID              uuid.UUID `json:"id"`
	TransactionID   uuid.UUID `json:"transaction_id"`
	OfferID         *uuid.UUID `json:"offer_id,omitempty"`
	DebitAccountID  uuid.UUID `json:"debit_account_id"`
	CreditAccountID uuid.UUID `json:"credit_account_id"`
	Amount          float64   `json:"amount"`
	Currency        string    `json:"currency"`
	Description     string    `json:"description"`
	ReferenceTx     string    `json:"reference_tx"`
	CreatedAt       time.Time `json:"created_at"`
}
