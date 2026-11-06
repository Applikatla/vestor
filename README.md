# Inventory Financing & Tokenization Platform

An institutional-grade platform enabling companies to register real-world inventory, optionally seek financing via tokenized issuances, monitor ongoing sales via attested ERP/POS feeds, and settle investor entitlements under deterministic waterfall rules.

Targeted for deployment on **Whitechain Sepolia (Chain ID: 1874)** and **Ethereum Sepolia (Chain ID: 11155111)**.

---

## Architecture Stack

| Layer | Technology | Primary Responsibilities |
| :--- | :--- | :--- |
| **On-Chain Settlement** | Solidity 0.8.24 + Hardhat | `InventoryRegistry`, `InventoryToken` (ERC-20), `FinancingVault`, `SalesSettlement` (EIP-712), `DistributionManager`, `RedemptionManager`. |
| **Blockchain Adapter** | Node.js + ethers.js v6 | Nonce management, gas pricing (EIP-1559), transaction queue, event indexing, reorg detection. |
| **Business / Core** | Go 1.24 + PostgreSQL 16 | Inventory verification, haircut valuation formulas, offer freeze (`termsHash`), double-entry ledger, transactional outbox. |
| **Storage & Infra** | MinIO / S3 + Docker Compose | Encrypted off-chain documents, SHA-256 canonical evidence root computation. |

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
│   ├── scripts/             # deploy.ts (supports Whitechain Sepolia & Sepolia)
│   └── hardhat.config.ts    # Multi-network config
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
├── docker-compose.yml       # Local PostgreSQL 16 and MinIO object storage
└── README.md
```

---

## Quickstart

### 1. Smart Contracts (Hardhat)

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run full test suite (8 integration scenarios covering Phase A through G)
npx hardhat test

# Deploy locally on Hardhat node
npx hardhat run scripts/deploy.ts --network hardhat

# Deploy to Whitechain Sepolia Testnet
npx hardhat run scripts/deploy.ts --network whitechainSepolia
```

### 2. Node.js Blockchain Adapter

```bash
cd adapter

# Install & compile TypeScript
npm install
npm run build

# Start the adapter server (port 8081)
npm start
```

### 3. Go Backend & PostgreSQL

```bash
# Start PostgreSQL & MinIO
docker compose up -d

# Run Go backend tests
cd backend
go test -v ./...

# Run the backend server (port 8080)
go run cmd/server/main.go
```

### 4. Next.js Frontend Web Portal

```bash
cd frontend

# Run in development mode (port 3000)
npm run dev

# Or build & start production server
npm run build
npm start
```


---

## Network Configurations

### Whitechain Sepolia Testnet (Active Primary Deployment)
- **Network Name**: Whitechain Sepolia
- **Chain ID**: `1874` (`0x752`)
- **RPC URL**: `https://rpc.testnet.whitechain.io`
- **Native Currency**: `WBT`
- **Block Explorer**: `https://explorer.testnet.whitechain.io`

#### Live Deployed Contracts on Whitechain Sepolia:
- **`AccessController`**: [`0xD22E553477bb586c19Eb50E5b215bCE66A65111B`](https://explorer.testnet.whitechain.io/address/0xD22E553477bb586c19Eb50E5b215bCE66A65111B)
- **`InventoryRegistry`**: [`0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D`](https://explorer.testnet.whitechain.io/address/0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D)
- **`InventoryTokenFactory`**: [`0xEBC9D0006b1f35cB6BAFe18624A03f7fad6980Dc`](https://explorer.testnet.whitechain.io/address/0xEBC9D0006b1f35cB6BAFe18624A03f7fad6980Dc)
- **`SalesSettlement`**: [`0x01ED64dCD39E76fb5e947f65165D9cA3454F483E`](https://explorer.testnet.whitechain.io/address/0x01ED64dCD39E76fb5e947f65165D9cA3454F483E)
- **`DistributionManager`**: [`0xfd3Cb1A31f54b6DDCCa778fE6E15C346EF5d38F3`](https://explorer.testnet.whitechain.io/address/0xfd3Cb1A31f54b6DDCCa778fE6E15C346EF5d38F3)
- **`MockUSDC`**: [`0x100F1843Bf91962349cE9C84F45ae6581Eb72B61`](https://explorer.testnet.whitechain.io/address/0x100F1843Bf91962349cE9C84F45ae6581Eb72B61)

---

## 1-Click Startup

To start the entire stack simultaneously in separate windows:
```powershell
.\start-all.ps1
```
This automatically launches:
1. Blockchain Adapter on `http://localhost:8081`
2. Go Domain Server on `http://localhost:8080`
3. Next.js Web Portal on `http://localhost:3000`

### Ethereum Sepolia
- **Network Name**: Sepolia
- **Chain ID**: `11155111`
- **RPC URL**: `https://rpc.sepolia.org`
- **Native Currency**: `ETH`
- **Required Confirmations**: `12`
