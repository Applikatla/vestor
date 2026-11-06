-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_name VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100) NOT NULL UNIQUE,
    jurisdiction VARCHAR(100) NOT NULL DEFAULT 'India',
    kyb_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users / Memberships
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- ADMIN, ISSUER, VERIFIER, ATTESTOR, TREASURY, COMPLIANCE
    permissions TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Wallet Bindings (Nonce-verified wallets)
CREATE TABLE IF NOT EXISTS wallet_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_type VARCHAR(50) NOT NULL, -- COMPANY, USER, INVESTOR
    owner_id UUID NOT NULL,
    chain_id BIGINT NOT NULL, -- 1874 (Whitechain Sepolia), 11155111 (Sepolia)
    wallet_address VARCHAR(42) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature_nonce VARCHAR(100) NOT NULL,
    UNIQUE(chain_id, wallet_address)
);

-- 4. Inventories (Platform master record)
CREATE TABLE IF NOT EXISTS inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id_bytes32 VARCHAR(66) NOT NULL UNIQUE, -- Deterministic bytes32 hex
    company_id UUID NOT NULL REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, PENDING_VERIFICATION, VERIFIED, PENDING_CHAIN, REGISTERED, ACTIVE, CLOSED, CHAIN_FAILED
    evidence_root VARCHAR(66) NOT NULL, -- Merkle/SHA-256 root hash of canonical evidence
    schema_version INT NOT NULL DEFAULT 1,
    chain_id BIGINT,
    registry_address VARCHAR(42),
    registration_tx VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Inventory Batches
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    lot_no VARCHAR(100) NOT NULL,
    warehouse_id VARCHAR(100) NOT NULL,
    quantity_total NUMERIC(18, 4) NOT NULL,
    quantity_available NUMERIC(18, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- KG, UNITS, METERS, BARRELS
    cost_basis NUMERIC(18, 4) NOT NULL, -- Per-unit acquisition/production cost
    expiry_or_age TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Inventory Evidence
CREATE TABLE IF NOT EXISTS inventory_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    evidence_type VARCHAR(100) NOT NULL, -- INVOICE, WAREHOUSE_RECEIPT, INSURANCE, LIEN_SEARCH
    object_key VARCHAR(500) NOT NULL, -- MinIO/S3 object reference
    content_hash VARCHAR(66) NOT NULL, -- SHA-256
    version INT NOT NULL DEFAULT 1,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    verified_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Inventory Verifications
CREATE TABLE IF NOT EXISTS inventory_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    verifier_id UUID NOT NULL REFERENCES users(id),
    verification_type VARCHAR(100) NOT NULL, -- PHYSICAL_AUDIT, TITLE_SEARCH, CUSTODY_CHECK
    decision VARCHAR(50) NOT NULL, -- APPROVED, REJECTED, NEEDS_REMEDIATION
    notes TEXT,
    signed_payload_hash VARCHAR(66),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Valuations
CREATE TABLE IF NOT EXISTS valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
    value NUMERIC(24, 6) NOT NULL, -- Appraised gross market value
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    methodology VARCHAR(100) NOT NULL,
    valuer VARCHAR(255) NOT NULL,
    haircut NUMERIC(5, 2) NOT NULL DEFAULT 30.00, -- e.g. 30% discount
    eligible_value NUMERIC(24, 6) NOT NULL, -- Value after haircut & exclusions
    valid_from TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    evidence_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Financing Offers
CREATE TABLE IF NOT EXISTS financing_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES inventories(id),
    offer_version INT NOT NULL DEFAULT 1,
    target_amount NUMERIC(24, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
    token_supply NUMERIC(24, 6) NOT NULL,
    issue_price NUMERIC(24, 6) NOT NULL, -- Target / Supply
    terms_hash VARCHAR(66) NOT NULL, -- Canonical immutable hash of contract terms
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, REVIEW, APPROVED, DEPLOYING, READY, OPEN, FUNDED, SETTLING, CLOSED, FAILED, REFUNDING
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Token Contracts
CREATE TABLE IF NOT EXISTS token_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES financing_offers(id),
    chain_id BIGINT NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    artifact_version VARCHAR(50) NOT NULL,
    bytecode_hash VARCHAR(66) NOT NULL,
    deployment_tx VARCHAR(66) NOT NULL,
    decimals INT NOT NULL DEFAULT 18,
    total_supply NUMERIC(36, 0) NOT NULL, -- Integer base units (wei equivalent)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Investors & Investments
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_profile_ref VARCHAR(255) NOT NULL,
    eligibility_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    risk_flags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES financing_offers(id),
    investor_id UUID NOT NULL REFERENCES investors(id),
    amount NUMERIC(24, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
    token_amount NUMERIC(36, 0) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED', -- CREATED, PENDING_TX, CONFIRMED, ALLOCATED, REFUNDED
    subscription_tx VARCHAR(66),
    allocation_tx VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Double-Entry Accounting Ledger
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 1010_VAULT_USDC, 2010_ISSUER_PAYABLE
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL, -- Groups debit and credit legs
    offer_id UUID REFERENCES financing_offers(id),
    debit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    credit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
    amount NUMERIC(24, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    description TEXT,
    reference_tx VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Sales Events & Attestations
CREATE TABLE IF NOT EXISTS sales_raw_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system VARCHAR(100) NOT NULL, -- ERP, POS, WAREHOUSE
    source_event_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    dedupe_key VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id_bytes32 VARCHAR(66) NOT NULL UNIQUE,
    inventory_id UUID NOT NULL REFERENCES inventories(id),
    batch_id UUID NOT NULL REFERENCES inventory_batches(id),
    quantity NUMERIC(18, 4) NOT NULL,
    gross_amount NUMERIC(24, 6) NOT NULL,
    net_amount NUMERIC(24, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    sale_state VARCHAR(50) NOT NULL, -- COMPLETED, INVOICED, PAID, RETURNED, REVERSED
    payment_state VARCHAR(50) NOT NULL, -- UNPAID, PARTIAL, SETTLED
    source_event_id UUID REFERENCES sales_raw_events(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_attestations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id),
    signer VARCHAR(42) NOT NULL,
    payload_hash VARCHAR(66) NOT NULL,
    nonce BIGINT NOT NULL,
    chain_tx VARCHAR(66),
    attestation_state VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ATTESTED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Distributions & Redemptions
CREATE TABLE IF NOT EXISTS distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES financing_offers(id),
    distribution_no INT NOT NULL,
    asset VARCHAR(10) NOT NULL DEFAULT 'USDC',
    total_amount NUMERIC(24, 6) NOT NULL,
    basis VARCHAR(50) NOT NULL, -- REVENUE_SHARE, PROFIT_SHARE, COUPON
    snapshot_ref VARCHAR(100) NOT NULL, -- Block number or date snapshot
    terms_hash VARCHAR(66) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DECLARED', -- DECLARED, ACTIVE, COMPLETED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(offer_id, distribution_no)
);

CREATE TABLE IF NOT EXISTS distribution_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribution_id UUID NOT NULL REFERENCES distributions(id),
    investor_id UUID NOT NULL REFERENCES investors(id),
    entitlement NUMERIC(24, 6) NOT NULL,
    claimed_amount NUMERIC(24, 6) NOT NULL DEFAULT 0,
    claim_tx VARCHAR(66),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, CLAIMED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(distribution_id, investor_id)
);

CREATE TABLE IF NOT EXISTS redemption_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES financing_offers(id),
    investor_id UUID NOT NULL REFERENCES investors(id),
    token_amount NUMERIC(36, 0) NOT NULL,
    price_basis NUMERIC(24, 6) NOT NULL,
    amount_due NUMERIC(24, 6) NOT NULL,
    amount_paid NUMERIC(24, 6) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, VALIDATED, TOKENS_LOCKED, QUEUED, APPROVED, PAID_AND_BURNED, REJECTED
    request_tx VARCHAR(66),
    execute_tx VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Blockchain Integration & Transactional Outbox
CREATE TABLE IF NOT EXISTS outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, BROADCAST, CONFIRMED, FAILED
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id BIGINT NOT NULL,
    signer VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    method VARCHAR(100) NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    nonce BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, MINED, CONFIRMED, REVERTED, REPLACED
    block_no BIGINT,
    gas_used BIGINT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id BIGINT NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INT NOT NULL,
    block_no BIGINT NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chain_id, tx_hash, log_index)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    before_hash VARCHAR(66),
    after_hash VARCHAR(66),
    correlation_id VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
