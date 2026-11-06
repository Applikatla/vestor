import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC_URL = "https://rpc.testnet.whitechain.io";
const ACCESS_CONTROLLER = "0xD22E553477bb586c19Eb50E5b215bCE66A65111B";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x07a43b705defba5a27f08f2161e2054067cb485e19e3a97f31da2671bc0e2e35";

const ACCESS_CONTROLLER_ABI = [
  "function REGISTRAR_ROLE() view returns (bytes32)",
  "function ATTESTOR_ROLE() view returns (bytes32)",
  "function COMPLIANCE_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
];

export async function POST(req: NextRequest) {
  try {
    const { targetAddress } = await req.json();
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
      return NextResponse.json({ success: false, error: "Invalid targetAddress" }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(ACCESS_CONTROLLER, ACCESS_CONTROLLER_ABI, signer);

    const registrarRole = await contract.REGISTRAR_ROLE();
    const attestorRole = await contract.ATTESTOR_ROLE();

    const hasRegistrar = await contract.hasRole(registrarRole, targetAddress);
    const hasAttestor = await contract.hasRole(attestorRole, targetAddress);

    if (hasRegistrar && hasAttestor) {
      return NextResponse.json({
        success: true,
        alreadyProvisioned: true,
        targetAddress,
      });
    }

    // Grant missing roles
    const txs: string[] = [];
    if (!hasRegistrar) {
      const tx = await contract.grantRole(registrarRole, targetAddress);
      await tx.wait(1);
      txs.push(tx.hash);
    }

    if (!hasAttestor) {
      const tx = await contract.grantRole(attestorRole, targetAddress);
      await tx.wait(1);
      txs.push(tx.hash);
    }

    return NextResponse.json({
      success: true,
      provisioned: true,
      targetAddress,
      txHashes: txs,
    });
  } catch (err: any) {
    console.error("Role provision failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
