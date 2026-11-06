import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  console.log("=================================================");
  console.log("Whitechain Sepolia Official USDT Verification");
  console.log(`Network: Whitechain Sepolia (Chain ID: ${net.chainId})`);
  console.log(`Deployer Address: ${deployer.address}`);
  const nativeBal = await ethers.provider.getBalance(deployer.address);
  console.log(`Native WBT Balance: ${ethers.formatEther(nativeBal)} WBT`);

  const OFFICIAL_USDT = "0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7";
  const usdtAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ];

  const usdt = new ethers.Contract(OFFICIAL_USDT, usdtAbi, deployer);
  const name = await usdt.name();
  const symbol = await usdt.symbol();
  const decimals = await usdt.decimals();
  const totalSupply = await usdt.totalSupply();
  const balance = await usdt.balanceOf(deployer.address);

  console.log(`\nOfficial USDT Contract Details:`);
  console.log(`- Address: ${OFFICIAL_USDT}`);
  console.log(`- Name: ${name}`);
  console.log(`- Symbol: ${symbol}`);
  console.log(`- Decimals: ${decimals}`);
  console.log(`- Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
  console.log(`- Deployer Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

  const deploymentPath = path.join(__dirname, "../deployments/whitechainSepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const distributionManager = deployment.contracts.DistributionManager;

  console.log(`\nTesting Settlement Approval on Whitechain Sepolia...`);
  console.log(`Spender (DistributionManager): ${distributionManager}`);
  
  // Test approve 100,000 USDT (in 6 decimals) to DistributionManager
  const approveAmount = ethers.parseUnits("100000", decimals);
  const tx = await usdt.approve(distributionManager, approveAmount);
  console.log(`Approval Transaction broadcast: ${tx.hash}`);
  const receipt = await tx.wait(1);
  console.log(`✓ Mined in Whitechain block: ${receipt?.blockNumber}`);

  const allowance = await usdt.allowance(deployer.address, distributionManager);
  console.log(`✓ Verified On-Chain Allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
  console.log(`Explorer Link: https://explorer.testnet.whitechain.io/tx/${tx.hash}`);
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exitCode = 1;
});
