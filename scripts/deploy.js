const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=================================================");
  console.log("🚀 Deploying Platform Infrastructure with:", deployer.address);
  console.log("=================================================\n");

  // 1. Deploy MockUSDC
  console.log("1️⃣  Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("   ✅ MockUSDC deployed at:", mockUSDCAddress);

  // 2. Deploy InventoryRegistry
  console.log("\n2️⃣  Deploying InventoryRegistry...");
  const InventoryRegistry = await hre.ethers.getContractFactory("InventoryRegistry");
  const registry = await InventoryRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   ✅ InventoryRegistry deployed at:", registryAddress);

  // 3. Deploy Global FinancingVault
  console.log("\n3️⃣  Deploying Global FinancingVault...");
  const FinancingVault = await hre.ethers.getContractFactory("FinancingVault");
  const vault = await FinancingVault.deploy(registryAddress, mockUSDCAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   ✅ Global FinancingVault deployed at:", vaultAddress);

  // 4. Authorize FinancingVault on InventoryRegistry
  console.log("\n4️⃣  Authorizing FinancingVault on InventoryRegistry...");
  const authTx = await registry.setOperator(vaultAddress, true);
  await authTx.wait();
  console.log("   ✅ FinancingVault authorized as operator on Registry");

  // 5. Save Platform Deployments
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      MockUSDC: mockUSDCAddress,
      InventoryRegistry: registryAddress,
      FinancingVault: vaultAddress
    },
    timestamp: new Date().toISOString()
  };

  const deploymentsPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Saved platform addresses to ${deploymentsPath}`);

  console.log("\n=================================================");
  console.log("🎉 Platform base infrastructure deployed successfully!");
  console.log("ℹ️  InventoryERC20 tokens can now be deployed from the frontend via ethers.ContractFactory");
  console.log("=================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
