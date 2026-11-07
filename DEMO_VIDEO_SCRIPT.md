# VESTOR — ETHGlobal Whitechain Demo Video Script (3 Minutes)

> **Bounty Target:** Tokenize · Real World Finance on Whitechain ($4,000) & Operate · Stablecoin Payments ($5,000)  
> **Total Target Duration:** ~3 Minutes 15 Seconds  
> **Target Speaking Pace:** Steady, professional, institutional tone (~130 words per minute)

---

## Pre-Recording Checklist

Before starting your screen recorder (Loom / OBS / Screen Studio):
1. **Local Servers Active:** Ensure `http://localhost:3000` is open and responsive.
2. **MetaMask Connected:** Switch MetaMask to **Whitechain Sepolia** (Chain ID: `1874`, RPC: `https://rpc.testnet.whitechain.io`).
3. **Browser Tabs Prepared:**
   - Tab 1: `http://localhost:3000` (Home page)
   - Tab 2: `https://explorer.testnet.whitechain.io/tx/0x08f6577375cf08a294856282925ac56a71227fbf32aa307ecfecb39424ab40a9` (Proof of USDT settlement)

---

## Video Script

### Scene 1: Introduction & Institutional Architecture (0:00 – 0:30)

| Timestamp | Visual Action (What you show on screen) | Voiceover / Spoken Script (What you say) |
| :--- | :--- | :--- |
| **0:00 – 0:15** | Start on the homepage at `http://localhost:3000`.<br><br>Hover over the top environment bar showing `Whitechain Sepolia (1874)` and `2.1s Finality`.<br><br>Scroll slowly across the 5 high-density metric cards. | *"Hello everyone! Welcome to VESTOR — an institutional-grade Real World Asset tokenization and continuous settlement platform built on Whitechain Sepolia."* |
| **0:15 – 0:30** | Scroll down to the **Settlement Accounting Invariants** and **Whitechain Sepolia Node Contracts** table.<br><br>Highlight the contracts: `InventoryRegistry`, `TokenFactory`, `SalesSettlement`, and `Official Tether USD (USDT)`. | *"Traditional commodity financing suffers from multi-day settlement delays, double-pledging risk, and opaque off-chain invoicing. VESTOR solves this by executing the entire credit lifecycle on Whitechain — with physical collateral commitments, EIP-712 sales attestations, and 100% of settlements in official USDT."* |

---

### Scene 2: Borrower Collateral Ingestion & Token Launchpad (0:30 – 1:15)

| Timestamp | Visual Action (What you show on screen) | Voiceover / Spoken Script (What you say) |
| :--- | :--- | :--- |
| **0:30 – 0:50** | Click **Originate Facility** (or go to `/company`).<br><br>Point to the connected Issuer wallet and entity name: `Apex Commodity Trading Ltd`.<br><br>Show **Tab 1: Asset Ingestion & Evidence**.<br><br>Click **Commit Inventory Manifest to Registry**. | *"Let's begin from the Borrower's perspective. Here at the Borrower Console, Apex Commodity Trading is onboarding 5,000 bags of specialty Arabica coffee stored at Geneva Freeport. We attach certified physical inspection documents, generate a SHA-256 evidence root, and commit it immutably to Whitechain's InventoryRegistry."* |
| **0:50 – 1:15** | Click **Tab 2: Token Launchpad**.<br><br>Show the Token parameters: Symbol `COF-882`, Target `$35,000 USDT`, Price `$100.00 / Token`.<br><br>Click **Deploy Token to Whitechain Sepolia**.<br><br>Show the green confirmation toast with transaction hash. | *"With our collateral committed, we move to the Token Launchpad. The borrower securitizes this physical lot into a compliant ERC-20 debt tranche contract deployed via our TokenFactory, cryptographically linked to the warehouse evidence root with transfer restrictions and compliance allowlists enforced on-chain."* |

---

### Scene 3: Risk Calibration & Borrowing Base Engine (1:15 – 1:45)

| Timestamp | Visual Action (What you show on screen) | Voiceover / Spoken Script (What you say) |
| :--- | :--- | :--- |
| **1:15 – 1:35** | Navigate to `/admin` (**Credit Risk & Waterfall Workstation**).<br><br>Adjust the **Commodity Volatility Haircut** slider and the **Distress Liquidation Discount** slider.<br><br>Show the real-time calculation of **Eligible Borrowing Base Limit**. | *"Now we switch to the Institutional Risk Underwriter's desk. Instead of uncollateralized lending, VESTOR enforces strict mathematical risk invariants. Our haircut engine calibrates volatility, obsolescence, and liquidation buffers to compute the maximum eligible borrowing limit before any credit can be drawn."* |
| **1:35 – 1:45** | Click **Commit Certified Valuation to Whitechain Registry**.<br><br>Point to the green badge: `Double-Entry Invariants Enforced`. | *"Once verified by an audit partner, the certified valuation commitment is written to Whitechain, freezing borrowing limits deterministically."* |

---

### Scene 4: Investor Orderbook & Official USDT Subscription (1:45 – 2:30)

| Timestamp | Visual Action (What you show on screen) | Voiceover / Spoken Script (What you say) |
| :--- | :--- | :--- |
| **1:45 – 2:05** | Navigate to `/investor` (**Institutional Fixed-Income Orderbook**).<br><br>Show the Treasury Strip cards with USDT balance.<br><br>Point out the official Whitechain USDT contract pill: `0xcedfB...55a7`. | *"Next is the Investor Allocation Desk. Institutional investors can browse active warehouse debt facilities. Every tranche displays the underlying commodity, audited storage hub, tenor, and target yield. Notice that all subscriptions and payouts settle exclusively in official Whitechain USDT."* |
| **2:05 – 2:30** | Click **Subscribe** on `COF-882` (Senior Secured 11.2% APY).<br><br>In the modal, enter `$2,500` or click the `$2,500` button.<br><br>Click **Confirm Subscription & Authorize USDT**.<br><br>Show the toast confirmation. | *"The investor commits $2,500 USDT into the Senior Secured tranche. Thanks to Whitechain's sub-second block times and sub-cent fees, capital deployment executes instantly without banking delays or multi-day escrow holdbacks."* |

---

### Scene 5: Commercial Off-Take Sale & EIP-712 Attestation (2:30 – 3:05)

| Timestamp | Visual Action (What you show on screen) | Voiceover / Spoken Script (What you say) |
| :--- | :--- | :--- |
| **2:30 – 2:50** | Switch back to `/company` and click **Tab 4: Sales Off-Take Attestation**.<br><br>Show the fields: Target SKU, Quantity Sold (1,200 units), Gross Sale Price ($8.50/unit), and Buyer ID.<br><br>Point to the net proceeds: `$9,690.00 USDT routed to waterfall`. | *"Now, how does debt get paid back? In real-world finance, loans are retired when collateral is commercially sold. Under Tab 4, the borrower records an ERP warehouse off-take sale to a wholesale buyer."* |
| **2:50 – 3:05** | Click **Sign & Record EIP-712 Sales Attestation**.<br><br>Show the MetaMask EIP-712 structured data signing prompt and click **Sign**.<br><br>Show the confirmed signature proof and block confirmation toast. | *"Crucially, this is not just an off-chain invoice. It generates a cryptographic EIP-712 typed signature. The SalesSettlement contract verifies the signature on-chain, automatically retires the pledged inventory, and streams the net USDT directly into the repayment waterfall."* |

---

### Scene 6: 5-Tier Waterfall Settlement & Whitechain Explorer (3:05 – 3:30)

| Timestamp | Visual Action (What you show on screen) | Voiceover / Spoken Script (What you say) |
| :--- | :--- | :--- |
| **3:05 – 3:20** | Navigate back to `/investor` and scroll to the bottom **Distribution Claims Desk**.<br><br>Show `DIST-2026-001` with status `Ready to Claim` (125.50 USDC/USDT).<br><br>Click **Claim Payout**.<br><br>Show toast: `Dividend Claimed — Transferred to your treasury wallet`. | *"Finally, our DistributionManager contract distributes collected proceeds through a deterministic 5-tier waterfall: paying Senior interest first, then amortizing principal, funding reserves, paying mezzanine yield, and releasing residual equity to the borrower. Investors pull their entitled dividends directly in USDT."* |
| **3:20 – 3:30** | Switch browser tab to the **Whitechain Explorer**.<br><br>Show transaction `0x08f65773...` in Block `12401542` and the verified smart contracts. | *"All contracts are live on Whitechain Sepolia, with settled USDT transactions and complete documentation in our repository. Thank you for watching, and see you on Whitechain!"* |

---

## Tips for Recording

1. **Resolution:** Record at 1080p (1920x1080) at 60fps for clear readability of font-mono numbers and contract addresses.
2. **Audio:** Use a clean microphone or headset; avoid background noise.
3. **Pacing:** Let each toast notification stay on screen for 1–2 seconds before moving your mouse to the next action.
4. **Explorer Tab:** Keep the Whitechain Explorer tab pre-loaded so you don't have to wait for the page to load at the end.
