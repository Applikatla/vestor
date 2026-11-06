import { ethers } from "ethers";

export interface EventCallback {
  (event: {
    eventName: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    args: Record<string, any>;
  }): Promise<void>;
}

export class EventIndexer {
  private provider: ethers.JsonRpcProvider;
  private lastIndexedBlock: number;
  private isRunning: boolean = false;
  private blockHashHistory: Map<number, string> = new Map();

  constructor(provider: ethers.JsonRpcProvider, startBlock: number) {
    this.provider = provider;
    this.lastIndexedBlock = startBlock;
  }

  public async pollEvents(
    contracts: { contract: ethers.Contract; eventNames: string[] }[],
    onEvent: EventCallback,
    onReorg?: (orphanedBlock: number) => Promise<void>
  ) {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastIndexedBlock) {
        this.isRunning = false;
        return;
      }

      const fromBlock = this.lastIndexedBlock + 1;
      const toBlock = Math.min(currentBlock, fromBlock + 50); // Process up to 50 blocks per iteration

      // 1. Check for Reorganization: verify parent block hash
      if (this.blockHashHistory.has(this.lastIndexedBlock)) {
        const lastBlockData = await this.provider.getBlock(this.lastIndexedBlock);
        const storedHash = this.blockHashHistory.get(this.lastIndexedBlock);
        if (lastBlockData && lastBlockData.hash !== storedHash) {
          console.warn(`[Indexer] Reorg detected at block ${this.lastIndexedBlock}! Stored: ${storedHash}, Current: ${lastBlockData.hash}`);
          if (onReorg) {
            await onReorg(this.lastIndexedBlock);
          }
          // Step back 5 blocks to resync
          this.lastIndexedBlock = Math.max(0, this.lastIndexedBlock - 5);
          this.isRunning = false;
          return;
        }
      }

      // 2. Fetch logs for each contract
      for (const item of contracts) {
        for (const evName of item.eventNames) {
          const filter = item.contract.filters[evName]();
          const logs = await item.contract.queryFilter(filter, fromBlock, toBlock);

          for (const log of logs) {
            if ("args" in log) {
              await onEvent({
                eventName: evName,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                logIndex: log.index,
                args: log.args,
              });
            }
          }
        }
      }

      // Record block hash for reorg detection
      const toBlockData = await this.provider.getBlock(toBlock);
      if (toBlockData) {
        this.blockHashHistory.set(toBlock, toBlockData.hash || "");
      }

      this.lastIndexedBlock = toBlock;
    } catch (error) {
      console.error("[Indexer] Error polling events:", error);
    } finally {
      this.isRunning = false;
    }
  }

  public getLastIndexedBlock(): number {
    return this.lastIndexedBlock;
  }
}
