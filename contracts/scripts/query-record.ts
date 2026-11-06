import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const registryAddr = "0xFBE0be00D3A7dF71c8a0432E9f396Bd596A2723F";
  const inventoryId = "0xea2de6b7c5c5956851f3e2341dd61906fc6bc291e6a22d6ca576c53857a393f7";

  const abi = [
    "function inventories(bytes32) view returns (bytes32 inventoryId, address issuer, bytes32 evidenceRoot, uint64 registeredAt, uint8 status)",
  ];
  const contract = new ethers.Contract(registryAddr, abi, provider);
  const record = await contract.inventories(inventoryId);

  console.log("On-Chain Verification Results:");
  console.log("-----------------------------------------");
  console.log("Inventory ID :", record.inventoryId);
  console.log("Issuer       :", record.issuer);
  console.log("Evidence Root:", record.evidenceRoot);
  console.log("Timestamp    :", new Date(Number(record.registeredAt) * 1000).toUTCString());
  console.log("Status       :", record.status.toString(), "(1 = REGISTERED)");
}

main().catch(console.error);
