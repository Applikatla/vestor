import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import deployments from './contracts/deployments.json';
import InventoryRegistryABI from './contracts/InventoryRegistryABI.json';
import InventoryERC20Artifact from './contracts/InventoryERC20Artifact.json';
import FinancingVaultArtifact from './contracts/FinancingVaultArtifact.json';
import MockUSDCArtifact from './contracts/MockUSDCArtifact.json';
import {
  Boxes,
  Warehouse,
  FileCheck,
  Wallet,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  X,
  ChevronDown,
  Copy,
  LogOut,
  Sparkles,
  ShieldCheck,
  Coins,
  DollarSign,
  TrendingUp,
  CreditCard
} from 'lucide-react';

const API_BASE = "http://localhost:8080/api";
const WHITECHAIN_CHAIN_ID_HEX = "0x752"; // 1874 in hex
const EXPLORER_BASE = deployments.explorerUrl || "https://explorer.testnet.whitechain.io";

export default function App() {
  // EIP-6963 Multi-Wallet Discovery State
  const [detectedWallets, setDetectedWallets] = useState([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);

  // Connected Wallet State
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [walletName, setWalletName] = useState("");
  const [walletIcon, setWalletIcon] = useState("");
  const [networkOk, setNetworkOk] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Faucet State
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [faucetSuccessMsg, setFaucetSuccessMsg] = useState("");

  // Form State (Inventory Input)
  const [warehouseId, setWarehouseId] = useState("WH-MUMBAI-01");
  const [warehouseName, setWarehouseName] = useState("Bhiwandi Logistics Hub");
  const [warehouseLocation, setWarehouseLocation] = useState("Bhiwandi, Mumbai, MH");
  const [items, setItems] = useState([
    { sku: "GPU-NV-4090", name: "Nvidia RTX 4090 24GB", category: "Electronics", quantity: 100, unit_price: 1600.0, batch_number: "BATCH-2026-A1" },
    { sku: "CPU-INT-14900K", name: "Intel Core i9 14900K", category: "Electronics", quantity: 200, unit_price: 550.0, batch_number: "BATCH-2026-B2" }
  ]);
  const [docName, setDocName] = useState("Warehouse_Receipt_WH01.pdf");
  const [docUri, setDocUri] = useState("ipfs://QmWarehouseProofOfStorageMumbai2026");

  // Workflow State: Step 1 & 2
  const [isSubmittingDB, setIsSubmittingDB] = useState(false);
  const [dbResult, setDbResult] = useState(null);
  const [isSigningTx, setIsSigningTx] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [txSuccess, setTxSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Workflow State: Step 3 (Tokenize / Deploy InventoryERC20)
  const [selectedInventoryForTokenize, setSelectedInventoryForTokenize] = useState(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [targetCapital, setTargetCapital] = useState("80000"); // in USDC
  const [tokenPrice, setTokenPrice] = useState("1"); // 1 USDC per token
  const [advanceRate, setAdvanceRate] = useState("80"); // 80%
  const [durationDays, setDurationDays] = useState("30");
  const [isDeployingToken, setIsDeployingToken] = useState(false);
  const [deployedTokenResult, setDeployedTokenResult] = useState(null);

  // Workflow State: Step 4 (Invest / Buy Tokens)
  const [selectedInventoryForInvest, setSelectedInventoryForInvest] = useState(null);
  const [investAmount, setInvestAmount] = useState("1000");
  const [isInvesting, setIsInvesting] = useState(false);
  const [investStep, setInvestStep] = useState(""); // "approving", "depositing"
  const [investSuccessResult, setInvestSuccessResult] = useState(null);

  // Quick Inspection State
  const [isInspecting, setIsInspecting] = useState(false);

  // Inventory Explorer State
  const [inventories, setInventories] = useState([]);
  const [isLoadingInventories, setIsLoadingInventories] = useState(false);

  // Fetch USDC Balance
  const fetchUsdcBalance = async (userAddr, prov) => {
    try {
      const p = prov || new ethers.BrowserProvider(activeProvider || window.ethereum);
      const usdc = new ethers.Contract(deployments.contracts.MockUSDC, MockUSDCArtifact.abi, p);
      const bal = await usdc.balanceOf(userAddr);
      setUsdcBalance(parseFloat(ethers.formatUnits(bal, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch (err) {
      console.error("Failed to fetch USDC balance:", err);
    }
  };

  // EIP-6963: Scan all installed wallet extensions on user's machine
  useEffect(() => {
    const handleAnnouncement = (event) => {
      if (!event.detail || !event.detail.info) return;
      setDetectedWallets((prev) => {
        if (prev.some(w => w.info.uuid === event.detail.info.uuid || w.info.rdns === event.detail.info.rdns)) {
          return prev;
        }
        return [...prev, event.detail];
      });
    };

    window.addEventListener("eip6963:announceProvider", handleAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const timer = setTimeout(() => {
      if (window.ethereum) {
        if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
          window.ethereum.providers.forEach((prov, idx) => {
            const name = prov.isMetaMask ? "MetaMask" : prov.isCoinbaseWallet ? "Coinbase Wallet" : prov.isRabby ? "Rabby" : `Wallet #${idx + 1}`;
            setDetectedWallets(prev => {
              if (prev.some(w => w.info.name === name)) return prev;
              return [...prev, {
                info: { name, uuid: `injected-${idx}`, rdns: `injected-${idx}` },
                provider: prov
              }];
            });
          });
        } else {
          const name = window.ethereum.isMetaMask ? "MetaMask" : window.ethereum.isCoinbaseWallet ? "Coinbase Wallet" : window.ethereum.isRabby ? "Rabby" : "Browser Injected Wallet";
          setDetectedWallets(prev => {
            if (prev.length > 0) return prev;
            return [{
              info: { name, uuid: "injected-default", rdns: "injected-default" },
              provider: window.ethereum
            }];
          });
        }
      }
    }, 300);

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
      clearTimeout(timer);
    };
  }, []);

  // Connect to a specifically selected wallet
  const connectSpecificWallet = async (walletDetail) => {
    setIsConnecting(true);
    setErrorMessage("");
    setIsWalletModalOpen(false);

    try {
      const rawProvider = walletDetail.provider || window.ethereum;
      if (!rawProvider) throw new Error("No Web3 provider found");

      setActiveProvider(rawProvider);
      const browserProvider = new ethers.BrowserProvider(rawProvider);

      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      setAccount(userAddress);
      setWalletName(walletDetail.info.name);
      setWalletIcon(walletDetail.info.icon || "");

      const bal = await browserProvider.getBalance(userAddress);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));

      // Fetch Mock USDC balance
      fetchUsdcBalance(userAddress, browserProvider);

      // Network verification & Whitechain testnet check
      const network = await browserProvider.getNetwork();
      if (network.chainId !== 1874n) {
        try {
          await rawProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: WHITECHAIN_CHAIN_ID_HEX }],
          });
          setNetworkOk(true);
        } catch (switchError) {
          if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
            await rawProvider.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: WHITECHAIN_CHAIN_ID_HEX,
                chainName: "Whitechain Testnet",
                rpcUrls: ["https://rpc.ankr.com/whitechain_testnet"],
                nativeCurrency: { name: "WBT", symbol: "WBT", decimals: 18 },
                blockExplorerUrls: [EXPLORER_BASE],
              }],
            });
            setNetworkOk(true);
          } else {
            console.error("Network switch failed:", switchError);
            setNetworkOk(false);
          }
        }
      } else {
        setNetworkOk(true);
      }

      if (rawProvider.on) {
        rawProvider.on("accountsChanged", (newAccounts) => {
          if (newAccounts.length === 0) {
            disconnectWallet();
          } else {
            setAccount(newAccounts[0]);
            fetchUsdcBalance(newAccounts[0], browserProvider);
          }
        });
        rawProvider.on("chainChanged", () => {
          window.location.reload();
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to connect to selected wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Claim 10,000 Mock USDC from Faucet
  const handleClaimFaucet = async () => {
    if (!account) {
      setIsWalletModalOpen(true);
      return;
    }
    setIsClaimingFaucet(true);
    setErrorMessage("");
    setFaucetSuccessMsg("");

    try {
      const rawProvider = activeProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(rawProvider);
      const signer = await provider.getSigner();

      const usdcContract = new ethers.Contract(
        deployments.contracts.MockUSDC,
        MockUSDCArtifact.abi,
        signer
      );

      console.log("Minting 10,000 Mock USDC to:", account);
      const mintAmount = ethers.parseUnits("10000", 6);
      const tx = await usdcContract.mint(account, mintAmount);
      await tx.wait();

      await fetchUsdcBalance(account, provider);
      setFaucetSuccessMsg("🎉 Successfully received 10,000 Mock USDC!");
      setTimeout(() => setFaucetSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Faucet claim error:", err);
      setErrorMessage(err.reason || err.message || "Failed to claim Mock USDC");
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  const switchAccount = async () => {
    if (!activeProvider) return;
    try {
      await activeProvider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (err) {
      console.error(err);
    }
    setShowAccountDropdown(false);
  };

  const disconnectWallet = () => {
    setAccount("");
    setBalance("0");
    setUsdcBalance("0");
    setWalletName("");
    setWalletIcon("");
    setActiveProvider(null);
    setShowAccountDropdown(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addItem = () => {
    setItems([...items, { sku: "", name: "", category: "Electronics", quantity: 1, unit_price: 100.0, batch_number: "" }]);
  };
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Step 1: Submit to Go Backend & DB
  const handleStoreInDB = async (e) => {
    e.preventDefault();
    if (!account) {
      setIsWalletModalOpen(true);
      return;
    }
    setErrorMessage("");
    setIsSubmittingDB(true);
    setDbResult(null);
    setTxHash("");
    setTxSuccess(false);

    try {
      const payload = {
        issuer_address: account,
        warehouse_id: warehouseId,
        warehouse_name: warehouseName,
        warehouse_location: warehouseLocation,
        items: items.map(item => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity: parseInt(item.quantity, 10),
          unit_price: parseFloat(item.unit_price),
          batch_number: item.batch_number || "BATCH-001"
        })),
        documents: [
          {
            doc_type: "WAREHOUSE_RECEIPT",
            doc_name: docName,
            doc_uri: docUri,
            doc_hash: ethers.keccak256(ethers.toUtf8Bytes(docName + docUri))
          }
        ]
      };

      const res = await fetch(`${API_BASE}/inventories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to store in database");
      }

      setDbResult(json.data);
      fetchInventories();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Error submitting inventory to backend");
    } finally {
      setIsSubmittingDB(false);
    }
  };

  // Step 2: Trigger Blockchain Transaction with Ethers.js
  const handleTriggerTx = async () => {
    if (!dbResult) return;
    setIsSigningTx(true);
    setErrorMessage("");

    try {
      const rawProvider = activeProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(rawProvider);
      const signer = await provider.getSigner();

      const registryContract = new ethers.Contract(
        deployments.contracts.InventoryRegistry,
        InventoryRegistryABI,
        signer
      );

      console.log("Broadcasting registerInventory tx on Whitechain Testnet...");
      const tx = await registryContract.registerInventory(
        dbResult.inventory_id,
        dbResult.canonical_record_hash,
        dbResult.issuer_address
      );

      setTxHash(tx.hash);
      console.log("Tx broadcasted:", tx.hash);

      await tx.wait();
      setTxSuccess(true);

      // Confirm tx back to Go backend
      await fetch(`${API_BASE}/inventories/${dbResult.id}/confirm-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: tx.hash }),
      });

      fetchInventories();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.reason || err.message || "Transaction failed");
    } finally {
      setIsSigningTx(false);
    }
  };

  // Step 2.5: Physical Inspection & Valuation Sign-Off
  const handleApproveInspection = async (inventory) => {
    setIsInspecting(true);
    setErrorMessage("");
    try {
      const rawProvider = activeProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(rawProvider);
      const signer = await provider.getSigner();

      const registryContract = new ethers.Contract(
        deployments.contracts.InventoryRegistry,
        InventoryRegistryABI,
        signer
      );

      const valuationUnits = ethers.parseUnits("100000", 6);
      const evidenceUri = "ipfs://QmInspectionPassCertificateCertificateReport2026";

      console.log("Signing updateValuationAndInspection on-chain...");
      const tx = await registryContract.updateValuationAndInspection(
        inventory.inventory_id,
        valuationUnits,
        2, // Status: Approved
        evidenceUri
      );
      await tx.wait();

      await fetch(`${API_BASE}/inventories/${inventory.id}/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valuation: 100000.0,
          status: "APPROVED",
          evidence_uri: evidenceUri,
          tx_hash: tx.hash
        })
      });

      fetchInventories();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.reason || err.message || "Inspection approval failed. (Only inspector/owner can approve)");
    } finally {
      setIsInspecting(false);
    }
  };

  // Step 3: Open Tokenization Modal
  const openTokenizeModal = (inventory) => {
    setSelectedInventoryForTokenize(inventory);
    setTokenName(`${inventory.warehouse_name || 'Inventory'} Tranche 1 Token`);
    setTokenSymbol(`INV-${inventory.warehouse_id ? inventory.warehouse_id.slice(-4) : 'TR1'}`);
    setTargetCapital("80000");
    setTokenPrice("1");
    setAdvanceRate("80");
    setDurationDays("30");
    setDeployedTokenResult(null);
  };

  // Step 3: Deploy InventoryERC20 from Frontend using Ethers.js ContractFactory
  const handleDeployToken = async () => {
    if (!selectedInventoryForTokenize) return;
    setIsDeployingToken(true);
    setErrorMessage("");
    setDeployedTokenResult(null);

    try {
      const rawProvider = activeProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(rawProvider);
      const signer = await provider.getSigner();

      const targetCapitalUnits = ethers.parseUnits(targetCapital, 6);
      const tokenPriceUnits = ethers.parseUnits(tokenPrice, 6);
      const advanceRateBps = parseInt(advanceRate, 10) * 100;
      const durationSeconds = parseInt(durationDays, 10) * 86400;

      const maxSupply = (BigInt(targetCapitalUnits) * BigInt(10 ** 18)) / BigInt(tokenPriceUnits);

      const termsHash = ethers.keccak256(
        ethers.toUtf8Bytes(`${tokenName}:${tokenSymbol}:${targetCapital}:${advanceRateBps}:${Date.now()}`)
      );

      console.log("1️⃣ Deploying InventoryERC20 using ContractFactory with user wallet...");
      const factory = new ethers.ContractFactory(
        InventoryERC20Artifact.abi,
        InventoryERC20Artifact.bytecode,
        signer
      );

      const tokenContract = await factory.deploy(
        tokenName,
        tokenSymbol,
        selectedInventoryForTokenize.inventory_id,
        termsHash,
        deployments.contracts.FinancingVault,
        maxSupply
      );

      await tokenContract.waitForDeployment();
      const deployedTokenAddress = tokenContract.target;
      console.log("✅ InventoryERC20 deployed at:", deployedTokenAddress);

      // Register Issuance in Global FinancingVault
      console.log("2️⃣ Registering issuance in Global FinancingVault...");
      const vaultContract = new ethers.Contract(
        deployments.contracts.FinancingVault,
        FinancingVaultArtifact.abi,
        signer
      );

      const vaultTx = await vaultContract.createIssuance(
        selectedInventoryForTokenize.inventory_id,
        selectedInventoryForTokenize.issuer_address,
        deployedTokenAddress,
        targetCapitalUnits,
        tokenPriceUnits,
        advanceRateBps,
        durationSeconds
      );
      await vaultTx.wait();
      console.log("✅ Issuance registered in FinancingVault. Tx:", vaultTx.hash);

      // Confirm to Go Backend
      await fetch(`${API_BASE}/inventories/${selectedInventoryForTokenize.id}/confirm-issuance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_token_address: deployedTokenAddress,
          financing_vault_address: deployments.contracts.FinancingVault,
          target_capital: parseFloat(targetCapital),
          token_price: parseFloat(tokenPrice),
          advance_rate_bps: advanceRateBps,
          tx_hash: vaultTx.hash
        })
      });

      setDeployedTokenResult({
        tokenAddress: deployedTokenAddress,
        vaultTxHash: vaultTx.hash,
        tokenName,
        tokenSymbol,
        maxSupply: ethers.formatUnits(maxSupply, 18)
      });

      fetchInventories();
    } catch (err) {
      console.error("Token deployment failed:", err);
      setErrorMessage(err.reason || err.message || "Failed to deploy InventoryERC20 token");
    } finally {
      setIsDeployingToken(false);
    }
  };

  // Step 4: Open Investment Modal
  const openInvestModal = (inventory) => {
    setSelectedInventoryForInvest(inventory);
    setInvestAmount("1000");
    setInvestSuccessResult(null);
  };

  // Step 4: Invest in Tranche (Approve USDC -> Deposit into Vault -> Receive Tokens)
  const handleInvestInTranche = async () => {
    if (!selectedInventoryForInvest || !account) return;
    setIsInvesting(true);
    setErrorMessage("");
    setInvestSuccessResult(null);

    try {
      const rawProvider = activeProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(rawProvider);
      const signer = await provider.getSigner();

      const vaultAddress = deployments.contracts.FinancingVault;
      const usdcAddress = deployments.contracts.MockUSDC;

      // 1. Ensure KYC Allowlist in FinancingVault via backend
      setInvestStep("verifying_allowlist");
      try {
        await fetch(`${API_BASE}/investors/allowlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ investor_address: account }),
        });
      } catch (allowlistErr) {
        console.warn("Allowlist backend check:", allowlistErr);
      }

      // 2. Approve USDC Spending
      setInvestStep("approving_usdc");
      const usdcContract = new ethers.Contract(usdcAddress, MockUSDCArtifact.abi, signer);
      const depositUnits = ethers.parseUnits(investAmount, 6);

      console.log("Approving USDC spending...");
      const approveTx = await usdcContract.approve(vaultAddress, depositUnits);
      await approveTx.wait();

      // 3. Deposit into FinancingVault
      setInvestStep("depositing");
      console.log("Calling vault.deposit...");
      const vaultContract = new ethers.Contract(vaultAddress, FinancingVaultArtifact.abi, signer);
      const depositTx = await vaultContract.deposit(selectedInventoryForInvest.inventory_id, depositUnits);
      await depositTx.wait();

      // Calculate received tokens: (depositUnits * 1e18) / tokenPrice
      const tokenPriceUnits = ethers.parseUnits(selectedInventoryForInvest.token_price.toString() || "1", 6);
      const tokensReceived = (BigInt(depositUnits) * BigInt(10 ** 18)) / BigInt(tokenPriceUnits);

      await fetchUsdcBalance(account, provider);

      setInvestSuccessResult({
        txHash: depositTx.hash,
        amountUSDC: investAmount,
        tokensReceived: ethers.formatUnits(tokensReceived, 18),
        tokenAddress: selectedInventoryForInvest.inventory_token_address
      });
      fetchInventories();
    } catch (err) {
      console.error("Investment failed:", err);
      setErrorMessage(err.reason || err.message || "Investment failed");
    } finally {
      setIsInvesting(false);
      setInvestStep("");
    }
  };

  const fetchInventories = async () => {
    setIsLoadingInventories(true);
    try {
      const res = await fetch(`${API_BASE}/inventories`);
      const json = await res.json();
      if (json.success) {
        setInventories(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch inventories:", err);
    } finally {
      setIsLoadingInventories(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Boxes className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">RWA Inventory Protocol</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Off-chain warehouse verification & on-chain inventory asset tokenization
          </p>
        </div>

        {/* Network & Wallet Controls & Faucet */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Faucet Button */}
          {account && (
            <button
              onClick={handleClaimFaucet}
              disabled={isClaimingFaucet}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Coins className={`w-3.5 h-3.5 ${isClaimingFaucet ? 'animate-spin' : ''}`} />
              {isClaimingFaucet ? "Minting..." : "Faucet: Claim 10k USDC"}
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300">Whitechain Testnet (1874)</span>
          </div>

          {account ? (
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                {walletIcon ? (
                  <img src={walletIcon} alt={walletName} className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                )}
                <div className="text-left">
                  <p className="text-xs font-mono font-medium text-slate-200 flex items-center gap-1">
                    {account.slice(0, 6)}...{account.slice(-4)}
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {balance} WBT &bull; <span className="text-emerald-400 font-semibold">${usdcBalance} USDC</span>
                  </p>
                </div>
              </button>

              {/* Account Dropdown Menu */}
              {showAccountDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-800 text-xs">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Connected via</p>
                    <p className="text-slate-200 font-medium">{walletName || "Browser Wallet"}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">${usdcBalance} USDC</p>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied to clipboard!" : "Copy Address"}
                  </button>
                  <button
                    onClick={switchAccount}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Switch / Add Account
                  </button>
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setIsWalletModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Change Wallet
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? "Scanning..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* Faucet Notification Banner */}
      {faucetSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{faucetSuccessMsg} Ready to invest in inventory tranches!</span>
        </div>
      )}

      {/* Multi-Wallet Scanner Modal (EIP-6963) */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Select a Wallet</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detected {detectedWallets.length} installed wallet{detectedWallets.length === 1 ? '' : 's'} on your device
                </p>
              </div>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {detectedWallets.length > 0 ? (
                detectedWallets.map((wallet) => (
                  <button
                    key={wallet.info.uuid || wallet.info.rdns}
                    onClick={() => connectSpecificWallet(wallet)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {wallet.info.icon ? (
                        <img
                          src={wallet.info.icon}
                          alt={wallet.info.name}
                          className="w-8 h-8 rounded-lg flex-shrink-0 object-contain p-0.5 bg-slate-900"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white">
                          {wallet.info.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {wallet.info.rdns ? wallet.info.rdns : 'Browser Extension'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Connect &rarr;
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No Web3 wallets detected on this browser. <br />
                    Please install MetaMask, Rabby, or Coinbase Wallet extension.
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-center text-slate-500 pt-2 border-t border-slate-800/80">
              Scanned via EIP-6963 Multi-Provider Standard
            </p>
          </div>
        </div>
      )}

      {/* Global Contract Addresses Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Inventory Registry</p>
          <a
            href={`${EXPLORER_BASE}/address/${deployments.contracts.InventoryRegistry}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 truncate"
          >
            {deployments.contracts.InventoryRegistry}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Global Financing Vault</p>
          <a
            href={`${EXPLORER_BASE}/address/${deployments.contracts.FinancingVault}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 truncate"
          >
            {deployments.contracts.FinancingVault}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Mock USDC Stablecoin</p>
          <a
            href={`${EXPLORER_BASE}/address/${deployments.contracts.MockUSDC}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 truncate"
          >
            {deployments.contracts.MockUSDC}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-medium">Action Encountered an Error</p>
            <p className="text-xs mt-0.5 text-rose-400">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Two-Step Creation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Step 1: Input & DB Storage */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-lg font-semibold text-white">Submit Physical Inventory Details</h2>
            </div>
            <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">
              Off-chain Go & DB
            </span>
          </div>

          <form onSubmit={handleStoreInDB} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Warehouse ID</label>
                <input
                  type="text"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Warehouse Location</label>
                <input
                  type="text"
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Warehouse Facility Name</label>
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* SKU Items List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Inventory Items / SKUs
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add SKU
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="SKU (e.g. GPU-4090)"
                      value={item.sku}
                      onChange={(e) => updateItem(index, 'sku', e.target.value)}
                      required
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      required
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Category"
                      value={item.category}
                      onChange={(e) => updateItem(index, 'category', e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Unit Price ($)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Batch No</span>
                      <input
                        type="text"
                        value={item.batch_number}
                        onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    {items.length > 1 && (
                      <div className="flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Document Verification */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Warehouse Audit Proof
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Document Name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
                <input
                  type="text"
                  placeholder="IPFS URI"
                  value={docUri}
                  onChange={(e) => setDocUri(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>
            </div>

            {/* Submit to DB Button */}
            <button
              type="submit"
              disabled={isSubmittingDB}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingDB ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Storing in Database & Generating Hash...
                </>
              ) : (
                <>
                  Validate & Store in Database
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Step 2: Confirmation & On-Chain Trigger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-lg font-semibold text-white">Trigger Blockchain Anchor</h2>
              </div>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">
                Ethers.js & Wallet
              </span>
            </div>

            {dbResult ? (
              <div className="space-y-5">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Inventory successfully verified & stored in DB!</span>
                </div>

                <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs space-y-2.5 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-sans">Inventory ID (bytes32):</span>
                    <p className="text-indigo-400 break-all select-all">{dbResult.inventory_id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-sans">Canonical Record Hash:</span>
                    <p className="text-amber-400 break-all select-all">{dbResult.canonical_record_hash}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-sans">Target Contract:</span>
                    <p className="text-slate-300 break-all">{dbResult.blockchain_call.contract_address}</p>
                  </div>
                </div>

                {txSuccess ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Registration Mined on Whitechain!
                    </p>
                    <a
                      href={`${EXPLORER_BASE}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 break-all"
                    >
                      {txHash}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={handleTriggerTx}
                    disabled={isSigningTx}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSigningTx ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Prompting {walletName || "Wallet"} / Broadcasting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        Sign & Register with {walletName || "Wallet"}
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Warehouse className="w-8 h-8 mx-auto mb-2.5 opacity-40" />
                Fill the form on the left and click <br />
                <span className="text-slate-400 font-medium">"Validate & Store in Database"</span> to generate <br />
                the canonical hash and enable on-chain signing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tokenization / Deploy ERC20 Modal */}
      {selectedInventoryForTokenize && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-semibold text-white">Deploy InventoryERC20 Token</h3>
                  <p className="text-xs text-slate-400">
                    Fractional financing tranche for {selectedInventoryForTokenize.warehouse_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInventoryForTokenize(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deployedTokenResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    InventoryERC20 Deployed & Registered in Vault!
                  </p>
                  <div className="text-xs font-mono space-y-1.5 pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-sans">Token Contract:</span>
                      <a
                        href={`${EXPLORER_BASE}/address/${deployedTokenResult.tokenAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 break-all"
                      >
                        {deployedTokenResult.tokenAddress}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-sans">Vault Registration Tx:</span>
                      <a
                        href={`${EXPLORER_BASE}/tx/${deployedTokenResult.vaultTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 break-all"
                      >
                        {deployedTokenResult.vaultTxHash}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedInventoryForTokenize(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Token Name</label>
                    <input
                      type="text"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Token Symbol</label>
                    <input
                      type="text"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Capital Target (USDC)</label>
                    <input
                      type="number"
                      value={targetCapital}
                      onChange={(e) => setTargetCapital(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Token Price (USDC)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tokenPrice}
                      onChange={(e) => setTokenPrice(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Advance Rate (%)</label>
                    <input
                      type="number"
                      value={advanceRate}
                      onChange={(e) => setAdvanceRate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Calculated Token Supply:</span>
                    <span className="text-slate-200 font-mono">
                      {(parseFloat(targetCapital || 0) / parseFloat(tokenPrice || 1)).toLocaleString()} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Issuer Capital Advance:</span>
                    <span className="text-emerald-400 font-mono">
                      ${((parseFloat(targetCapital || 0) * parseFloat(advanceRate || 0)) / 100).toLocaleString()} USDC
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDeployToken}
                  disabled={isDeployingToken}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeployingToken ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Deploying ERC20 & Initializing Vault...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      Deploy ERC20 via ContractFactory
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invest / Buy Tokens Modal */}
      {selectedInventoryForInvest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-semibold text-white">Invest & Buy Inventory Tokens</h3>
                  <p className="text-xs text-slate-400">
                    Deposit Mock USDC into Financing Vault
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInventoryForInvest(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {investSuccessResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Investment Confirmed! Tokens Minted!
                  </p>
                  <div className="text-xs font-mono space-y-1.5 pt-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Deposited:</span>
                      <span className="text-white">${investSuccessResult.amountUSDC} USDC</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tokens Received:</span>
                      <span className="text-emerald-400 font-semibold">{investSuccessResult.tokensReceived} Tokens</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 text-[10px] uppercase font-sans">Deposit Transaction:</span>
                      <a
                        href={`${EXPLORER_BASE}/tx/${investSuccessResult.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 break-all"
                      >
                        {investSuccessResult.txHash}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedInventoryForInvest(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Tranche Token:</span>
                    <span className="text-slate-200 font-mono">
                      {selectedInventoryForInvest.inventory_token_address?.slice(0, 10)}...
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Token Price:</span>
                    <span className="text-white font-mono">${selectedInventoryForInvest.token_price || 1} USDC</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Your USDC Balance:</span>
                    <span className="text-emerald-400 font-mono">${usdcBalance} USDC</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Investment Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    You will receive: <span className="text-emerald-400 font-semibold font-mono">
                      {(parseFloat(investAmount || 0) / parseFloat(selectedInventoryForInvest.token_price || 1)).toLocaleString()} Tokens
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleInvestInTranche}
                  disabled={isInvesting || parseFloat(investAmount || 0) <= 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isInvesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {investStep === "verifying_allowlist" ? "Verifying KYC Allowlist..." :
                        investStep === "approving_usdc" ? "Approving USDC Allowance..." :
                          "Depositing into Vault..."}
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      Approve & Invest ${investAmount} USDC
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Registered Inventories Live Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Registered Inventories</h3>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {inventories.length} batches
            </span>
          </div>

          <button
            onClick={fetchInventories}
            disabled={isLoadingInventories}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInventories ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {inventories.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No inventory batches registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Inventory ID</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Qty & Valuation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">On-Chain Token / Tx</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {inventories.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="truncate max-w-[150px]" title={inv.inventory_id}>
                        {inv.inventory_id ? `${inv.inventory_id.slice(0, 10)}...${inv.inventory_id.slice(-6)}` : inv.id}
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans block">{inv.warehouse_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans">
                      {inv.warehouse_id}
                      <span className="text-[10px] text-slate-500 block">{inv.warehouse_location}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-sans">
                      <p>{inv.total_initial_quantity} units</p>
                      <p className="text-[10px] text-emerald-400 font-mono">
                        {inv.valuation > 0 ? `$${inv.valuation.toLocaleString()} appraised` : 'Pending valuation'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${inv.status === 'REGISTERED' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        inv.status === 'APPROVED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          inv.status === 'FINANCED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-800 text-slate-400'
                        }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.inventory_token_address ? (
                        <div>
                          <span className="text-[10px] text-slate-500 block font-sans">Token Address:</span>
                          <a
                            href={`${EXPLORER_BASE}/address/${inv.inventory_token_address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            {inv.inventory_token_address.slice(0, 8)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : inv.registration_tx_hash ? (
                        <div>
                          <span className="text-[10px] text-slate-500 block font-sans">Registry Tx:</span>
                          <a
                            href={`${EXPLORER_BASE}/tx/${inv.registration_tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            {inv.registration_tx_hash.slice(0, 8)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-sans">Pending Tx</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      {inv.status === 'REGISTERED' && (
                        <button
                          onClick={() => handleApproveInspection(inv)}
                          disabled={isInspecting}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Inspect & Approve
                        </button>
                      )}

                      {inv.status === 'APPROVED' && (
                        <button
                          onClick={() => openTokenizeModal(inv)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center gap-1 ml-auto"
                        >
                          <Coins className="w-3 h-3" />
                          Deploy ERC20
                        </button>
                      )}

                      {inv.status === 'FINANCED' && (
                        <button
                          onClick={() => openInvestModal(inv)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-1 ml-auto"
                        >
                          <CreditCard className="w-3 h-3" />
                          Buy Tokens
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
