import { ethers } from "ethers";
import { NETWORKS, CONFIG } from "../config";

export interface TxRequest {
  to: string;
  data: string;
  value?: bigint;
}

export interface TxResult {
  txHash: string;
  nonce: number;
  blockNumber: number;
  gasUsed: string;
  status: "CONFIRMED" | "REVERTED";
}

export class TxManager {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private currentNonce: number = -1;
  private mutex: Promise<void> = Promise.resolve();

  constructor(provider: ethers.JsonRpcProvider, signer: ethers.Wallet) {
    this.provider = provider;
    this.signer = signer;
  }

  public async getNextNonce(): Promise<number> {
    if (this.currentNonce === -1) {
      this.currentNonce = await this.provider.getTransactionCount(this.signer.address, "pending");
    } else {
      this.currentNonce++;
    }
    return this.currentNonce;
  }

  public async sendTransaction(request: TxRequest): Promise<TxResult> {
    // Synchronize nonce access
    return new Promise((resolve, reject) => {
      this.mutex = this.mutex.then(async () => {
        try {
          const nonce = await this.getNextNonce();
          const feeData = await this.provider.getFeeData();

          const net = NETWORKS[CONFIG.activeNetwork];
          const txResponse = await this.signer.sendTransaction({
            to: request.to,
            data: request.data,
            value: request.value || 0n,
            nonce: nonce,
            maxFeePerGas: feeData.maxFeePerGas ? (feeData.maxFeePerGas * 120n) / 100n : undefined,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 120n) / 100n : undefined,
          });

          // Wait for required confirmations (e.g. 12 on Whitechain Sepolia, 1 on local)
          const confirmations = net ? net.requiredConfirmations : 1;
          const receipt = await txResponse.wait(confirmations);

          if (!receipt) {
            throw new Error(`Transaction ${txResponse.hash} failed to return a receipt.`);
          }

          resolve({
            txHash: receipt.hash,
            nonce: nonce,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status === 1 ? "CONFIRMED" : "REVERTED",
          });
        } catch (error) {
          // Reset nonce in case of failure so it resyncs from chain
          this.currentNonce = -1;
          reject(error);
        }
      });
    });
  }
}
