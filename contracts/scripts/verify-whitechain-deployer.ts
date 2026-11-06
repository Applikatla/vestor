import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.log("No private key found in .env");
    return;
  }
  const wallet = new ethers.Wallet(pk);
  console.log(`Updated Deployer Address: ${wallet.address}`);

  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.whitechain.io");
  const balance = await provider.getBalance(wallet.address);
  console.log(`Whitechain Sepolia Balance: ${ethers.formatEther(balance)} WBT`);
}

main().catch(console.error);
