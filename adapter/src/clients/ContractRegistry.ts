import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { CONFIG, NETWORKS } from "../config";

export class ContractRegistry {
  public provider: ethers.JsonRpcProvider;
  public signer: ethers.Wallet;
  public contracts: Record<string, ethers.Contract> = {};

  constructor() {
    const netConfig = NETWORKS[CONFIG.activeNetwork];
    if (!netConfig) {
      throw new Error(`Unknown active network: ${CONFIG.activeNetwork}`);
    }

    this.provider = new ethers.JsonRpcProvider(netConfig.rpcUrl);
    this.signer = new ethers.Wallet(CONFIG.privateKey, this.provider);
  }

  public getContract(name: string, address: string, artifactPath: string): ethers.Contract {
    const key = `${name}_${address.toLowerCase()}`;
    if (this.contracts[key]) {
      return this.contracts[key];
    }

    const artifactRaw = fs.readFileSync(path.resolve(artifactPath), "utf-8");
    const artifact = JSON.parse(artifactRaw);

    const contract = new ethers.Contract(address, artifact.abi, this.signer);
    this.contracts[key] = contract;
    return contract;
  }
}
