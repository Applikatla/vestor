import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers } from "hardhat";
import {
  AccessController,
  InventoryRegistry,
  InventoryToken,
  InventoryTokenFactory,
  FinancingVault,
  SalesSettlement,
  DistributionManager,
  RedemptionManager,
  MockUSDC,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Inventory Financing & Tokenization Platform - Full Lifecycle", function () {
  let admin: SignerWithAddress;
  let issuer: SignerWithAddress;
  let verifier: SignerWithAddress;
  let attestor: SignerWithAddress;
  let treasury: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;

  let accessController: AccessController;
  let registry: InventoryRegistry;
  let factory: InventoryTokenFactory;
  let mockUSDC: MockUSDC;
  let salesSettlement: SalesSettlement;
  let distributionManager: DistributionManager;
  let token: InventoryToken;
  let vault: FinancingVault;
  let redemptionManager: RedemptionManager;

  const inventoryId = ethers.keccak256(ethers.toUtf8Bytes("INV-BATCH-2026-001"));
  const issuanceId = ethers.keccak256(ethers.toUtf8Bytes("OFFER-2026-001"));
  const termsHash = ethers.keccak256(ethers.toUtf8Bytes("TERMS-V1.0-ADVANCE-70-WATERFALL"));
  const evidenceRoot = ethers.keccak256(ethers.toUtf8Bytes("DOCUMENTS-SHA256-ROOT-HASH"));

  // 3,500 tokens max supply with 18 decimals
  const maxSupply = ethers.parseEther("3500");
  // $100 USDC per token (USDC has 6 decimals: 100 * 10^6 = 100_000_000)
  const pricePerToken = 100_000_000n; // 100 USDC in 6 decimal units
  // Capital target: $350,000 (350,000 * 10^6)
  const targetCapital = 350_000_000_000n;
  const minCapital = 100_000_000_000n;

  before(async function () {
    [admin, issuer, verifier, attestor, treasury, investor1, investor2] = await ethers.getSigners();

    // 1. Deploy AccessController
    const AccessControllerFactory = await ethers.getContractFactory("AccessController");
    accessController = await AccessControllerFactory.deploy(admin.address);
    await accessController.waitForDeployment();

    // Grant Roles
    await accessController.grantRole(await accessController.REGISTRAR_ROLE(), admin.address);
    await accessController.grantRole(await accessController.ISSUER_ROLE(), issuer.address);
    await accessController.grantRole(await accessController.VERIFIER_ROLE(), verifier.address);
    await accessController.grantRole(await accessController.ATTESTOR_ROLE(), attestor.address);
    await accessController.grantRole(await accessController.TREASURY_ROLE(), treasury.address);

    // 2. Deploy Mock USDC (6 decimals)
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Fund investors with 50,000 USDC each
    await mockUSDC.mint(investor1.address, 50_000_000_000n);
    await mockUSDC.mint(investor2.address, 50_000_000_000n);

    // 3. Deploy InventoryRegistry
    const InventoryRegistryFactory = await ethers.getContractFactory("InventoryRegistry");
    registry = await InventoryRegistryFactory.deploy(await accessController.getAddress());
    await registry.waitForDeployment();

    // 4. Deploy InventoryTokenFactory
    const TokenFactoryClass = await ethers.getContractFactory("InventoryTokenFactory");
    factory = await TokenFactoryClass.deploy(await accessController.getAddress());
    await factory.waitForDeployment();

    // 5. Deploy SalesSettlement
    const SalesSettlementFactory = await ethers.getContractFactory("SalesSettlement");
    salesSettlement = await SalesSettlementFactory.deploy(await accessController.getAddress());
    await salesSettlement.waitForDeployment();

    // 6. Deploy DistributionManager
    const DistributionManagerFactory = await ethers.getContractFactory("DistributionManager");
    distributionManager = await DistributionManagerFactory.deploy(await accessController.getAddress());
    await distributionManager.waitForDeployment();
  });

  it("Phase A: Should register inventory on-chain and prevent duplicate IDs", async function () {
    const tx = await registry.connect(admin).registerInventory(inventoryId, issuer.address, evidenceRoot);
    await tx.wait();

    const record = await registry.inventories(inventoryId);
    expect(record.issuer).to.equal(issuer.address);
    expect(record.evidenceRoot).to.equal(evidenceRoot);
    expect(record.status).to.equal(1n); // REGISTERED

    // Duplicate registration must revert
    await expect(
      registry.connect(admin).registerInventory(inventoryId, issuer.address, evidenceRoot)
    ).to.be.revertedWith("Inventory already registered");
  });

  it("Phase B: Verifier should append updated evidence commitment", async function () {
    const updatedRoot = ethers.keccak256(ethers.toUtf8Bytes("AUDIT-AND-LIEN-CLEARED"));
    await registry.connect(verifier).addEvidenceCommitment(inventoryId, updatedRoot);

    const record = await registry.inventories(inventoryId);
    expect(record.evidenceRoot).to.equal(updatedRoot);

    const history = await registry.getEvidenceHistory(inventoryId);
    expect(history.length).to.equal(2);
    expect(history[1]).to.equal(updatedRoot);
  });

  it("Phase C: Should deploy InventoryToken via factory with transfer restrictions", async function () {
    const tx = await factory.connect(admin).createToken(
      "Inventory 2026 Batch Token",
      "INV-001",
      inventoryId,
      issuanceId,
      termsHash,
      maxSupply
    );
    const receipt = await tx.wait();

    const tokenAddress = await factory.tokens(issuanceId);
    expect(tokenAddress).to.not.equal(ethers.ZeroAddress);

    token = await ethers.getContractAt("InventoryToken", tokenAddress);
    expect(await token.name()).to.equal("Inventory 2026 Batch Token");
    expect(await token.maxSupply()).to.equal(maxSupply);
    expect(await token.termsHash()).to.equal(termsHash);
  });

  it("Phase D: Should setup FinancingVault and execute atomic investor subscriptions", async function () {
    const FinancingVaultFactory = await ethers.getContractFactory("FinancingVault");
    vault = await FinancingVaultFactory.deploy(
      await accessController.getAddress(),
      await mockUSDC.getAddress(),
      await token.getAddress(),
      issuer.address,
      targetCapital,
      minCapital,
      pricePerToken,
      86400 * 7 // 7 days window
    );
    await vault.waitForDeployment();

    // Grant MINTER_ROLE and BURNER_ROLE on token to vault
    await token.connect(admin).grantRole(await token.MINTER_ROLE(), await vault.getAddress());
    await token.connect(admin).grantRole(await token.BURNER_ROLE(), await vault.getAddress());

    // Allowlist investors and vault for transfers
    await token.connect(admin).setAllowlist(investor1.address, true);
    await token.connect(admin).setAllowlist(investor2.address, true);
    await token.connect(admin).setAllowlist(await vault.getAddress(), true);

    // Investor 1 subscribes 10,000 USDC ($10,000 / $100 = 100 tokens)
    const subAmount = 10_000_000_000n; // 10,000 USDC (6 decimals)
    await mockUSDC.connect(investor1).approve(await vault.getAddress(), subAmount);

    const subTx = await vault.connect(investor1).subscribe(subAmount);
    await subTx.wait();

    expect(await vault.deposits(investor1.address)).to.equal(subAmount);
    const expectedTokens = ethers.parseEther("100");
    expect(await token.balanceOf(investor1.address)).to.equal(expectedTokens);
    expect(await mockUSDC.balanceOf(await vault.getAddress())).to.equal(subAmount);
  });

  it("Phase D (cont): Treasury should release raised funds to issuer", async function () {
    // Fast-forward to reach min capital or fund full target
    // Subscribe remaining to hit target
    const remainingToFund = targetCapital - 10_000_000_000n;
    await mockUSDC.mint(investor2.address, remainingToFund);
    await mockUSDC.connect(investor2).approve(await vault.getAddress(), remainingToFund);
    await vault.connect(investor2).subscribe(remainingToFund);

    expect(await vault.state()).to.equal(1n); // FUNDED

    const issuerBalBefore = await mockUSDC.balanceOf(issuer.address);
    // Release $200,000 to issuer
    const releaseAmount = 200_000_000_000n;
    await vault.connect(treasury).releaseToIssuer(releaseAmount);

    const issuerBalAfter = await mockUSDC.balanceOf(issuer.address);
    expect(issuerBalAfter - issuerBalBefore).to.equal(releaseAmount);
  });

  it("Phase E: Attestor should record EIP-712 signed sales and prevent double-attestation", async function () {
    const saleId = ethers.keccak256(ethers.toUtf8Bytes("SALE-ORD-98741"));
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH-01"));
    const buyerRefHash = ethers.keccak256(ethers.toUtf8Bytes("BUYER-RETAILER-X"));
    const quantity = 50n;
    const grossAmount = 5_000_000_000n; // $5,000
    const netAmount = 4_800_000_000n; // $4,800
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = 1n;

    // Build EIP-712 signature from authorized attestor
    const domain = {
      name: "InventorySalesSettlement",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await salesSettlement.getAddress(),
    };

    const types = {
      SaleAttestation: [
        { name: "inventoryId", type: "bytes32" },
        { name: "batchId", type: "bytes32" },
        { name: "saleId", type: "bytes32" },
        { name: "quantity", type: "uint256" },
        { name: "grossAmount", type: "uint256" },
        { name: "netAmount", type: "uint256" },
        { name: "buyerRefHash", type: "bytes32" },
        { name: "timestamp", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };

    const value = {
      inventoryId,
      batchId,
      saleId,
      quantity,
      grossAmount,
      netAmount,
      buyerRefHash,
      timestamp,
      nonce,
    };

    const signature = await attestor.signTypedData(domain, types, value);

    // Record sale
    await salesSettlement.recordSaleAttestation(
      inventoryId,
      batchId,
      saleId,
      quantity,
      grossAmount,
      netAmount,
      buyerRefHash,
      timestamp,
      nonce,
      signature
    );

    expect(await salesSettlement.settledSales(saleId)).to.equal(true);

    // Replay attempt must revert
    await expect(
      salesSettlement.recordSaleAttestation(
        inventoryId,
        batchId,
        saleId,
        quantity,
        grossAmount,
        netAmount,
        buyerRefHash,
        timestamp,
        nonce,
        signature
      )
    ).to.be.revertedWith("Sale already settled");
  });

  it("Phase G: DistributionManager should create pool and allow pull claims", async function () {
    // Treasury creates distribution of 15,000 USDC ($15,000)
    const distAmount = 15_000_000_000n;
    await mockUSDC.mint(treasury.address, distAmount);
    await mockUSDC.connect(treasury).approve(await distributionManager.getAddress(), distAmount);

    // Let's create a single-leaf Merkle root for Investor 1's entitlement ($1,500 = 1,500_000_000)
    const entitlement = 1_500_000_000n;
    const leaf = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32"],
        [ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [investor1.address, entitlement]))]
      )
    );
    const merkleRoot = leaf; // 1-element tree root is the leaf itself

    const createTx = await distributionManager.connect(treasury).createDistribution(
      await mockUSDC.getAddress(),
      distAmount,
      merkleRoot,
      await ethers.provider.getBlockNumber(),
      termsHash
    );
    await createTx.wait();

    // Investor 1 claims
    const balBefore = await mockUSDC.balanceOf(investor1.address);
    await distributionManager.connect(investor1).claim(1, entitlement, []);
    const balAfter = await mockUSDC.balanceOf(investor1.address);

    expect(balAfter - balBefore).to.equal(entitlement);
    expect(await distributionManager.hasClaimed(1, investor1.address)).to.equal(true);

    // Double claim must revert
    await expect(
      distributionManager.connect(investor1).claim(1, entitlement, [])
    ).to.be.revertedWith("Distribution already claimed");
  });

  it("Phase G (cont): RedemptionManager should execute atomic burn-and-pay when liquid", async function () {
    const RedemptionManagerFactory = await ethers.getContractFactory("RedemptionManager");
    redemptionManager = await RedemptionManagerFactory.deploy(
      await accessController.getAddress(),
      await token.getAddress(),
      await mockUSDC.getAddress(),
      100_000_000n // $100 redemption price
    );
    await redemptionManager.waitForDeployment();

    // Grant BURNER_ROLE on token to redemption manager
    await token.connect(admin).grantRole(await token.BURNER_ROLE(), await redemptionManager.getAddress());

    // Fund redemption manager with 20,000 USDC for liquidity
    await mockUSDC.mint(await redemptionManager.getAddress(), 20_000_000_000n);

    // Investor 1 redeems 50 tokens ($5,000 USDC payout)
    const tokenBurnAmount = ethers.parseEther("50");
    const balBefore = await mockUSDC.balanceOf(investor1.address);
    const tokenBalBefore = await token.balanceOf(investor1.address);

    await redemptionManager.connect(investor1).requestRedemption(tokenBurnAmount);

    const balAfter = await mockUSDC.balanceOf(investor1.address);
    const tokenBalAfter = await token.balanceOf(investor1.address);

    expect(balAfter - balBefore).to.equal(5_000_000_000n);
    expect(tokenBalBefore - tokenBalAfter).to.equal(tokenBurnAmount);
  });
});
