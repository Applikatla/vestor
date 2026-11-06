import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function waitForReceipt(provider: any, hash: string) {
  console.log(`   -> Polling receipt for ${hash}...`);
  while (true) {
    const rc = await provider.getTransactionReceipt(hash);
    if (rc && rc.blockNumber) {
      if (rc.status === 0) {
        throw new Error(`Transaction ${hash} reverted!`);
      }
      return rc;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  console.log("=================================================");
  console.log("Deploying Inventory Financing & Tokenization Suite");
  console.log(`Network: ${network.name} (Chain ID: ${net.chainId})`);
  console.log(`Deployer address: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} Native`);
  console.log("=================================================");

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const filePath = path.join(deploymentsDir, `${network.name}.json`);

  let deploymentData: any = {
    network: network.name,
    chainId: Number(net.chainId),
    deployedAt: new Date().toISOString(),
    contracts: {},
  };

  if (fs.existsSync(filePath)) {
    try {
      deploymentData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {}
  }

  const saveProgress = () => {
    fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
  };

  // 1. AccessController
  let accessControllerAddr = deploymentData.contracts.AccessController;
  let accessController: any;
  if (accessControllerAddr && (await ethers.provider.getCode(accessControllerAddr)).length > 2) {
    console.log(`\n1. Reusing deployed AccessController at: ${accessControllerAddr}`);
    accessController = await ethers.getContractAt("AccessController", accessControllerAddr);
  } else {
    console.log("\n1. Deploying AccessController...");
    const AccessControllerFactory = await ethers.getContractFactory("AccessController");
    const tx = await AccessControllerFactory.deploy(deployer.address);
    const hash = tx.deploymentTransaction()?.hash!;
    const rc = await waitForReceipt(ethers.provider, hash);
    accessControllerAddr = rc.contractAddress;
    accessController = await ethers.getContractAt("AccessController", accessControllerAddr);
    deploymentData.contracts.AccessController = accessControllerAddr;
    saveProgress();
    console.log(`✓ AccessController deployed to: ${accessControllerAddr}`);
  }

  // 2. InventoryRegistry
  let registryAddr = deploymentData.contracts.InventoryRegistry;
  if (registryAddr && (await ethers.provider.getCode(registryAddr)).length > 2) {
    console.log(`\n2. Reusing deployed InventoryRegistry at: ${registryAddr}`);
  } else {
    console.log("\n2. Deploying InventoryRegistry...");
    const InventoryRegistryFactory = await ethers.getContractFactory("InventoryRegistry");
    const tx = await InventoryRegistryFactory.deploy(accessControllerAddr);
    const hash = tx.deploymentTransaction()?.hash!;
    const rc = await waitForReceipt(ethers.provider, hash);
    registryAddr = rc.contractAddress;
    deploymentData.contracts.InventoryRegistry = registryAddr;
    saveProgress();
    console.log(`✓ InventoryRegistry deployed to: ${registryAddr}`);
  }

  // Grant REGISTRAR_ROLE
  const REGISTRAR_ROLE = await accessController.REGISTRAR_ROLE();
  const hasRegRole = await accessController.hasRole(REGISTRAR_ROLE, deployer.address);
  if (!hasRegRole) {
    console.log("   -> Granting REGISTRAR_ROLE to deployer...");
    const tx = await accessController.grantRole(REGISTRAR_ROLE, deployer.address);
    await waitForReceipt(ethers.provider, tx.hash);
    console.log(`✓ Granted REGISTRAR_ROLE`);
  }

  // 3. InventoryTokenFactory
  let factoryAddr = deploymentData.contracts.InventoryTokenFactory;
  if (factoryAddr && (await ethers.provider.getCode(factoryAddr)).length > 2) {
    console.log(`\n3. Reusing deployed InventoryTokenFactory at: ${factoryAddr}`);
  } else {
    console.log("\n3. Deploying InventoryTokenFactory...");
    const TokenFactory = await ethers.getContractFactory("InventoryTokenFactory");
    const tx = await TokenFactory.deploy(accessControllerAddr);
    const hash = tx.deploymentTransaction()?.hash!;
    const rc = await waitForReceipt(ethers.provider, hash);
    factoryAddr = rc.contractAddress;
    deploymentData.contracts.InventoryTokenFactory = factoryAddr;
    saveProgress();
    console.log(`✓ InventoryTokenFactory deployed to: ${factoryAddr}`);
  }

  // 4. SalesSettlement
  let salesSettlementAddr = deploymentData.contracts.SalesSettlement;
  if (salesSettlementAddr && (await ethers.provider.getCode(salesSettlementAddr)).length > 2) {
    console.log(`\n4. Reusing deployed SalesSettlement at: ${salesSettlementAddr}`);
  } else {
    console.log("\n4. Deploying SalesSettlement...");
    const SalesSettlementFactory = await ethers.getContractFactory("SalesSettlement");
    const tx = await SalesSettlementFactory.deploy(accessControllerAddr);
    const hash = tx.deploymentTransaction()?.hash!;
    const rc = await waitForReceipt(ethers.provider, hash);
    salesSettlementAddr = rc.contractAddress;
    deploymentData.contracts.SalesSettlement = salesSettlementAddr;
    saveProgress();
    console.log(`✓ SalesSettlement deployed to: ${salesSettlementAddr}`);
  }

  // Grant ATTESTOR_ROLE
  const ATTESTOR_ROLE = await accessController.ATTESTOR_ROLE();
  const hasAttRole = await accessController.hasRole(ATTESTOR_ROLE, deployer.address);
  if (!hasAttRole) {
    console.log("   -> Granting ATTESTOR_ROLE to deployer...");
    const tx = await accessController.grantRole(ATTESTOR_ROLE, deployer.address);
    await waitForReceipt(ethers.provider, tx.hash);
    console.log(`✓ Granted ATTESTOR_ROLE`);
  }

  // 5. DistributionManager
  let distributionManagerAddr = deploymentData.contracts.DistributionManager;
  if (distributionManagerAddr && (await ethers.provider.getCode(distributionManagerAddr)).length > 2) {
    console.log(`\n5. Reusing deployed DistributionManager at: ${distributionManagerAddr}`);
  } else {
    console.log("\n5. Deploying DistributionManager...");
    const DistributionManagerFactory = await ethers.getContractFactory("DistributionManager");
    const tx = await DistributionManagerFactory.deploy(accessControllerAddr);
    const hash = tx.deploymentTransaction()?.hash!;
    const rc = await waitForReceipt(ethers.provider, hash);
    distributionManagerAddr = rc.contractAddress;
    deploymentData.contracts.DistributionManager = distributionManagerAddr;
    saveProgress();
    console.log(`✓ DistributionManager deployed to: ${distributionManagerAddr}`);
  }

  // Grant TREASURY_ROLE
  const TREASURY_ROLE = await accessController.TREASURY_ROLE();
  const hasTreasRole = await accessController.hasRole(TREASURY_ROLE, deployer.address);
  if (!hasTreasRole) {
    console.log("   -> Granting TREASURY_ROLE to deployer...");
    const tx = await accessController.grantRole(TREASURY_ROLE, deployer.address);
    await waitForReceipt(ethers.provider, tx.hash);
    console.log(`✓ Granted TREASURY_ROLE`);
  }

  // 6. MockUSDC (on testnets)
  let mockUSDCAddr = deploymentData.contracts.MockUSDC;
  if (mockUSDCAddr && (await ethers.provider.getCode(mockUSDCAddr)).length > 2) {
    console.log(`\n6. Reusing deployed MockUSDC at: ${mockUSDCAddr}`);
  } else {
    console.log("\n6. Deploying MockUSDC for testnet simulation...");
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    const tx = await MockUSDCFactory.deploy("USD Coin (Testnet)", "USDC", 6);
    const hash = tx.deploymentTransaction()?.hash!;
    const rc = await waitForReceipt(ethers.provider, hash);
    mockUSDCAddr = rc.contractAddress;
    deploymentData.contracts.MockUSDC = mockUSDCAddr;
    saveProgress();
    console.log(`✓ MockUSDC deployed to: ${mockUSDCAddr}`);
  }

  saveProgress();
  console.log(`\n=================================================`);
  console.log(`✓ All contracts successfully deployed and verified!`);
  console.log(`Deployment summary written to ${filePath}`);
  console.log(`=================================================`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
