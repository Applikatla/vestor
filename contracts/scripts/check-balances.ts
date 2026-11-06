import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function check() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.log("No private key found in .env");
    return;
  }
  const wallet = new ethers.Wallet(pk);
  console.log(`Address: ${wallet.address}`);

  const endpoints = [
    { name: "Whitechain Sepolia", rpc: "https://rpc.testnet.whitechain.io", symbol: "WBT" },
    { name: "Ethereum Sepolia", rpc: "https://rpc.sepolia.org", symbol: "ETH" },
    { name: "Ethereum Sepolia (Fallback)", rpc: "https://ethereum-sepolia-rpc.publicnode.com", symbol: "ETH" },
  ];

  for (const ep of endpoints) {
    try {
      const provider = new ethers.JsonRpcProvider(ep.rpc, undefined, { staticNetwork: true });
      const bal = await Promise.race([
        provider.getBalance(wallet.address),
        new Promise<bigint>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
      ]);
      console.log(`${ep.name}: ${ethers.formatEther(bal)} ${ep.symbol}`);
    } catch (e: any) {
      console.log(`${ep.name}: ${e.message}`);
    }
  }
}

check().catch(console.error);
