import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const envPath = path.resolve(__dirname, "../.env");

async function main() {
  let privateKey: string | undefined;

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  }

  let createdNew = false;
  if (!privateKey || privateKey.startsWith("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")) {
    // Generate a fresh random wallet
    const randomWallet = ethers.Wallet.createRandom();
    privateKey = randomWallet.privateKey;
    createdNew = true;

    const envContent = [
      `# Whitechain & Sepolia Deployer Key`,
      `DEPLOYER_PRIVATE_KEY=${privateKey}`,
      `WHITECHAIN_SEPOLIA_RPC_URL=https://rpc.testnet.whitechain.io`,
      `SEPOLIA_RPC_URL=https://rpc.sepolia.org`,
      ``,
    ].join("\n");

    fs.writeFileSync(envPath, envContent);
    console.log(`[INFO] Generated fresh deployer wallet and saved to contracts/.env`);
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log(`Deployer Public Address: ${wallet.address}`);

  // Query Whitechain Sepolia RPC
  try {
    const whitechainProvider = new ethers.JsonRpcProvider("https://rpc.testnet.whitechain.io");
    const whitechainBalance = await whitechainProvider.getBalance(wallet.address);
    console.log(`Whitechain Sepolia Balance: ${ethers.formatEther(whitechainBalance)} WBT`);
  } catch (err: any) {
    console.log(`Whitechain Sepolia RPC error: ${err.message}`);
  }

  // Query Sepolia RPC
  try {
    const sepoliaProvider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    const sepoliaBalance = await sepoliaProvider.getBalance(wallet.address);
    console.log(`Ethereum Sepolia Balance: ${ethers.formatEther(sepoliaBalance)} ETH`);
  } catch (err: any) {
    console.log(`Sepolia RPC error: ${err.message}`);
  }
}

main().catch(console.error);
