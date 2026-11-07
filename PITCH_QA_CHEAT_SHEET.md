# VESTOR — ETHGlobal Pitch Q&A Cheat Sheet

Prepare for these high-probability questions from hackathon judges during your pitch and live demo. Each question is paired with **why the judge is asking it** and a **winning 30-second answer**.

---

## Category 1: Whitechain & Hackathon Bounty Questions
*(Asked by Whitechain sponsor judges to verify bounty criteria)*

### Q1: "Why does this need to be on Whitechain? Why not just Ethereum mainnet, an L2 like Arbitrum, or a traditional Web2 database?"
* **Why they ask:** They want to ensure you didn't just deploy existing code to Whitechain; they want to see why Whitechain’s technical characteristics are essential for this project.
* **Winning Answer:**
  > *"Traditional supply chain financing suffers from high-frequency micro-transactions. When a borrower sells 20 units of inventory to a distributor, traditional wire rails charge \$15 to \$30 per wire, forcing companies to batch payouts every 90 days. On Whitechain, sub-cent gas fees ($0.0001) allow our `DistributionManager` to stream micro-waterfall payouts in real time as each invoice is signed.*
  > *Furthermore, Whitechain’s ~2-second block finality completely eliminates double-pledging risk: collateral encumbrance in `InventoryRegistry` and USDT debt funding occur atomically within the same block, which traditional banking rails (T+2 to T+3) cannot deliver."*

### Q2: "Did you use the official Whitechain USDT or your own test token?"
* **Why they ask:** Hackathon rules explicitly state: *"Payments in a test token you minted yourself won't count."*
* **Winning Answer:**
  > *"We settle 100% of our primary subscription flows, debt issuance draws, and waterfall dividend claims in the official Whitechain Sepolia USDT contract at `0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`. Our live proof of settlement transaction is confirmed in Block `12401542`, viewable on the Whitechain explorer and linked in our README."*

### Q3: "What challenges or friction points did you experience while building on Whitechain?"
* **Why they ask:** Testing whether you actually built and interacted with the chain, and checking for feedback from `WHITECHAIN_FEEDBACK.md`.
* **Winning Answer:**
  > *"We loved the Cancun EVM compatibility and the instant ~2-second block speeds. The main friction point was the public RPC’s strict 10,000-block ceiling on `eth_getLogs`. Because Whitechain generates blocks every 2 seconds, 10,000 blocks pass in just 5.5 hours. To prevent queries from failing, we engineered a chunked pagination engine in our blockchain adapter with 5,000-block cursors. We documented this and suggested a prominent canonical token registry in our `WHITECHAIN_FEEDBACK.md`."*

---

## Category 2: Real-World Asset (RWA) & Financial Logic Questions
*(Asked by financial / DeFi judges testing whether your mechanics match real finance)*

### Q4: "How do you prevent 'Double Pledging' (a borrower pledging the same physical inventory to multiple platforms)?"
* **Why they ask:** This is the #1 real-world fraud vector in commodity trade finance (e.g., the Qingdao metal warehousing scandal).
* **Winning Answer:**
  > *"Double-pledging is prevented at the protocol registry level. In `InventoryRegistry.sol`, each physical warehouse lot is hashed into a unique 32-byte `inventoryId` derived from the warehouse facility ID, warehouse receipt serial number, and physical lot SKU. Once registered, that `inventoryId` is locked on Whitechain. Any secondary attempt to issue debt or create tokens against an already active `inventoryId` immediately reverts."*

### Q5: "What happens if the borrower defaults or the physical inventory is damaged/spoiled?"
* **Why they ask:** Testing if you understand credit risk and loss waterfalls.
* **Winning Answer:**
  > *"We mitigate this at two levels: First, our Borrowing Base Engine on the Risk Desk applies conservative haircut matrices—for example, a 30% volatility buffer, 10% spoilage reserve, and 15% distress discount—ensuring an overcollateralized maximum LTV (e.g., 60%–70%).*
  > *Second, in the event of default, our 5-tier waterfall protects Senior investors first: all liquidated cash flows route strictly into Tier 1 (Senior Interest) and Tier 2 (Senior Principal) before any mezzanine or equity tranche receives a penny."*

### Q6: "Why did you use ERC-20 debt tokens instead of an NFT for the asset?"
* **Why they ask:** Hackathon rules say: *"Won't place: A token with a mint button and no rules, or ownership NFTs where nothing is enforced onchain."*
* **Winning Answer:**
  > *"In institutional debt financing, capital syndication requires fungible tranche participation. A \$1,000,000 warehouse lot cannot easily be funded by a single retail investor. By issuing ERC-20 debt tranche units bound to the underlying `inventoryId`, multiple institutional investors can subscribe in discrete increments (e.g., $100 per token) while maintaining identical seniority, coupon accrual, and proportional Merkle waterfall claim entitlements."*

---

## Category 3: Smart Contract & Architecture Questions
*(Asked by technical & security judges)*

### Q7: "How does the EIP-712 off-take sales attestation work?"
* **Why they ask:** Testing whether you implemented real cryptographic verification or just a dummy button.
* **Winning Answer:**
  > *"In `SalesSettlement.sol`, we implement standard EIP-712 typed structured data. When a commercial buyer accepts delivery, they cryptographically sign a typed message containing the `inventoryId`, `batchId`, `saleQuantity`, `grossAmount`, and a unique `nonce`. The contract recovers the signer's address using `ecrecover`. If valid, it atomically burns the pledged collateral units, registers the sale, and routes the net proceeds into `DistributionManager`."*

### Q8: "How does the 5-tier waterfall distribution engine prevent high gas fees on distributions?"
* **Why they ask:** Push payments (looping through all token holders) can hit the block gas limit and fail.
* **Winning Answer:**
  > *"We avoid the anti-pattern of push payments. `DistributionManager` uses a pull-based Merkle tree distribution architecture. When sales proceeds arrive, the engine computes a deterministic Merkle root of investor balance snapshots. Investors submit a Merkle proof to claim their entitled USDT dividends at their convenience. This ensures O(1) gas cost for the protocol regardless of whether there are 10 or 10,000 investors."*

### Q9: "Who controls the allowlists and role permissions in your contracts?"
* **Why they ask:** Checking compliance and decentralization controls.
* **Winning Answer:**
  > *"All contracts inherit from `AccessController.sol`, an institutional Role-Based Access Control (RBAC) contract. It defines distinct roles: `ADMIN_ROLE` for governance, `REGISTRAR_ROLE` for audited warehouse operators, `ATTESTOR_ROLE` for certified ERP accounting signers, and `CIRCUIT_BREAKER_ROLE` for emergency pauses. This enforces a separation of duties so no single private key can unilaterally mint debt or divert cash."*

---

## Category 4: Closing / Vision Questions

### Q10: "What is your roadmap to take VESTOR into production?"
* **Why they ask:** Assessing long-term potential and hackathon follow-through.
* **Winning Answer:**
  > *"Three core milestones: First, integrate decentralized oracles (Chainlink/Pyth) for real-time commodity spot pricing rather than static audit appraisals. Second, partner with physical warehouse logistics providers (like SGS or Intertek) to automate IoT warehouse receipt signing. Third, establish liquidity pools on Whitechain DEXs so investors can trade their secondary debt tranche tokens before maturity."*

---

## Quick Pitch Tips:
1. **Be Concise:** Answer the question directly in the first sentence, then give the technical reason in the second sentence.
2. **Refer to the Deployed Contracts:** Point to the Whitechain Explorer or your README tables (`InventoryRegistry`, `SalesSettlement`, `DistributionManager`).
3. **Emphasize USDT:** Remind judges that this isn't a speculative meme token; it's a real yield-bearing stablecoin product built on Whitechain.
