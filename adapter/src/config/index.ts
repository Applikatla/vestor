import * as dotenv from "dotenv";
dotenv.config();

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  wsUrl?: string;
  requiredConfirmations: number;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  whitechainSepolia: {
    name: "Whitechain Sepolia",
    chainId: 1874,
    rpcUrl: process.env.WHITECHAIN_SEPOLIA_RPC_URL || "https://rpc.testnet.whitechain.io",
    requiredConfirmations: parseInt(process.env.CONFIRMATIONS || "1", 10),
  },
  sepolia: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    requiredConfirmations: 1,
  },
  localhost: {
    name: "Localhost",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    requiredConfirmations: 1,
  },
};

export const CONFIG = {
  activeNetwork: process.env.ACTIVE_NETWORK || "whitechainSepolia",
  port: parseInt(process.env.ADAPTER_PORT || "8081", 10),
  privateKey: process.env.SIGNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgrespassword@localhost:5432/tokenization_inventory?sslmode=disable",
};
