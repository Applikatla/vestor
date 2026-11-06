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
  CreditCard,
  Droplets,
  Clock,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  ShoppingBag,
  BarChart3,
  Store,
  ArrowUpRight
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
  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);
  const [faucetRecipientInput, setFaucetRecipientInput] = useState("");
  const [faucetInfo, setFaucetInfo] = useState(null);
  const [faucetCheckingEligibility, setFaucetCheckingEligibility] = useState(false);
  const [faucetEligibilityError, setFaucetEligibilityError] = useState("");
  const [faucetClaimResult, setFaucetClaimResult] = useState(null);

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

  // Admin & User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("vestor_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loginPortalMode, setLoginPortalMode] = useState("investor"); // 'investor' | 'admin'
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      const userData = data.user || { username: loginUsername.trim(), role: "ADMIN", name: "Platform Administrator" };
      setCurrentUser(userData);
      localStorage.setItem("vestor_auth_user", JSON.stringify(userData));
    } catch (err) {
      console.error("Login error:", err);
      if (loginUsername.trim() === "admin" && loginPassword.trim() === "admin@123") {
        const userData = { username: "admin", role: "ADMIN", name: "Platform Administrator" };
        setCurrentUser(userData);
        localStorage.setItem("vestor_auth_user", JSON.stringify(userData));
      } else {
        setLoginError(err.message || "Invalid credentials. Default admin user: admin / pass: admin@123");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEnterAsInvestor = (investorAddr) => {
    const target = investorAddr || account || "0x1b61bea7ddcc82210013a3b9c81a36484358a02a";
    const investorUser = {
      role: "INVESTOR",
      address: target,
      name: `Investor (${target.slice(0, 6)}...${target.slice(-4)})`
    };
    setCurrentUser(investorUser);
    localStorage.setItem("vestor_auth_user", JSON.stringify(investorUser));
    fetchUserHoldings(target, null, inventories);
  };

  const handleSwitchToMarketplace = () => {
    const target = account || "0x1b61bea7ddcc82210013a3b9c81a36484358a02a";
    const investorUser = {
      role: "INVESTOR",
      address: target,
      name: `Investor (${target.slice(0, 6)}...${target.slice(-4)})`
    };
    setCurrentUser(investorUser);
    localStorage.setItem("vestor_auth_user", JSON.stringify(investorUser));
    fetchUserHoldings(target, null, inventories);
  };

  const handleSwitchToAdmin = () => {
    const adminUser = {
      username: "admin",
      role: "ADMIN",
      name: "Platform Administrator"
    };
    setCurrentUser(adminUser);
    localStorage.setItem("vestor_auth_user", JSON.stringify(adminUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("vestor_auth_user");
  };

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

      if (!currentUser || currentUser.role === "INVESTOR") {
        const investorUser = {
          role: "INVESTOR",
          address: userAddress,
          name: `Investor (${userAddress.slice(0, 6)}...${userAddress.slice(-4)})`
        };
        setCurrentUser(investorUser);
        localStorage.setItem("vestor_auth_user", JSON.stringify(investorUser));
        fetchUserHoldings(userAddress, browserProvider, inventories);
      }

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
        rawProvider.on("accountsChanged", async (newAccounts) => {
          if (newAccounts.length === 0) {
            disconnectWallet();
          } else {
            const nextAccount = newAccounts[0];
            setAccount(nextAccount);
            try {
              const [bal, usdcContract] = await Promise.all([
                browserProvider.getBalance(nextAccount),
                new ethers.Contract(deployments.contracts.MockUSDC, MockUSDCArtifact.abi, browserProvider)
              ]);
              setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
              const uBal = await usdcContract.balanceOf(nextAccount);
              setUsdcBalance(parseFloat(ethers.formatUnits(uBal, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            } catch (err) {
              console.error("Account update balance error:", err);
            }
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

  // Claim 10,000 Mock USDC from Faucet (Gasless via Backend + Auto Gas Drip)
  const handleClaimFaucet = async () => {
    if (!account) {
      setIsWalletModalOpen(true);
      return;
    }
    setIsClaimingFaucet(true);
    setErrorMessage("");
    setFaucetSuccessMsg("");

    try {
      // 1. Gasless faucet call via platform backend (platform pays gas & drips testnet WBT if needed)
      const res = await fetch(`${API_BASE}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: account }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Backend faucet failed");
      }

      // 2. Refresh balances
      const rawProvider = activeProvider || window.ethereum;
      const provider = new ethers.BrowserProvider(rawProvider);
      const [bal, usdcContract] = await Promise.all([
        provider.getBalance(account),
        new ethers.Contract(deployments.contracts.MockUSDC, MockUSDCArtifact.abi, provider)
      ]);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
      const uBal = await usdcContract.balanceOf(account);
      setUsdcBalance(parseFloat(ethers.formatUnits(uBal, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

      setFaucetSuccessMsg("🎉 Successfully received 10,000 Mock USDC (and testnet WBT gas)!");
      setTimeout(() => setFaucetSuccessMsg(""), 6000);
    } catch (err) {
      console.warn("Gasless faucet fallback to direct on-chain mint:", err);
      try {
        const rawProvider = activeProvider || window.ethereum;
        const provider = new ethers.BrowserProvider(rawProvider);
        const signer = await provider.getSigner();

        const usdcContract = new ethers.Contract(
          deployments.contracts.MockUSDC,
          MockUSDCArtifact.abi,
          signer
        );

        const mintAmount = ethers.parseUnits("10000", 6);
        const tx = await usdcContract.mint(account, mintAmount);
        await tx.wait();

        const [bal, uBal] = await Promise.all([
          provider.getBalance(account),
          usdcContract.balanceOf(account)
        ]);
        setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
        setUsdcBalance(parseFloat(ethers.formatUnits(uBal, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

        setFaucetSuccessMsg("🎉 Successfully minted 10,000 Mock USDC!");
        setTimeout(() => setFaucetSuccessMsg(""), 6000);
      } catch (directErr) {
        console.error("Direct mint failed:", directErr);
        setErrorMessage(directErr.reason || directErr.message || "Failed to claim Mock USDC");
      }
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  // Google-Style Faucet Hub Controls
  const openFaucetModal = (prefillAddr = "") => {
    const target = prefillAddr || account || "";
    setFaucetRecipientInput(target);
    setFaucetClaimResult(null);
    setFaucetEligibilityError("");
    setIsFaucetModalOpen(true);
    fetchFaucetInfo(target);
  };

  const fetchFaucetInfo = async (addr = "") => {
    setFaucetCheckingEligibility(true);
    try {
      const url = addr ? `${API_BASE}/faucet/info?address=${encodeURIComponent(addr)}` : `${API_BASE}/faucet/info`;
      const res = await fetch(url);
      const data = await res.json();
      setFaucetInfo(data);
      if (data.eligibility && !data.eligibility.eligible) {
        const secs = data.eligibility.seconds_remaining;
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        setFaucetEligibilityError(`Daily limit reached for this address. You can request again in ${hrs}h ${mins}m.`);
      } else {
        setFaucetEligibilityError("");
      }
    } catch (err) {
      console.error("Failed to load faucet info:", err);
    } finally {
      setFaucetCheckingEligibility(false);
    }
  };

  const handleExecuteClaimFaucet = async () => {
    if (!faucetRecipientInput || !ethers.isAddress(faucetRecipientInput)) {
      setFaucetEligibilityError("Please enter a valid EVM address (0x...)");
      return;
    }
    setIsClaimingFaucet(true);
    setFaucetEligibilityError("");
    setFaucetClaimResult(null);

    try {
      const res = await fetch(`${API_BASE}/faucet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: faucetRecipientInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFaucetEligibilityError(data.error || "Faucet claim failed");
        return;
      }

      setFaucetClaimResult(data);

      // If claiming for connected account, refresh wallet balances!
      if (account && faucetRecipientInput.toLowerCase() === account.toLowerCase()) {
        const rawProvider = activeProvider || window.ethereum;
        if (rawProvider) {
          const provider = new ethers.BrowserProvider(rawProvider);
          const [bal, usdcContract] = await Promise.all([
            provider.getBalance(account),
            new ethers.Contract(deployments.contracts.MockUSDC, MockUSDCArtifact.abi, provider)
          ]);
          setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
          const uBal = await usdcContract.balanceOf(account);
          setUsdcBalance(parseFloat(ethers.formatUnits(uBal, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      }

      // Refresh eligibility info for cooldown update
      fetchFaucetInfo(faucetRecipientInput.trim());
    } catch (err) {
      console.error("Claim error:", err);
      setFaucetEligibilityError(err.message || "Failed to dispense from faucet");
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  const handleResetCooldown = async () => {
    if (!faucetRecipientInput) return;
    try {
      const res = await fetch(`${API_BASE}/faucet/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: faucetRecipientInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFaucetEligibilityError("");
        fetchFaucetInfo(faucetRecipientInput.trim());
      }
    } catch (e) {
      console.error("Reset error:", e);
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
  const handleAnchorInventory = async (targetInv) => {
    const inv = targetInv || dbResult;
    if (!inv) return;
    setIsSigningTx(true);
    setErrorMessage("");

    setDbResult({
      id: inv.id,
      inventory_id: inv.inventory_id,
      canonical_record_hash: inv.canonical_record_hash,
      issuer_address: inv.issuer_address || account,
      warehouse_id: inv.warehouse_id,
      warehouse_name: inv.warehouse_name,
      blockchain_call: {
        contract_address: deployments.contracts.InventoryRegistry,
        function: "registerInventory(bytes32,bytes32,address)",
      }
    });

    try {
      const rawProvider = activeProvider || window.ethereum;
      if (!rawProvider) throw new Error("No Web3 wallet found. Please connect your wallet first.");
      const provider = new ethers.BrowserProvider(rawProvider);
      const signer = await provider.getSigner();

      const registryContract = new ethers.Contract(
        deployments.contracts.InventoryRegistry,
        InventoryRegistryABI,
        signer
      );

      const issuerAddr = inv.issuer_address || (await signer.getAddress());

      console.log("Broadcasting registerInventory tx on Whitechain Testnet for:", inv.inventory_id);
      const tx = await registryContract.registerInventory(
        inv.inventory_id,
        inv.canonical_record_hash,
        issuerAddr
      );

      setTxHash(tx.hash);
      console.log("Tx broadcasted:", tx.hash);

      await tx.wait();
      setTxSuccess(true);

      // Confirm tx back to Go backend
      await fetch(`${API_BASE}/inventories/${inv.id}/confirm-registration`, {
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

  const handleTriggerTx = () => handleAnchorInventory(dbResult);

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
      await fetchUserHoldings(account, provider);

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
        if (account) {
          fetchUserHoldings(account, null, json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inventories:", err);
    } finally {
      setIsLoadingInventories(false);
    }
  };

  // Investor Portfolio State
  const [userHoldings, setUserHoldings] = useState([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);

  const fetchUserHoldings = async (userAddr, prov, invList) => {
    const targetAddr = userAddr || account;
    if (!targetAddr) return;
    setIsLoadingHoldings(true);
    try {
      const p = prov || new ethers.BrowserProvider(activeProvider || window.ethereum);
      const list = invList || inventories;
      const holdings = [];

      for (const inv of list) {
        if (inv.status === 'FINANCED' && inv.inventory_token_address) {
          try {
            const tokenContract = new ethers.Contract(
              inv.inventory_token_address,
              InventoryERC20Artifact.abi,
              p
            );
            const bal = await tokenContract.balanceOf(targetAddr);
            const tokenBal = parseFloat(ethers.formatUnits(bal, 18));
            if (tokenBal > 0) {
              const price = parseFloat(inv.token_price || 1);
              const currentValue = tokenBal * price;
              const projectedYield = currentValue * 0.12; // 12% projected APY
              holdings.push({
                inventoryId: inv.inventory_id,
                warehouseName: inv.warehouse_name || inv.warehouse_id,
                warehouseLocation: inv.warehouse_location || "Mumbai, MH",
                tokenAddress: inv.inventory_token_address,
                balance: tokenBal,
                tokenPrice: price,
                currentValue: currentValue,
                projectedYield: projectedYield,
                status: "ACCRUING_YIELD"
              });
            }
          } catch (e) {
            console.error("Error reading token balance for", inv.inventory_token_address, e);
          }
        }
      }
      setUserHoldings(holdings);
    } catch (err) {
      console.error("Failed to fetch user holdings:", err);
    } finally {
      setIsLoadingHoldings(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  useEffect(() => {
    if (account) {
      fetchUserHoldings(account, null, inventories);
    }
  }, [account, inventories.length]);

  // Computed Portfolio Metrics for Investor
  const totalPortfolioValue = userHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalTokensOwned = userHoldings.reduce((sum, h) => sum + (h.balance || 0), 0);
  const totalProjectedYield = userHoldings.reduce((sum, h) => sum + (h.projectedYield || 0), 0);

  // If not logged in, render the Dual-Portal Gateway (Investor & Admin)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex p-3.5 bg-red-50 text-red-600 rounded-2xl border border-red-200 shadow-sm mb-4">
            <Boxes className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            RWA Inventory Protocol
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Off-chain warehouse verification & on-chain inventory asset financing
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
            {/* Dual Portal Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setLoginPortalMode("investor")}
                className={`flex-1 py-3.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                  loginPortalMode === "investor"
                    ? "border-red-600 text-red-600 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Store className="w-4 h-4" />
                Token Marketplace (Investor)
              </button>
              <button
                type="button"
                onClick={() => setLoginPortalMode("admin")}
                className={`flex-1 py-3.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                  loginPortalMode === "admin"
                    ? "border-red-600 text-red-600 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Portal
              </button>
            </div>

            <div className="py-7 px-6 sm:px-8 space-y-6">
              {loginPortalMode === "investor" ? (
                /* INVESTOR LOGIN WITH WALLET */
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-red-600" />
                      <h2 className="text-lg font-semibold text-slate-900">Investor Marketplace Sign In</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Connect your Web3 wallet to explore listed RWA batches, purchase fractionally backed tokens with USDC, and track active yields.
                    </p>
                  </div>

                  {account ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-red-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Wallet Connected
                          </span>
                          <span className="font-mono text-slate-600">{walletName || "Browser Wallet"}</span>
                        </div>
                        <p className="font-mono text-xs font-bold text-slate-900 break-all select-all">
                          {account}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-red-100 text-xs">
                          <span className="text-slate-500">Mock USDC Balance:</span>
                          <span className="font-mono font-bold text-red-600">${usdcBalance} USDC</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEnterAsInvestor(account)}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Store className="w-4 h-4" />
                        Enter Token Marketplace as Investor
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsWalletModalOpen(true)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                      >
                        Switch / Connect Different Wallet
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                        <Wallet className="w-8 h-8 text-red-600 mx-auto" />
                        <p className="text-xs font-semibold text-slate-800">No Web3 Wallet Connected</p>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          Connect MetaMask, Rabby, or Coinbase Wallet to access your token holdings, purchases, and yield statistics.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsWalletModalOpen(true)}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet to Enter
                      </button>

                      <div className="pt-2 border-t border-slate-100 text-center">
                        <button
                          type="button"
                          onClick={() => handleEnterAsInvestor("0x1b61bea7ddcc82210013a3b9c81a36484358a02a")}
                          className="text-xs text-red-600 hover:text-red-700 font-medium underline cursor-pointer"
                        >
                          Quick Demo Enter as Investor (0x1b61...a02a)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ADMIN LOGIN WITH USERNAME & PASSWORD */
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <h2 className="text-lg font-semibold text-slate-900">Admin Sign In</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your administrative credentials to manage inventory and financing tranches.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Username
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          placeholder="e.g. admin"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-red-500 transition font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-red-500 transition font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Demo Credentials Helper Box */}
                    <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider">
                          Default Credentials
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginUsername("admin");
                            setLoginPassword("admin@123");
                          }}
                          className="text-[10px] text-red-600 hover:text-red-700 font-medium underline cursor-pointer"
                        >
                          Auto-Fill Admin
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-white p-2 rounded-lg border border-red-100 text-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">User</span>
                          admin
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-red-100 text-slate-800">
                          <span className="text-[10px] text-slate-400 font-sans block">Password</span>
                          admin@123
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoggingIn ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In as Administrator
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Whitechain Testnet (Chain ID 1874) &bull; RWA Protocol
          </p>
        </div>
      </div>
    );
  }

  const isInvestor = currentUser?.role === "INVESTOR";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-200">
              <Boxes className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">RWA Inventory Protocol</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Off-chain warehouse verification & on-chain inventory asset tokenization
          </p>
        </div>

        {/* Network & Wallet Controls & Faucet */}
        <div className="flex flex-wrap items-center gap-3">
          {/* User Role Badge & Switcher & Logout */}
          {isInvestor ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs shadow-sm">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-900 font-medium">
                Investor: {currentUser?.address ? `${currentUser.address.slice(0, 6)}...${currentUser.address.slice(-4)}` : (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Marketplace")}
              </span>
              <button
                onClick={handleSwitchToAdmin}
                title="Switch to Admin Portal"
                className="ml-1 text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-emerald-100/60 transition cursor-pointer flex items-center gap-1 font-medium text-[11px]"
              >
                <Shield className="w-3 h-3 text-red-600" />
                <span>Admin View</span>
              </button>
              <button
                onClick={handleLogout}
                title="Exit Marketplace"
                className="text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-100/60 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl text-xs shadow-sm">
              <Shield className="w-3.5 h-3.5 text-red-600" />
              <span className="text-red-900 font-medium">Admin: {currentUser?.username || "admin"}</span>
              <button
                onClick={handleSwitchToMarketplace}
                title="View Investor Marketplace"
                className="ml-1 text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-red-100/60 transition cursor-pointer flex items-center gap-1 font-medium text-[11px]"
              >
                <Store className="w-3 h-3 text-red-600" />
                <span>Marketplace</span>
              </button>
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-100 transition cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Google-Style Faucet Button */}
          <button
            onClick={() => openFaucetModal(account)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm shadow-red-500/10"
          >
            <Droplets className="w-3.5 h-3.5 text-red-600" />
            <span>Testnet Faucet</span>
            <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">Daily</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-700 font-medium">Whitechain Testnet (1874)</span>
          </div>

          {account ? (
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                {walletIcon ? (
                  <img src={walletIcon} alt={walletName} className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                )}
                <div className="text-left">
                  <p className="text-xs font-mono font-medium text-slate-800 flex items-center gap-1">
                    {account.slice(0, 6)}...{account.slice(-4)}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {balance} WBT &bull; <span className="text-red-600 font-semibold">${usdcBalance} USDC</span>
                  </p>
                </div>
              </button>

              {/* Account Dropdown Menu */}
              {showAccountDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100 text-xs">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Connected via</p>
                    <p className="text-slate-800 font-medium">{walletName || "Browser Wallet"}</p>
                    <p className="text-[10px] text-red-600 font-mono mt-0.5">${usdcBalance} USDC</p>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    {copied ? "Copied to clipboard!" : "Copy Address"}
                  </button>
                  <button
                    onClick={switchAccount}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    Switch / Add Account
                  </button>
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setIsWalletModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition"
                  >
                    <Wallet className="w-3.5 h-3.5 text-slate-500" />
                    Change Wallet
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? "Scanning..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      {/* Faucet Notification Banner */}
      {faucetSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{faucetSuccessMsg} Ready to invest in inventory tranches!</span>
        </div>
      )}

      {/* Global Contract Addresses Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Inventory Registry</p>
          <a
            href={`${EXPLORER_BASE}/address/${deployments.contracts.InventoryRegistry}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-red-600 hover:text-red-700 flex items-center gap-1 mt-1 truncate font-medium"
          >
            {deployments.contracts.InventoryRegistry}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Global Financing Vault</p>
          <a
            href={`${EXPLORER_BASE}/address/${deployments.contracts.FinancingVault}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-red-600 hover:text-red-700 flex items-center gap-1 mt-1 truncate font-medium"
          >
            {deployments.contracts.FinancingVault}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Mock USDC Stablecoin</p>
          <a
            href={`${EXPLORER_BASE}/address/${deployments.contracts.MockUSDC}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-red-600 hover:text-red-700 flex items-center gap-1 mt-1 truncate font-medium"
          >
            {deployments.contracts.MockUSDC}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Action Encountered an Error</p>
            <p className="text-xs mt-0.5 text-red-700 break-all">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INVESTOR VIEW: PORTFOLIO DASHBOARD & LIVE TOKEN MARKETPLACE    */}
      {/* ============================================================== */}
      {isInvestor ? (
        <div className="space-y-8">
          {/* Investor Hero Banner */}
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-red-600/15 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tokenized Real-World Asset Financing</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Investor Portfolio & Token Marketplace
              </h1>
              <p className="text-red-100 text-sm max-w-2xl leading-relaxed">
                Purchase fractional warehouse inventory tokens backed by audited physical goods on Whitechain.
                Track token balances, daily yield accruals, and projected profit distributions in real time.
              </p>
            </div>
          </div>

          {/* 4 Financial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Portfolio Value */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Total Portfolio Value</span>
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500">
                Across {userHoldings.length} active inventory tranche{userHoldings.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* 2. Total Tokens Owned */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Inventory Tokens Held</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                {totalTokensOwned.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500">
                Verified on Whitechain (ERC-20)
              </p>
            </div>

            {/* 3. Accrued / Projected Profit */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Projected Annual Profit</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-600 flex items-center gap-1">
                +${totalProjectedYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>12.0% Fixed Coupon APY</span>
              </div>
            </div>

            {/* 4. Buying Power (USDC) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Buying Power (USDC)</span>
                <div className="p-2 bg-slate-50 text-slate-700 rounded-xl">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${usdcBalance}
              </p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Mock USDC</span>
                <button
                  onClick={() => openFaucetModal(account)}
                  className="text-red-600 hover:text-red-700 font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  Get 10k Free &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: My Active Holdings & Profit / Loss */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">My Active Token Holdings & Profit / Loss</h2>
                  <p className="text-xs text-slate-500">
                    Live on-chain token balances and yield tracking for {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "your wallet"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchUserHoldings(account, null, inventories)}
                disabled={isLoadingHoldings}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHoldings ? 'animate-spin' : ''}`} />
                Refresh Holdings
              </button>
            </div>

            {userHoldings.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl bg-slate-50/60 border border-slate-200 border-dashed space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">No Inventory Tokens in Your Wallet Yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You have not purchased any tranche tokens. Check out the Live Token Marketplace below to buy tokens with Mock USDC and start earning 12% APY!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Asset / Warehouse</th>
                      <th className="py-3 px-4">Token Address</th>
                      <th className="py-3 px-4">Tokens Held</th>
                      <th className="py-3 px-4">Unit Price</th>
                      <th className="py-3 px-4">Position Value</th>
                      <th className="py-3 px-4">Est. Annual Profit</th>
                      <th className="py-3 px-4 text-right">Yield Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {userHoldings.map((holding) => (
                      <tr key={holding.tokenAddress} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-900 font-sans">
                          <p className="font-semibold text-slate-900">{holding.warehouseName}</p>
                          <span className="text-[10px] text-slate-500">{holding.warehouseLocation}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <a
                            href={`${EXPLORER_BASE}/address/${holding.tokenAddress}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                          >
                            {holding.tokenAddress.slice(0, 8)}...{holding.tokenAddress.slice(-4)}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold">
                          {holding.balance.toLocaleString()} {holding.tokenSymbol || 'Tokens'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          ${holding.tokenPrice.toFixed(2)} USDC
                        </td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold">
                          ${holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-bold">
                          +${holding.projectedYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Accruing Yield (12% APY)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Live RWA Token Marketplace */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Live RWA Token Marketplace</h2>
                  <p className="text-xs text-slate-500">
                    Explore verified physical inventory tranches and purchase fractional tokens using Mock USDC
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                  {inventories.filter((i) => i.status === "FINANCED").length} Listed Tranches
                </span>
              </div>
            </div>

            {inventories.filter((i) => i.status === "FINANCED").length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl bg-slate-50/60 border border-slate-200 border-dashed space-y-3">
                <Warehouse className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">No Financed Tranches Listed Currently</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  New inventory batches are verified by warehouse inspectors before token deployment. Once an admin approves and deploys an ERC-20 tranche, it will appear here for immediate purchase.
                </p>
                <button
                  onClick={handleSwitchToAdmin}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-red-600/20"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Switch to Admin Portal to Deploy Tranche
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventories
                  .filter((i) => i.status === "FINANCED")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="border border-slate-200 rounded-2xl p-5 hover:border-red-300 transition shadow-sm hover:shadow-md bg-white space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {inv.warehouse_name || inv.warehouse_id}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active Tranche
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{inv.warehouse_location}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-red-50 text-red-600 border border-red-200">
                          12.0% APY
                        </span>
                      </div>

                      {/* Financial specs grid */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-sans block">Valuation</span>
                          <span className="font-semibold text-slate-900">
                            ${inv.valuation ? inv.valuation.toLocaleString() : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-sans block">Token Price</span>
                          <span className="font-semibold text-red-600">${inv.token_price || 1} USDC</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-sans block">Advance Rate</span>
                          <span className="font-semibold text-slate-900">{inv.advance_rate || 75}%</span>
                        </div>
                      </div>

                      {/* Token contract details & Buy Button */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-slate-500 font-mono">
                          <span className="font-sans text-[11px]">Token:</span>
                          <a
                            href={`${EXPLORER_BASE}/address/${inv.inventory_token_address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                          >
                            {inv.inventory_token_address?.slice(0, 8)}...{inv.inventory_token_address?.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* USER TOKEN PURCHASE ACTION */}
                        <button
                          onClick={() => openInvestModal(inv)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Buy Tokens
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* ADMIN VIEW: SUBMIT INVENTORY, ON-CHAIN ANCHOR, & MANAGE TABLE */
        /* ============================================================== */
        <div className="space-y-8">
          {/* Main Two-Step Creation Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Step 1: Input & DB Storage */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">Submit Physical Inventory Details</h2>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                  Off-chain Go & DB
                </span>
              </div>

              <form onSubmit={handleStoreInDB} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Warehouse ID</label>
                    <input
                      type="text"
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Warehouse Location</label>
                    <input
                      type="text"
                      value={warehouseLocation}
                      onChange={(e) => setWarehouseLocation(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Warehouse Facility Name</label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>

                {/* SKU Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Inventory Items / SKUs
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add SKU
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="SKU (e.g. GPU-4090)"
                          value={item.sku}
                          onChange={(e) => updateItem(index, 'sku', e.target.value)}
                          required
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Item Name"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          required
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Category"
                          value={item.category}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
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
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
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
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Batch No</span>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => updateItem(index, 'batch_number', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                          />
                        </div>
                        {items.length > 1 && (
                          <div className="flex justify-end pt-3">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
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
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Warehouse Audit Proof
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Document Name"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                    />
                    <input
                      type="text"
                      placeholder="IPFS URI"
                      value={docUri}
                      onChange={(e) => setDocUri(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Submit to DB Button */}
                <button
                  type="submit"
                  disabled={isSubmittingDB}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
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
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">Trigger Blockchain Anchor</h2>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                    Ethers.js & Wallet
                  </span>
                </div>

                {dbResult ? (
                  <div className="space-y-5">
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Inventory successfully verified & stored in DB!</span>
                    </div>

                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Inventory ID (bytes32):</span>
                        <p className="text-red-600 break-all select-all font-medium">{dbResult.inventory_id}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Canonical Record Hash:</span>
                        <p className="text-slate-900 break-all select-all font-medium">{dbResult.canonical_record_hash}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Target Contract:</span>
                        <p className="text-slate-700 break-all font-medium">{dbResult.blockchain_call.contract_address}</p>
                      </div>
                    </div>

                    {txSuccess ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Registration Mined on Whitechain!
                        </p>
                        <a
                          href={`${EXPLORER_BASE}/tx/${txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-red-600 hover:text-red-700 flex items-center gap-1 break-all font-medium"
                        >
                          {txHash}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={handleTriggerTx}
                        disabled={isSigningTx}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
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
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Warehouse className="w-8 h-8 mx-auto mb-2.5 text-slate-300" />
                    Fill the form on the left and click <br />
                    <span className="text-slate-700 font-medium">"Validate & Store in Database"</span> to generate <br />
                    the canonical hash and enable on-chain signing.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Registered Inventories Live Table (Admin Management) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-semibold text-slate-900">Registered Inventories</h3>
                <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                  {inventories.length} batches
                </span>
              </div>

              <button
                onClick={fetchInventories}
                disabled={isLoadingInventories}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInventories ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {inventories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No inventory batches registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Inventory ID</th>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Qty & Valuation</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">On-Chain Token / Tx</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {inventories.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="truncate max-w-[150px]" title={inv.inventory_id}>
                            {inv.inventory_id ? `${inv.inventory_id.slice(0, 10)}...${inv.inventory_id.slice(-6)}` : inv.id}
                          </div>
                          <span className="text-[10px] text-slate-500 font-sans block">{inv.warehouse_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-sans">
                          {inv.warehouse_id}
                          <span className="text-[10px] text-slate-500 block">{inv.warehouse_location}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-sans">
                          <p>{inv.total_initial_quantity} units</p>
                          <p className="text-[10px] text-red-600 font-mono font-semibold">
                            {inv.valuation > 0 ? `$${inv.valuation.toLocaleString()} appraised` : 'Pending valuation'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inv.status === 'REGISTERED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            inv.status === 'APPROVED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            inv.status === 'FINANCED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
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
                                className="text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
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
                                className="text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                              >
                                {inv.registration_tx_hash.slice(0, 8)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-sans">Pending Tx</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans">
                          {/* PENDING REGISTRATION: Allow anchoring directly from table */}
                          {inv.status === 'PENDING_REGISTRATION' && (
                            <button
                              onClick={() => handleAnchorInventory(inv)}
                              disabled={isSigningTx}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-sm shadow-red-600/20 flex items-center gap-1 ml-auto"
                            >
                              <Wallet className="w-3 h-3" />
                              Sign & Anchor
                            </button>
                          )}

                          {/* REGISTERED: Physical inspection sign-off */}
                          {inv.status === 'REGISTERED' && (
                            <button
                              onClick={() => handleApproveInspection(inv)}
                              disabled={isInspecting}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              Inspect & Approve
                            </button>
                          )}

                          {/* APPROVED: Deploy ERC20 Tranche */}
                          {inv.status === 'APPROVED' && (
                            <button
                              onClick={() => openTokenizeModal(inv)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-sm shadow-red-600/20 flex items-center gap-1 ml-auto"
                            >
                              <Coins className="w-3 h-3" />
                              Deploy ERC20
                            </button>
                          )}

                          {/* FINANCED: Active Tranche (NO BUY TOKENS IN ADMIN VIEW) */}
                          {inv.status === 'FINANCED' && (
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Tranche Active
                              </span>
                            </div>
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
      )}

      {/* ============================================================== */}
      {/* SHARED MODALS                                                  */}
      {/* ============================================================== */}

      {/* Tokenization / Deploy ERC20 Modal (Admin) */}
      {selectedInventoryForTokenize && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Deploy InventoryERC20 Token</h3>
                  <p className="text-xs text-slate-500">
                    Fractional financing tranche for {selectedInventoryForTokenize.warehouse_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInventoryForTokenize(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deployedTokenResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    InventoryERC20 Deployed & Registered in Vault!
                  </p>
                  <div className="text-xs font-mono space-y-1.5 pt-1">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Token Contract:</span>
                      <a
                        href={`${EXPLORER_BASE}/address/${deployedTokenResult.tokenAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 break-all font-medium"
                      >
                        {deployedTokenResult.tokenAddress}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Vault Registration Tx:</span>
                      <a
                        href={`${EXPLORER_BASE}/tx/${deployedTokenResult.vaultTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 break-all font-medium"
                      >
                        {deployedTokenResult.vaultTxHash}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedInventoryForTokenize(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Token Name</label>
                    <input
                      type="text"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Token Symbol</label>
                    <input
                      type="text"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Capital Target (USDC)</label>
                    <input
                      type="number"
                      value={targetCapital}
                      onChange={(e) => setTargetCapital(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Token Price (USDC)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tokenPrice}
                      onChange={(e) => setTokenPrice(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Advance Rate (%)</label>
                    <input
                      type="number"
                      value={advanceRate}
                      onChange={(e) => setAdvanceRate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Calculated Token Supply:</span>
                    <span className="text-slate-900 font-mono font-medium">
                      {(parseFloat(targetCapital || 0) / parseFloat(tokenPrice || 1)).toLocaleString()} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Issuer Capital Advance:</span>
                    <span className="text-red-600 font-mono font-semibold">
                      ${((parseFloat(targetCapital || 0) * parseFloat(advanceRate || 0)) / 100).toLocaleString()} USDC
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDeployToken}
                  disabled={isDeployingToken}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Invest / Buy Tokens Modal (Investor) */}
      {selectedInventoryForInvest && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Invest & Buy Inventory Tokens</h3>
                  <p className="text-xs text-slate-500">
                    Deposit Mock USDC into Financing Vault
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInventoryForInvest(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {investSuccessResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Investment Confirmed! Tokens Minted!
                  </p>
                  <div className="text-xs font-mono space-y-1.5 pt-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Deposited:</span>
                      <span className="text-slate-900 font-medium">${investSuccessResult.amountUSDC} USDC</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tokens Received:</span>
                      <span className="text-red-600 font-semibold">{investSuccessResult.tokensReceived} Tokens</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Deposit Transaction:</span>
                      <a
                        href={`${EXPLORER_BASE}/tx/${investSuccessResult.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 break-all font-medium"
                      >
                        {investSuccessResult.txHash}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedInventoryForInvest(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Tranche Token:</span>
                    <span className="text-slate-900 font-mono font-medium">
                      {selectedInventoryForInvest.inventory_token_address?.slice(0, 10)}...
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Token Price:</span>
                    <span className="text-slate-900 font-mono font-medium">${selectedInventoryForInvest.token_price || 1} USDC</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Your USDC Balance:</span>
                    <span className="text-red-600 font-mono font-semibold">${usdcBalance} USDC</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Investment Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white font-mono"
                    />
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    You will receive: <span className="text-red-600 font-semibold font-mono">
                      {(parseFloat(investAmount || 0) / parseFloat(selectedInventoryForInvest.token_price || 1)).toLocaleString()} Tokens
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleInvestInTranche}
                  disabled={isInvesting || parseFloat(investAmount || 0) <= 0}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Google Cloud Web3 Faucet-Style Modal */}
      {isFaucetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">Whitechain Testnet Faucet</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                      Gas Sponsored
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Google Cloud Web3-style testnet token & gas dispenser
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFaucetModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Faucet Sponsor / Account Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-sans text-[11px] uppercase tracking-wider text-slate-500">Faucet Sponsor Account:</span>
                <span className="text-emerald-600 font-sans text-[10px] flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  100% Free for Users
                </span>
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={`${EXPLORER_BASE}/address/${faucetInfo?.faucet_address || '0x642D2B8a1de2307a1cab2a7b13d57F018d7C02ae'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-600 hover:text-red-700 flex items-center gap-1 truncate max-w-[280px]"
                >
                  {faucetInfo?.faucet_address || '0x642D2B8a1de2307a1cab2a7b13d57F018d7C02ae'}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <span className="text-slate-700 font-medium">
                  {faucetInfo?.faucet_reserve_wbt || '1.82'} WBT reserve
                </span>
              </div>
            </div>

            {/* Package Allocation Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                  <Coins className="w-4 h-4" />
                  <span>Mock USDC</span>
                </div>
                <p className="text-lg font-bold text-slate-900 mt-1">10,000</p>
                <p className="text-[10px] text-slate-500">Stablecoin for testing tranches</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Whitechain Gas</span>
                </div>
                <p className="text-lg font-bold text-slate-900 mt-1">0.05 WBT</p>
                <p className="text-[10px] text-slate-500">Native gas for transactions</p>
              </div>
            </div>

            {/* Address Input & Paste Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Recipient EVM Address
                </label>
                {account && (
                  <button
                    type="button"
                    onClick={() => {
                      setFaucetRecipientInput(account);
                      fetchFaucetInfo(account);
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    Use Connected Wallet ({account.slice(0, 6)}...{account.slice(-4)})
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste or enter 0x address..."
                  value={faucetRecipientInput}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setFaucetRecipientInput(val);
                    if (val.length === 42 && val.startsWith("0x")) {
                      fetchFaucetInfo(val);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition pr-20"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setFaucetRecipientInput(text.trim());
                        fetchFaucetInfo(text.trim());
                      }
                    } catch (e) {
                      console.log("Clipboard read restricted");
                    }
                  }}
                  className="absolute right-2 top-2 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] rounded-lg transition cursor-pointer font-medium"
                >
                  Paste
                </button>
              </div>

              {/* Status Notice / Cooldown Warning */}
              {faucetCheckingEligibility && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                  Checking 24h eligibility...
                </p>
              )}

              {faucetEligibilityError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{faucetEligibilityError}</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Fixed daily policy: 1 claim every 24 hours per recipient address.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetCooldown}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-medium transition cursor-pointer flex-shrink-0 whitespace-nowrap"
                  >
                    Reset Cooldown (Demo)
                  </button>
                </div>
              )}
            </div>

            {/* Success Display */}
            {faucetClaimResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tokens & Gas Successfully Dispatched!
                </p>
                <div className="space-y-1.5 text-xs font-mono pt-1">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>10,000 Mock USDC:</span>
                    <a
                      href={`${EXPLORER_BASE}/tx/${faucetClaimResult.usdc_tx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                    >
                      {faucetClaimResult.usdc_tx.slice(0, 10)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {faucetClaimResult.gas_tx && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>0.05 WBT Gas:</span>
                      <a
                        href={`${EXPLORER_BASE}/tx/${faucetClaimResult.gas_tx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                      >
                        {faucetClaimResult.gas_tx.slice(0, 10)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  {faucetClaimResult.cooldown || "Next claim available in 24 hours."}
                </p>
              </div>
            )}

            {/* Claim Action Button */}
            <button
              onClick={handleExecuteClaimFaucet}
              disabled={isClaimingFaucet || !faucetRecipientInput || (faucetInfo?.eligibility && !faucetInfo.eligibility.eligible)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-sm font-semibold transition shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isClaimingFaucet ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Dispensing 10k USDC & 0.05 WBT (Paying Gas)...
                </>
              ) : (
                <>
                  <Droplets className="w-4 h-4" />
                  Request 10,000 USDC + 0.05 WBT
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Multi-Wallet Scanner Modal (EIP-6963) */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Select a Wallet</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detected {detectedWallets.length} installed wallet{detectedWallets.length === 1 ? '' : 's'} on your device
                </p>
              </div>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
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
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-red-50/60 border border-slate-200 hover:border-red-300 rounded-xl transition group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {wallet.info.icon ? (
                        <img
                          src={wallet.info.icon}
                          alt={wallet.info.name}
                          className="w-8 h-8 rounded-lg flex-shrink-0 object-contain p-0.5 bg-white border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
                          <Wallet className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900 group-hover:text-red-700">
                          {wallet.info.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {wallet.info.rdns ? wallet.info.rdns : 'Browser Extension'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-red-600 font-medium group-hover:translate-x-0.5 transition-transform">
                      Connect &rarr;
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-500">
                    No Web3 wallets detected on this browser. <br />
                    Please install MetaMask, Rabby, or Coinbase Wallet extension.
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-center text-slate-400 pt-2 border-t border-slate-100">
              Scanned via EIP-6963 Multi-Provider Standard
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
