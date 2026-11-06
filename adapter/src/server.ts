import express, { Request, Response } from "express";
import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";
import { CONFIG, NETWORKS } from "./config";
import { ContractRegistry } from "./clients/ContractRegistry";
import { TxManager } from "./txmanager/TxManager";

const app = express();
app.use(express.json());

const registry = new ContractRegistry();
const txManager = new TxManager(registry.provider, registry.signer);

// Path to compiled Hardhat artifacts
const ARTIFACTS_ROOT = path.resolve(__dirname, "../../contracts/artifacts/contracts");

function loadArtifact(subpath: string, contractName: string) {
  const filePath = path.join(ARTIFACTS_ROOT, subpath, `${contractName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Artifact not found at ${filePath}. Ensure contracts are compiled.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    network: CONFIG.activeNetwork,
    signerAddress: registry.signer.address,
  });
});

// 1. Register Inventory Commitment
const RegisterInventorySchema = z.object({
  registryAddress: z.string(),
  inventoryId: z.string(),
  issuer: z.string(),
  evidenceRoot: z.string(),
});

app.post("/internal/v1/registry/register", async (req: Request, res: Response) => {
  try {
    const data = RegisterInventorySchema.parse(req.body);
    const artifact = loadArtifact("registry/InventoryRegistry.sol", "InventoryRegistry");
    const contract = new ethers.Contract(data.registryAddress, artifact.abi, registry.signer);

    const callData = contract.interface.encodeFunctionData("registerInventory", [
      data.inventoryId,
      data.issuer,
      data.evidenceRoot,
    ]);

    const result = await txManager.sendTransaction({
      to: data.registryAddress,
      data: callData,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Deploy Inventory Token via Factory
const DeployTokenSchema = z.object({
  factoryAddress: z.string(),
  name: z.string(),
  symbol: z.string(),
  inventoryId: z.string(),
  issuanceId: z.string(),
  termsHash: z.string(),
  maxSupply: z.string(), // Base units in wei
});

app.post("/internal/v1/tokens/deploy", async (req: Request, res: Response) => {
  try {
    const data = DeployTokenSchema.parse(req.body);
    const artifact = loadArtifact("tokens/InventoryTokenFactory.sol", "InventoryTokenFactory");
    const contract = new ethers.Contract(data.factoryAddress, artifact.abi, registry.signer);

    const callData = contract.interface.encodeFunctionData("createToken", [
      data.name,
      data.symbol,
      data.inventoryId,
      data.issuanceId,
      data.termsHash,
      BigInt(data.maxSupply),
    ]);

    const result = await txManager.sendTransaction({
      to: data.factoryAddress,
      data: callData,
    });

    // Extract deployed token address from events
    const deployedToken = await contract.tokens(data.issuanceId);

    res.json({ success: true, tokenAddress: deployedToken, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Record Sales Attestation
const AttestSaleSchema = z.object({
  settlementAddress: z.string(),
  inventoryId: z.string(),
  batchId: z.string(),
  saleId: z.string(),
  quantity: z.string(),
  grossAmount: z.string(),
  netAmount: z.string(),
  buyerRefHash: z.string(),
  timestamp: z.number(),
  nonce: z.string(),
  signature: z.string(),
});

app.post("/internal/v1/sales/attest", async (req: Request, res: Response) => {
  try {
    const data = AttestSaleSchema.parse(req.body);
    const artifact = loadArtifact("settlement/SalesSettlement.sol", "SalesSettlement");
    const contract = new ethers.Contract(data.settlementAddress, artifact.abi, registry.signer);

    const callData = contract.interface.encodeFunctionData("recordSaleAttestation", [
      data.inventoryId,
      data.batchId,
      data.saleId,
      BigInt(data.quantity),
      BigInt(data.grossAmount),
      BigInt(data.netAmount),
      data.buyerRefHash,
      BigInt(data.timestamp),
      BigInt(data.nonce),
      data.signature,
    ]);

    const result = await txManager.sendTransaction({
      to: data.settlementAddress,
      data: callData,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create Distribution Pool
const CreateDistributionSchema = z.object({
  distributionManagerAddress: z.string(),
  paymentToken: z.string(),
  totalAmount: z.string(),
  merkleRoot: z.string(),
  snapshotBlock: z.number(),
  termsHash: z.string(),
});

app.post("/internal/v1/distributions/create", async (req: Request, res: Response) => {
  try {
    const data = CreateDistributionSchema.parse(req.body);
    const artifact = loadArtifact("distributions/DistributionManager.sol", "DistributionManager");
    const contract = new ethers.Contract(data.distributionManagerAddress, artifact.abi, registry.signer);

    const callData = contract.interface.encodeFunctionData("createDistribution", [
      data.paymentToken,
      BigInt(data.totalAmount),
      data.merkleRoot,
      BigInt(data.snapshotBlock),
      data.termsHash,
    ]);

    const result = await txManager.sendTransaction({
      to: data.distributionManagerAddress,
      data: callData,
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Query Transaction Receipt
app.get("/internal/v1/transactions/:hash", async (req: Request, res: Response) => {
  try {
    const receipt = await registry.provider.getTransactionReceipt(req.params.hash);
    if (!receipt) {
      return res.status(404).json({ status: "PENDING" });
    }
    res.json({
      status: receipt.status === 1 ? "CONFIRMED" : "REVERTED",
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      confirmations: await receipt.confirmations(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server if run directly
if (require.main === module) {
  app.listen(CONFIG.port, () => {
    console.log(`[Node Adapter] Listening on port ${CONFIG.port} for network ${CONFIG.activeNetwork}`);
  });
}

export default app;
