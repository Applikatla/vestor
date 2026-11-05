# Vestor — Real-World Asset (RWA) Inventory Tokenization & Financing Platform

Vestor bridges physical supply-chain logistics and decentralized finance by tokenizing physical warehouse inventory into fractional ERC-20 debt and revenue-sharing tranches on **Whitechain Testnet (Chain ID: 1874)**.

---

## 🏛️ System Architecture

```
Physical Warehouse / ERP
       │ (SKUs, Batches, Receipts)
       ▼
Go Backend Service ──► Deterministic Canonical Hash (Keccak256) + PostgreSQL / SQLite
       │
       ▼
InventoryRegistry.sol (On-Chain Proof & Lifecycle Gate)
       │ (Inspection & Appraisal Approved)
       ▼
Dynamic InventoryERC20 Deployment (ContractFactory)
       │ (Minting Authority Delegated to Vault)
       ▼
FinancingVault.sol (Global Master Escrow)
       ├── KYC / KYB Allowlist Check
       ├── Investor MockUSDC Deposits & Fractional Token Minting
       ├── Disbursal of Advance Capital to Warehouse Issuer
       ├── ERP Sales Telemetry Ingestion
       └── Settlement Repayment & Token Burning / Redemption
```

---

## 📦 Smart Contracts

* **`InventoryRegistry.sol`**:
  Stores canonical inventory records with cryptographic hashes of warehouse receipts, valuation appraisal checkpoints, and lifecycle state flags (`REGISTERED`, `APPROVED`, `FINANCED`, `SETTLED`).
* **`FinancingVault.sol`**:
  The global master vault coordinating multi-tranche investment escrow, stablecoin custody, advance drawdowns, repayments, and investor token redemptions.
* **`InventoryERC20.sol`**:
  Standard OpenZeppelin ERC-20 token representing fractional ownership/financing of a verified inventory batch. Mint and burn rights are strictly bounded to the `FinancingVault`.
* **`MockUSDC.sol`**:
  6-decimal testnet stablecoin with a built-in public faucet function for seamless testing.

### Whitechain Testnet Deployments (Chain ID: `1874`)
- **InventoryRegistry**: [`0x455664702375c9EfDE6B8C0eEC1131C0Ff076Ab1`](https://explorer.testnet.whitechain.io/address/0x455664702375c9EfDE6B8C0eEC1131C0Ff076Ab1)
- **FinancingVault**: [`0xd0E9BeDCe54Ab0Dde3893f9911B790Eec26D52dD`](https://explorer.testnet.whitechain.io/address/0xd0E9BeDCe54Ab0Dde3893f9911B790Eec26D52dD)
- **MockUSDC**: [`0xD2438B3A2DA2DAF0BE024726120BE240Fe4e49f5`](https://explorer.testnet.whitechain.io/address/0xD2438B3A2DA2DAF0BE024726120BE240Fe4e49f5)

---

## 🛠️ Tech Stack

- **Smart Contracts**: Solidity 0.8.28, Hardhat, OpenZeppelin v5.
- **Backend**: Go 1.23, Gin Web Framework, GORM (PostgreSQL/SQLite), `go-ethereum` (geth).
- **Frontend**: React 18, Vite, Tailwind CSS, Ethers.js v6, Lucide Icons, EIP-6963 Multi-Wallet Discovery.
- **Blockchain**: Whitechain Testnet.

---

## 🚀 Getting Started

### 1. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in your Whitechain testnet private key.

### 2. Smart Contracts
Compile contracts and run deployment:
```bash
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network whitechain_testnet
```

### 3. Go Backend Server
```bash
cd backend
go run cmd/server/main.go
```
The server will start on `http://localhost:8080`.

### 4. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 End-to-End Workflow

1. **Submit Inventory**: Enter warehouse metadata, SKU quantities, and document IPFS hash. The Go backend calculates the canonical Keccak256 record hash and stores it in the database.
2. **On-Chain Registration**: Click **"Sign & Register On-Chain"** to call `InventoryRegistry.registerInventory`.
3. **Inspection & Appraisal**: Third-party auditor inspects the physical stock and marks the inventory `APPROVED`.
4. **Deploy ERC20 Token**: Deploy a dedicated fractional token via `ContractFactory` and register the tranche in `FinancingVault`.
5. **Faucet & Invest**: Claim testnet USDC via the built-in faucet, approve allowance, and deposit funds to receive minted `InventoryERC20` tokens.
6. **Telemetry & Settlement**: Simulate off-chain warehouse dispatches and settle repayments.

