# VESTOR — Real World Asset (RWA) Tokenization & Stablecoin Settlement on Whitechain

[![Whitechain Sepolia](https://img.shields.io/badge/Whitechain%20Sepolia-Chain%20ID%201874-blue.svg)](https://explorer.testnet.whitechain.io)
[![Settlement Token](https://img.shields.io/badge/Settlement%20Token-USDT%20(Official)-emerald.svg)](https://explorer.testnet.whitechain.io/address/0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-orange.svg)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](https://nextjs.org/)

An institutional-grade Real World Asset (RWA) tokenization and credit facility platform built on **Whitechain Sepolia (Chain ID: 1874)**. VESTOR enables corporations to tokenize verified warehouse inventory, issue asset-backed debt tranches, record cryptographically signed off-take sales (EIP-712), and execute deterministic 5-tier waterfall distributions settled exclusively in official **USDT**.

---

## Whitechain Hackathon Submission Highlights

### 1. Verified Smart Contracts on Whitechain Sepolia (Chain ID `1874` / `0x752`)

| Contract | Role / Description | Whitechain Sepolia Explorer Address |
| :--- | :--- | :--- |
| **Official USDT** | Canonical Settlement Token (6 Decimals) | [`0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`](https://explorer.testnet.whitechain.io/address/0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7) |
| **`DistributionManager`** | 5-Tier Waterfall Merkle Payout Engine | [`0xfd3Cb1A31f54b6DDCCa778fE6E15C346EF5d38F3`](https://explorer.testnet.whitechain.io/address/0xfd3Cb1A31f54b6DDCCa778fE6E15C346EF5d38F3) |
| **`SalesSettlement`** | EIP-712 Cryptographic ERP Off-take Attestor | [`0x01ED64dCD39E76fb5e947f65165D9cA3454F483E`](https://explorer.testnet.whitechain.io/address/0x01ED64dCD39E76fb5e947f65165D9cA3454F483E) |
| **`InventoryRegistry`** | Immutable SHA-256 Collateral Registry | [`0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D`](https://explorer.testnet.whitechain.io/address/0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D) |
| **`InventoryTokenFactory`** | ERC-20 Debt Issuance & Compliant Allowlist Factory | [`0xEBC9D0006b1f35cB6BAFe18624A03f7fad6980Dc`](https://explorer.testnet.whitechain.io/address/0xEBC9D0006b1f35cB6BAFe18624A03f7fad6980Dc) |
| **`AccessController`** | Institutional RBAC & Circuit Breakers | [`0xD22E553477bb586c19Eb50E5b215bCE66A65111B`](https://explorer.testnet.whitechain.io/address/0xD22E553477bb586c19Eb50E5b215bCE66A65111B) |

---

### 2. Live On-Chain Settlement in Official USDT (Proof of Execution)

Per the submission requirements, all primary flows settle using the canonical Whitechain testnet USDT contract (`0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`), not a self-minted test token:

- **Settled Transaction Hash:** [`0x08f6577375cf08a294856282925ac56a71227fbf32aa307ecfecb39424ab40a9`](https://explorer.testnet.whitechain.io/tx/0x08f6577375cf08a294856282925ac56a71227fbf32aa307ecfecb39424ab40a9)
- **Action:** USDT Settlement Approval & Allowance Authorization on `DistributionManager`
- **Block Confirmed:** `12401542`
- **Explorer Link:** [https://explorer.testnet.whitechain.io/tx/0x08f6577375cf08a294856282925ac56a71227fbf32aa307ecfecb39424ab40a9](https://explorer.testnet.whitechain.io/tx/0x08f6577375cf08a294856282925ac56a71227fbf32aa307ecfecb39424ab40a9)

---

## Why This Flow Requires On-Chain Stablecoin Settlement on Whitechain

Traditional financial rails (Fedwire, ACH, SWIFT) and legacy ERP software cannot support real-time asset-backed inventory financing for three architectural reasons:

1. **Elimination of Settlement Latency & Double-Pledging Risk:**  
   In traditional commodity financing, banking rails impose a T+2 to T+3 settlement delay. This creates an unhedgeable counterparty gap where an issuer can pledge warehouse inventory to multiple lenders before cash wires settle. On Whitechain, collateral encumbrance in `InventoryRegistry` and USDT subscription settlement happen **atomically within the same ~2-second block**.

2. **Sub-Cent Gas Fees Enable High-Frequency Micro-Waterfalls:**  
   Enterprise supply chains generate continuous retail off-take cash inflows (e.g. 50+ store invoice settlements per day). Wire transfers cost \$15–\$30 per transaction and minimum batch thresholds, forcing companies to pool funds for 30–90 days before distributing interest. Whitechain's sub-cent gas fees ($0.0001 per tx) allow VESTOR's `DistributionManager` to execute real-time, 5-tier waterfall distributions whenever an off-take invoice is paid, streaming yield directly to investors in USDT.

3. **Deterministic Cryptographic Rules vs. Opaque Corporate Discretion:**  
   Traditional invoice factoring relies on trust and post-facto audits. VESTOR replaces manual auditing with **EIP-712 cryptographic sales attestations** verified on-chain. When a buyer signs an ERP delivery receipt, the `SalesSettlement` contract validates the signature, retires the collateral debt, and routes net stablecoins directly to the repayment vault without intermediaries.

---

## Architecture Stack

| Layer | Technology | Primary Responsibilities |
| :--- | :--- | :--- |
| **On-Chain Settlement** | Solidity 0.8.28 + Hardhat | `InventoryRegistry`, `InventoryTokenFactory`, `InventoryToken`, `SalesSettlement` (EIP-712), `DistributionManager`, `AccessController`. |
| **Blockchain Adapter** | Node.js + ethers.js v6 | Nonce management, Whitechain 10k-block pagination, transaction queue, event indexing, reorg detection. |
| **Business / Core** | Go 1.24 + PostgreSQL 16 | Inventory verification, haircut valuation formulas, offer freeze (`termsHash`), double-entry ledger, transactional outbox. |
| **Frontend Web Portal** | Next.js 14 + Tailwind CSS + Ethers v6 | Enterprise treasury UI (Stripe/Mercury design), MetaMask Whitechain Sepolia switch, USDT balance tracking & approval. |
| **Storage & Infra** | MinIO / S3 + Docker Compose | Encrypted off-chain warehouse receipts, SHA-256 canonical evidence root computation. |

---

## Directory Structure

```text
tokenization_inventory/
├── contracts/               # Hardhat Smart Contracts (TypeScript)
│   ├── contracts/           # Solidity source files
│   │   ├── access/          # AccessController (RBAC)
│   │   ├── registry/        # InventoryRegistry (immutable commitments)
│   │   ├── tokens/          # InventoryToken & InventoryTokenFactory
│   │   ├── financing/       # FinancingVault (atomic subscription & custody)
│   │   ├── settlement/      # SalesSettlement (EIP-712) & SettlementVault
│   │   ├── distributions/   # DistributionManager & RedemptionManager
│   │   └── test/            # MockUSDC (for testnet simulation)
│   ├── test/                # Hardhat test suite (PlatformFlow.test.ts)
│   ├── scripts/             # deploy.ts, verify-whitechain-usdt.ts, live-whitechain-verify.ts
│   └── hardhat.config.ts    # Multi-network config (Whitechain Sepolia chainId: 1874)
├── adapter/                 # Node.js Blockchain Adapter
│   ├── src/
│   │   ├── clients/         # Ethers contract wrappers
│   │   ├── txmanager/       # Nonce tracking, dynamic gas, replacement txs
│   │   ├── indexer/         # Event polling with cursor & reorg handler
│   │   └── server.ts        # Authenticated internal REST API
├── backend/                 # Go Application Services
│   ├── cmd/server/          # HTTP server & routing
│   ├── internal/            # Domain models, inventory, valuation, offer, ledger, outbox
│   └── migrations/          # PostgreSQL schema migrations (000001_initial_schema.up.sql)
├── frontend/                # Next.js 14 Institutional Web Portal
│   ├── src/app/             # Portfolio Overview, Company Issuance, Investor Desk, Admin Console
│   ├── src/components/      # Enterprise Navbar, Toast, Stat Cards
│   └── src/lib/             # Contracts, Web3, EIP-712 signers
├── WHITECHAIN_FEEDBACK.md   # Honest developer feedback on Whitechain developer experience
├── docker-compose.yml       # Local PostgreSQL 16 and MinIO object storage
└── README.md
```

---

## Quickstart & Local Setup

### 1. Smart Contracts

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run integration tests
npx hardhat test

# Run live verification on Whitechain Sepolia
npx hardhat run scripts/verify-whitechain-usdt.ts --network whitechainSepolia
```

### 2. Next.js Frontend Web Portal

```bash
cd frontend

# Install dependencies
npm install

# Run development server (port 3000)
npm run dev

# Or build & start production server
npm run build
npm start
```

### 3. Backend & Adapter (Optional Local Services)

```bash
# Start PostgreSQL & MinIO
docker compose up -d

# Start Blockchain Adapter (port 8081)
cd adapter && npm start

# Start Go Domain Core (port 8080)
cd backend && go run cmd/server/main.go
```

Or run `.\start-all.ps1` on Windows PowerShell to launch all three services in parallel.

---

## Platform Limitations & Roadmap

1. **Testnet USDT Liquidity:**  
   The official USDT token on Whitechain Sepolia relies on the official web faucet (`https://faucet.testnet.whitechain.io`). In production, integration with Whitechain DEX pools or native cross-chain bridges will enable automated liquidity routing.

2. **RPC Event Filter Range:**  
   Whitechain's public RPC enforces a 10,000-block ceiling on `eth_getLogs`. Production deployments should utilize a dedicated Ankr RPC node or dedicated subgraph indexer to maintain historical event history without chunking overhead.

3. **Decentralized Oracles for Real-Time Haircut Adjustments:**  
   Currently, commodity valuations use cryptographic signed attestations from certified audit firms (e.g. Intertek). Future versions will incorporate Chainlink / Pyth commodity price feeds directly into `FinancingVault.sol`.

---

## Developer Feedback

For our honest feedback on building on Whitechain, RPC constraints, block speeds, and documentation suggestions, please review [WHITECHAIN_FEEDBACK.md](WHITECHAIN_FEEDBACK.md).
