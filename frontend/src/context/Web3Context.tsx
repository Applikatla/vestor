"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { SEPOLIA_CONTRACTS, USDT_ABI, MOCK_USDC_ABI } from "../lib/contracts";
import { connectWallet, formatAddress } from "../lib/web3";

interface Web3ContextType {
  account: string;
  chainId: number | null;
  usdtBalance: string | null;
  isWrongNetwork: boolean;
  connecting: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  provisionRoles: () => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType>({
  account: "",
  chainId: null,
  usdtBalance: null,
  isWrongNetwork: false,
  connecting: false,
  connect: async () => null,
  disconnect: () => {},
  refreshBalance: async () => {},
  switchNetwork: async () => {},
  provisionRoles: async () => false,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchBalance = async (addr: string, provider: ethers.BrowserProvider) => {
    try {
      // 1. Check official Whitechain USDT
      try {
        const usdt = new ethers.Contract(SEPOLIA_CONTRACTS.USDT, USDT_ABI, provider);
        const bal = await usdt.balanceOf(addr);
        if (bal > 0n) {
          const formatted = parseFloat(ethers.formatUnits(bal, 6)).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          setUsdtBalance(`${formatted} USDT`);
          return;
        }
      } catch (err) {
        console.warn("USDT balance fetch:", err);
      }

      // 2. Fallback to MockUSDC
      try {
        const mock = new ethers.Contract(SEPOLIA_CONTRACTS.MockUSDC, MOCK_USDC_ABI, provider);
        const bal = await mock.balanceOf(addr);
        if (bal > 0n) {
          const formatted = parseFloat(ethers.formatUnits(bal, 6)).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          setUsdtBalance(`${formatted} MOCK`);
          return;
        }
      } catch (err) {
        console.warn("Mock balance fetch:", err);
      }

      setUsdtBalance("0.00 USDT");
    } catch (e) {
      console.error("Failed fetching balance:", e);
      setUsdtBalance("0.00 USDT");
    }
  };

  const loadUserData = async (addr: string) => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      const cid = Number(net.chainId);
      setChainId(cid);
      const wrong = cid !== SEPOLIA_CONTRACTS.chainId;
      setIsWrongNetwork(wrong);

      if (!wrong) {
        await fetchBalance(addr, provider);
      } else {
        setUsdtBalance(null);
      }
    } catch (e) {
      console.error("Error loading user data:", e);
    }
  };

  const provisionRoles = async (): Promise<boolean> => {
    if (!account) return false;
    try {
      const res = await fetch("/api/provision-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAddress: account }),
      });
      const data = await res.json();
      return data.success === true;
    } catch (err) {
      console.warn("Auto-provision error:", err);
      return false;
    }
  };

  const connect = async (): Promise<string | null> => {
    setConnecting(true);
    try {
      const res = await connectWallet();
      if (res) {
        setAccount(res.address);
        if (typeof window !== "undefined") {
          localStorage.setItem("vestor_wallet_connected", "true");
        }
        await loadUserData(res.address);
        // Silently provision testnet registrar & attestor role in background
        provisionRoles().catch(() => {});
        return res.address;
      }
      return null;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount("");
    setUsdtBalance(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("vestor_wallet_connected");
    }
  };

  const switchNetwork = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const hexChainId = "0x" + SEPOLIA_CONTRACTS.chainId.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: SEPOLIA_CONTRACTS.networkName,
              nativeCurrency: { name: "Whitechain", symbol: "WBT", decimals: 18 },
              rpcUrls: [SEPOLIA_CONTRACTS.rpcUrl],
              blockExplorerUrls: [SEPOLIA_CONTRACTS.explorerUrl],
            },
          ],
        });
      }
    }
  };

  const refreshBalance = async () => {
    if (account && typeof window !== "undefined" && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await fetchBalance(account, provider);
    }
  };

  // Auto-connect on mount if previously connected
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const wasConnected = localStorage.getItem("vestor_wallet_connected") === "true";

    window.ethereum
      .request({ method: "eth_accounts" })
      .then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem("vestor_wallet_connected", "true");
          await loadUserData(accounts[0]);
          provisionRoles().catch(() => {});
        } else if (wasConnected) {
          // Attempt silent connection
          window.ethereum
            .request({ method: "eth_requestAccounts" })
            .then(async (accs: string[]) => {
              if (accs.length > 0) {
                setAccount(accs[0]);
                await loadUserData(accs[0]);
              }
            })
            .catch(() => {
              localStorage.removeItem("vestor_wallet_connected");
            });
        }
      })
      .catch(console.error);

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        localStorage.setItem("vestor_wallet_connected", "true");
        loadUserData(accounts[0]);
        provisionRoles().catch(() => {});
      } else {
        disconnect();
      }
    };

    const handleChainChanged = () => {
      if (account) {
        loadUserData(account);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        usdtBalance,
        isWrongNetwork,
        connecting,
        connect,
        disconnect,
        refreshBalance,
        switchNetwork,
        provisionRoles,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}
