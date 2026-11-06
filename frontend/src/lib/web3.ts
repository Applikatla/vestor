import { ethers } from "ethers";
import { SEPOLIA_CONTRACTS } from "./contracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function getWeb3Provider(): Promise<ethers.BrowserProvider | null> {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

export async function connectWallet(): Promise<{ address: string; provider: ethers.BrowserProvider; signer: ethers.JsonRpcSigner } | null> {
  const provider = await getWeb3Provider();
  if (!provider) {
    alert("MetaMask or Web3 wallet not detected. Please install MetaMask.");
    return null;
  }

  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // Verify Network is Whitechain Sepolia (1874 = 0x752)
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== SEPOLIA_CONTRACTS.chainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x752" }], // Whitechain Sepolia Hex (1874)
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x752",
                chainName: "Whitechain Sepolia",
                nativeCurrency: { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 },
                rpcUrls: ["https://rpc.testnet.whitechain.io"],
                blockExplorerUrls: ["https://explorer.testnet.whitechain.io"],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed adding Whitechain Sepolia to MetaMask:", addError);
        }
      }
    }
  }

  return { address, provider, signer };
}

export function formatAddress(addr: string): string {
  if (!addr) return "";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}
