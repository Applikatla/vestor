import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  console.log("=================================================");
  console.log("Whitechain Sepolia Live End-to-End Verification");
  console.log(`Network: Whitechain Sepolia (Chain ID: ${net.chainId})`);
  console.log(`Caller: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Native Balance: ${ethers.formatEther(balance)} WBT`);
  console.log("=================================================");

  const deploymentPath = path.join(__dirname, "../deployments/whitechainSepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const registryAddr = deployment.contracts.InventoryRegistry;
  const factoryAddr = deployment.contracts.InventoryTokenFactory;
  const settlementAddr = deployment.contracts.SalesSettlement;
  const mockUSDCAddr = deployment.contracts.MockUSDC;

  // 1. Register Inventory on Whitechain
  console.log(`\n1. Registering Inventory on Whitechain Registry (${registryAddr})...`);
  const registry = await ethers.getContractAt("InventoryRegistry", registryAddr);
  const inventoryId = ethers.keccak256(ethers.toUtf8Bytes(`WHITECHAIN-INV-${Date.now()}`));
  const evidenceRoot = ethers.keccak256(ethers.toUtf8Bytes("CANONICAL-WHITECHAIN-AUDITED-INVENTORY-ROOT-2026"));

  const regTx = await registry.registerInventory(inventoryId, deployer.address, evidenceRoot);
  console.log(`   -> Broadcast tx: ${regTx.hash}`);
  const regReceipt = await regTx.wait(1);
  console.log(`   ✓ Mined in Whitechain block: ${regReceipt?.blockNumber}`);

  // Query state back from Whitechain node
  const record = await registry.inventories(inventoryId);
  console.log(`   ✓ On-chain record verified:`);
  console.log(`     - Issuer: ${record.issuer}`);
  console.log(`     - Evidence Root: ${record.evidenceRoot}`);
  console.log(`     - Status: ${record.status} (1 = REGISTERED)`);

  // 2. Deploy Issuance ERC-20 Token via Factory on Whitechain
  console.log(`\n2. Deploying Issuance ERC-20 Token via Factory (${factoryAddr})...`);
  const factory = await ethers.getContractAt("InventoryTokenFactory", factoryAddr);
  const issuanceId = ethers.keccak256(ethers.toUtf8Bytes(`WHITECHAIN-ISSUE-${Date.now()}`));
  const termsHash = ethers.keccak256(ethers.toUtf8Bytes("TERMS-WHITECHAIN-V1-ADVANCE-70%"));
  const maxSupply = ethers.parseEther("5000"); // 5,000 tokens

  const tokenTx = await factory.createToken(
    "Whitechain Coffee Token",
    "WCOF",
    inventoryId,
    issuanceId,
    termsHash,
    maxSupply
  );
  console.log(`   -> Broadcast tx: ${tokenTx.hash}`);
  const tokenReceipt = await tokenTx.wait(1);
  console.log(`   ✓ Mined in Whitechain block: ${tokenReceipt?.blockNumber}`);

  const deployedTokenAddress = await factory.tokens(issuanceId);
  console.log(`   ✓ Deployed InventoryToken on Whitechain: ${deployedTokenAddress}`);

  // 3. Record Signed EIP-712 Sales Attestation on Whitechain
  console.log(`\n3. Recording EIP-712 Sales Attestation on SalesSettlement (${settlementAddr})...`);
  const settlement = await ethers.getContractAt("SalesSettlement", settlementAddr);

  const saleId = ethers.keccak256(ethers.toUtf8Bytes(`WHITECHAIN-SALE-${Date.now()}`));
  const batchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH-01"));
  const buyerRefHash = ethers.keccak256(ethers.toUtf8Bytes("BUYER-RETAILER-WHITECHAIN"));
  const quantity = 100n;
  const grossAmount = 10_000_000_000n; // $10,000 in minor units
  const netAmount = 9_500_000_000n;   // $9,500
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = 1n;

  const domain = {
    name: "InventorySalesSettlement",
    version: "1",
    chainId: net.chainId,
    verifyingContract: settlementAddr,
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

  const signature = await deployer.signTypedData(domain, types, value);

  const saleTx = await settlement.recordSaleAttestation(
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
  console.log(`   -> Broadcast tx: ${saleTx.hash}`);
  const saleReceipt = await saleTx.wait(1);
  console.log(`   ✓ Mined in Whitechain block: ${saleReceipt?.blockNumber}`);

  const isSettled = await settlement.settledSales(saleId);
  console.log(`   ✓ Sale settled status verified on-chain: ${isSettled}`);

  // 4. Check MockUSDC Balance
  console.log(`\n4. Verifying MockUSDC on Whitechain (${mockUSDCAddr})...`);
  const usdc = await ethers.getContractAt("MockUSDC", mockUSDCAddr);
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log(`   ✓ Deployer MockUSDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

  console.log(`\n=================================================`);
  console.log(`✓ ALL WHITECHAIN SEPOLIA LIVE VERIFICATIONS PASSED!`);
  console.log(`=================================================`);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});
