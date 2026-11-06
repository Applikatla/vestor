import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.testnet.whitechain.io");
  const address = "0x96bDC6b5dFB67deBbae37Ec582193c61217d13B6";
  const balance = await provider.getBalance(address);
  console.log(`Address: ${address}`);
  console.log(`Whitechain Sepolia Balance: ${ethers.formatEther(balance)} WBT`);
}

main().catch(console.error);
