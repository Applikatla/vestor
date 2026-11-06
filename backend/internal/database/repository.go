package database

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"tokenization_inventory/backend/internal/domain"
)

type Repository struct {
	db *DB
}

func NewRepository(db *DB) *Repository {
	return &Repository{db: db}
}

// 1. Companies
func (r *Repository) EnsureCompany(ctx context.Context, legalName, regNo string) (*uuid.UUID, error) {
	id := uuid.New()
	query := `
		INSERT INTO companies (id, legal_name, registration_no, kyb_status)
		VALUES ($1, $2, $3, 'VERIFIED')
		ON CONFLICT (registration_no) DO UPDATE SET updated_at = NOW()
		RETURNING id;
	`
	var existingID uuid.UUID
	err := r.db.Pool.QueryRow(ctx, query, id, legalName, regNo).Scan(&existingID)
	if err != nil {
		return nil, fmt.Errorf("failed ensuring company: %w", err)
	}
	return &existingID, nil
}

// 2. Inventories & Batches (Atomic Transaction)
func (r *Repository) SaveInventoryWithBatches(
	ctx context.Context,
	inv *domain.Inventory,
	batches []*domain.InventoryBatch,
	outboxMsg *domain.OutboxMessage,
) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed starting tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Insert inventory
	invQuery := `
		INSERT INTO inventories (
			id, inventory_id_bytes32, company_id, title, category, 
			status, evidence_root, schema_version, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (inventory_id_bytes32) DO UPDATE SET
			status = EXCLUDED.status,
			evidence_root = EXCLUDED.evidence_root,
			updated_at = NOW();
	`
	_, err = tx.Exec(ctx, invQuery,
		inv.ID, inv.InventoryIDBytes32, inv.CompanyID, inv.Title, inv.Category,
		inv.Status, inv.EvidenceRoot, inv.SchemaVersion, inv.CreatedAt, inv.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed inserting inventory: %w", err)
	}

	// Insert batches
	batchQuery := `
		INSERT INTO inventory_batches (
			id, inventory_id, sku, lot_no, warehouse_id, 
			quantity_total, quantity_available, unit, cost_basis, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
	`
	for _, b := range batches {
		if b.ID == uuid.Nil {
			b.ID = uuid.New()
		}
		_, err = tx.Exec(ctx, batchQuery,
			b.ID, inv.ID, b.SKU, b.LotNo, b.WarehouseID,
			b.QuantityTotal, b.QuantityAvailable, b.Unit, b.CostBasis,
		)
		if err != nil {
			return fmt.Errorf("failed inserting batch %s: %w", b.SKU, err)
		}
	}

	// Insert into Transactional Outbox if provided
	if outboxMsg != nil {
		outboxQuery := `
			INSERT INTO outbox (
				id, event_type, aggregate_id, payload, idempotency_key, status, attempts, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
		`
		_, err = tx.Exec(ctx, outboxQuery,
			outboxMsg.ID, outboxMsg.EventType, outboxMsg.AggregateID,
			outboxMsg.Payload, outboxMsg.IdempotencyKey, outboxMsg.Status,
			outboxMsg.Attempts, outboxMsg.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed inserting outbox message: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) UpdateInventoryChainStatus(
	ctx context.Context,
	inventoryID uuid.UUID,
	status domain.InventoryStatus,
	chainID int64,
	registryAddress string,
	txHash string,
) error {
	query := `
		UPDATE inventories 
		SET status = $2, chain_id = $3, registry_address = $4, registration_tx = $5, updated_at = NOW()
		WHERE id = $1;
	`
	_, err := r.db.Pool.Exec(ctx, query, inventoryID, status, chainID, registryAddress, txHash)
	return err
}

func (r *Repository) GetInventory(ctx context.Context, id uuid.UUID) (*domain.Inventory, error) {
	query := `
		SELECT id, inventory_id_bytes32, company_id, title, category, status, 
		       evidence_root, schema_version, COALESCE(chain_id, 0), COALESCE(registry_address, ''), 
		       COALESCE(registration_tx, ''), created_at, updated_at
		FROM inventories WHERE id = $1;
	`
	var inv domain.Inventory
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&inv.ID, &inv.InventoryIDBytes32, &inv.CompanyID, &inv.Title, &inv.Category,
		&inv.Status, &inv.EvidenceRoot, &inv.SchemaVersion, &inv.ChainID,
		&inv.RegistryAddress, &inv.RegistrationTx, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

// 3. Transactional Outbox
func (r *Repository) GetPendingOutboxMessages(ctx context.Context, limit int) ([]*domain.OutboxMessage, error) {
	query := `
		SELECT id, event_type, aggregate_id, payload, idempotency_key, status, attempts, created_at
		FROM outbox
		WHERE status IN ('PENDING', 'PROCESSING')
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED;
	`
	rows, err := r.db.Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*domain.OutboxMessage
	for rows.Next() {
		var m domain.OutboxMessage
		if err := rows.Scan(
			&m.ID, &m.EventType, &m.AggregateID, &m.Payload,
			&m.IdempotencyKey, &m.Status, &m.Attempts, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		messages = append(messages, &m)
	}
	return messages, nil
}

func (r *Repository) UpdateOutboxStatus(ctx context.Context, id uuid.UUID, status domain.OutboxStatus) error {
	query := `UPDATE outbox SET status = $2, updated_at = NOW() WHERE id = $1;`
	_, err := r.db.Pool.Exec(ctx, query, id, status)
	return err
}

// 4. Double-Entry Ledger
func (r *Repository) RecordLedgerEntry(ctx context.Context, entry *domain.LedgerEntry) error {
	query := `
		INSERT INTO ledger_entries (
			id, transaction_id, offer_id, debit_account_id, credit_account_id,
			amount, currency, description, reference_tx, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
	`
	_, err := r.db.Pool.Exec(ctx, query,
		entry.ID, entry.TransactionID, entry.OfferID,
		entry.DebitAccountID, entry.CreditAccountID, entry.Amount,
		entry.Currency, entry.Description, entry.ReferenceTx, entry.CreatedAt,
	)
	return err
}

// 5. Audit Log
func (r *Repository) RecordAuditLog(ctx context.Context, actor, action, entityType string, entityID uuid.UUID, beforeHash, afterHash string) error {
	query := `
		INSERT INTO audit_logs (id, actor, action, entity_type, entity_id, before_hash, after_hash, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());
	`
	_, err := r.db.Pool.Exec(ctx, query, uuid.New(), actor, action, entityType, entityID, beforeHash, afterHash)
	return err
}
