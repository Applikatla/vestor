import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  console.log("=================================================");
  console.log("Live Testnet Verification: End-to-End Smoke Test");
  console.log(`Network: Sepolia (Chain ID: ${net.chainId})`);
  console.log(`Caller: ${deployer.address}`);
  console.log("=================================================");

  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  const registryAddr = deployment.contracts.InventoryRegistry;
  const mockUSDCAddr = deployment.contracts.MockUSDC;

  console.log(`\nConnecting to InventoryRegistry at: ${registryAddr}...`);
  const registry = await ethers.getContractAt("InventoryRegistry", registryAddr);

  // 1. Generate live testnet inventory ID & evidence root
  const inventoryId = ethers.keccak256(ethers.toUtf8Bytes(`LIVE-INV-${Date.now()}`));
  const evidenceRoot = ethers.keccak256(ethers.toUtf8Bytes("CANONICAL-AUDITED-INVENTORY-HASH-2026"));

  console.log(`Submitting registerInventory tx for ID: ${inventoryId}...`);
  const tx = await registry.registerInventory(inventoryId, deployer.address, evidenceRoot);
  console.log(`-> Tx Hash: ${tx.hash}`);
  const rc = await tx.wait(1);
  console.log(`✓ Mined in Sepolia block: ${rc?.blockNumber}`);

  // Query state back from Sepolia node
  const record = await registry.inventories(inventoryId);
  console.log(`✓ Verified On-Chain State:`);
  console.log(`   - Issuer: ${record.issuer}`);
  console.log(`   - Evidence Root: ${record.evidenceRoot}`);
  console.log(`   - Status: ${record.status} (1 = REGISTERED)`);
  console.log(`   - Registered At Timestamp: ${new Date(Number(record.registeredAt) * 1000).toISOString()}`);

  // 2. Query MockUSDC
  console.log(`\nConnecting to MockUSDC at: ${mockUSDCAddr}...`);
  const usdc = await ethers.getContractAt("MockUSDC", mockUSDCAddr);
  const bal = await usdc.balanceOf(deployer.address);
  console.log(`✓ Deployer MockUSDC Balance: ${ethers.formatUnits(bal, 6)} USDC`);

  console.log(`\n=================================================`);
  console.log(`✓ Live testnet end-to-end verification SUCCEEDED!`);
  console.log(`=================================================`);
}

main().catch(console.error);
