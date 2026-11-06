import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const hash = "0x3a94a687dad1637271d11f4ae64b64752ee4d2df77d8b6ab0ba0432b1a4ce61d";
  const rc = await provider.getTransactionReceipt(hash);
  if (!rc) {
    console.log("Status: Pending");
    return;
  }
  console.log("Status:", rc.status === 1 ? "SUCCESS" : "REVERTED");
  console.log("Block Number:", rc.blockNumber);
  console.log("Gas Used:", rc.gasUsed.toString());
}

main().catch(console.error);
