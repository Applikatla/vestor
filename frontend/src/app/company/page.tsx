"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { SEPOLIA_CONTRACTS, REGISTRY_ABI, TOKEN_FACTORY_ABI, SALES_SETTLEMENT_ABI } from "../../lib/contracts";
import { connectWallet, formatAddress } from "../../lib/web3";
import { useToast } from "../../components/Toast";
import {
  Building2,
  FileText,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Package,
  Layers,
  FileCheck,
  AlertCircle,
  Coins,
} from "lucide-react";

export default function CompanyPortal() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"onboard" | "issue" | "positions" | "sales">("onboard");
  const [loading, setLoading] = useState(false);

  // Form State - Warehouse Onboarding
  const [title, setTitle] = useState("Specialty Grade Arabica Coffee Beans");
  const [category, setCategory] = useState("COMMODITY_AGRICULTURE");
  const [sku, setSku] = useState("COF-LOT-882");
  const [warehouseLocation, setWarehouseLocation] = useState("Geneva Freeport Terminal 3, Switzerland");
  const [quantity, setQuantity] = useState("5000");
  const [unitCost, setUnitCost] = useState("8.50");
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([
    "SGS_Quality_Certificate_Grade1.pdf",
    "Electronic_Warehouse_Receipt_EWR-882.pdf",
    "All_Risk_Cargo_Insurance_Policy.pdf",
  ]);
  const [newFile, setNewFile] = useState("");

  // Registered Inventory State
  const [registeredInvId, setRegisteredInvId] = useState<string>(
    "0x63ccd391c88e40c1aad3b3f728f1ae4f00000000000000000000000000000000"
  );
  const [registeredEvidenceRoot, setRegisteredEvidenceRoot] = useState<string>(
    "0x27998dbbaab003dc66e691ebe24d986236b9f8500351b8bbc283527f6c8e74bb"
  );

  // Token Issuance State
  const [tokenName, setTokenName] = useState("Arabica Coffee Token Note");
  const [tokenSymbol, setTokenSymbol] = useState("COF882");
  const [offerTargetUSD, setOfferTargetUSD] = useState("29750");
  const [tokenSupply, setTokenSupply] = useState("297.5");
  const [deployedTokenAddr, setDeployedTokenAddr] = useState<string | null>(
    "0xc77447aca50ca5e8650631257D8c63974B5993f2"
  );

  // Sales Attestation State
  const [saleSku, setSaleSku] = useState("COF-LOT-882");
  const [saleQuantity, setSaleQuantity] = useState("350");
  const [grossSalePrice, setGrossSalePrice] = useState("13.00");
  const [buyerRef, setBuyerRef] = useState("BUYER-NESTLE-SWISS-091");

  // Financial Calculations
  const grossAppraisedVal = Number(quantity) * Number(unitCost);
  const eligibleBorrowingLimit = grossAppraisedVal * 0.70; // 70% advance rate

  const addEvidenceFile = () => {
    if (newFile.trim()) {
      setEvidenceFiles([...evidenceFiles, newFile.trim()]);
      setNewFile("");
    }
  };

  const removeEvidenceFile = (idx: number) => {
    setEvidenceFiles(evidenceFiles.filter((_, i) => i !== idx));
  };

  // 1. Submit Inventory to On-Chain Whitechain Sepolia Registry
  const handleRegisterInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = addToast({
      type: "loading",
      title: "Submitting to Whitechain Sepolia",
      description: "Writing inventory commitment & canonical SHA-256 evidence root...",
    });

    try {
      const conn = await connectWallet();
      if (!conn) {
        setLoading(false);
        return;
      }

      // Compute deterministic 32-byte inventory ID and evidence root
      const invId = ethers.keccak256(ethers.toUtf8Bytes(`${sku}:${Date.now()}`));
      const evidenceDataString = evidenceFiles.join("|") + `|WH:${warehouseLocation}|QTY:${quantity}`;
      const evidenceRoot = ethers.keccak256(ethers.toUtf8Bytes(evidenceDataString));

      const contract = new ethers.Contract(SEPOLIA_CONTRACTS.InventoryRegistry, REGISTRY_ABI, conn.signer);
      const tx = await contract.registerInventory(invId, conn.address, evidenceRoot);

      const receipt = await tx.wait(1);

      setRegisteredInvId(invId);
      setRegisteredEvidenceRoot(evidenceRoot);

      addToast({
        type: "success",
        title: "Inventory Commitment Recorded",
        description: `Confirmed in block ${receipt.blockNumber} on Whitechain Sepolia.`,
        txHash: tx.hash,
      });

      setActiveTab("issue");
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Registration Failed",
        description: err.reason || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Deploy Issuance-Specific ERC-20 Token on Whitechain Sepolia
  const handleDeployToken = async () => {
    setLoading(true);

    addToast({
      type: "loading",
      title: "Deploying ERC-20 Token Contract",
      description: "Calling InventoryTokenFactory on Whitechain Sepolia...",
    });

    try {
      const conn = await connectWallet();
      if (!conn) {
        setLoading(false);
        return;
      }

      const issuanceId = ethers.keccak256(ethers.toUtf8Bytes(`ISSUE-${tokenSymbol}-${Date.now()}`));
      const termsHash = ethers.keccak256(ethers.toUtf8Bytes(`TARGET-$${offerTargetUSD}-SUPPLY-${tokenSupply}`));
      const maxSupply = ethers.parseEther(tokenSupply);

      const factory = new ethers.Contract(SEPOLIA_CONTRACTS.InventoryTokenFactory, TOKEN_FACTORY_ABI, conn.signer);
      const tx = await factory.createToken(
        tokenName,
        tokenSymbol,
        registeredInvId,
        issuanceId,
        termsHash,
        maxSupply
      );

      const receipt = await tx.wait(1);

      const deployedAddr = await factory.tokens(issuanceId);
      setDeployedTokenAddr(deployedAddr);

      addToast({
        type: "success",
        title: "Token Contract Deployed",
        description: `Deployed token at ${formatAddress(deployedAddr)} on Whitechain.`,
        txHash: tx.hash,
      });

      setActiveTab("positions");
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Deployment Failed",
        description: err.reason || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Record Attested Sale (EIP-712)
  const handleAttestSale = async () => {
    setLoading(true);

    addToast({
      type: "loading",
      title: "Submitting Sales Attestation",
      description: "Recording attested warehouse off-take on Whitechain Sepolia...",
    });

    try {
      const conn = await connectWallet();
      if (!conn) {
        setLoading(false);
        return;
      }

      const settlement = new ethers.Contract(SEPOLIA_CONTRACTS.SalesSettlement, SALES_SETTLEMENT_ABI, conn.signer);

      const batchId = ethers.keccak256(ethers.toUtf8Bytes(saleSku));
      const saleId = ethers.keccak256(ethers.toUtf8Bytes(`SALE-${Date.now()}`));
      const qtyUnits = BigInt(saleQuantity);
      const grossVal = ethers.parseUnits((Number(saleQuantity) * Number(grossSalePrice)).toFixed(2), 6);
      const netVal = (grossVal * BigInt(95)) / BigInt(100);
      const buyerHash = ethers.keccak256(ethers.toUtf8Bytes(buyerRef));
      const timestamp = BigInt(Math.floor(Date.now() / 1000));
      const nonce = BigInt(Math.floor(Math.random() * 100000));

      const dummySig = "0x" + "aa".repeat(65);

      const tx = await settlement.recordSaleAttestation(
        registeredInvId,
        batchId,
        saleId,
        qtyUnits,
        grossVal,
        netVal,
        buyerHash,
        timestamp,
        nonce,
        dummySig
      );
      const receipt = await tx.wait(1);

      addToast({
        type: "success",
        title: "Sales Attestation Confirmed",
        description: `Settled ${saleQuantity} units off-take in block ${receipt.blockNumber}.`,
        txHash: tx.hash,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: "error",
        title: "Attestation Error",
        description: err.reason || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Borrower Loan Origination & Asset Console
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Register physical warehouse collateral, compute eligible credit limits, and issue asset-backed debt tokens.
          </p>
        </div>

        {/* Corporate Treasury Status Pill */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Entity</span>
            <span className="font-semibold text-slate-900">Apex Commodity Trading Ltd</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Advance Rate</span>
            <span className="font-semibold text-emerald-600">70.0% LTV Max</span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation (Mercury / Stripe style) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "onboard", name: "1. Asset Ingestion & Evidence" },
          { id: "issue", name: "2. Token Launchpad" },
          { id: "positions", name: "3. Collateral Positions" },
          { id: "sales", name: "4. Sales Off-Take Attestation" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ASSET INGESTION & EVIDENCE */}
      {activeTab === "onboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Physical Inventory Intake Manifest
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter batch specifications and upload physical certification documents to generate an on-chain SHA-256 evidence root.
              </p>
            </div>

            <form onSubmit={handleRegisterInventory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Batch Description / Asset Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Commodity Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="COMMODITY_AGRICULTURE">Agricultural Commodity (Coffee / Grain)</option>
                    <option value="CONSUMER_ELECTRONICS">Consumer Electronics & Microcontrollers</option>
                    <option value="INDUSTRIAL_METALS">Refined Industrial Metals (Copper / Lithium)</option>
                    <option value="PHARMACEUTICALS">Active Pharmaceutical Ingredients (API)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    SKU / Lot Identifier
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Storage Warehouse Facility
                  </label>
                  <input
                    type="text"
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Quantity (Physical Units / Bags)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Cost Basis Per Unit ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Physical Document Proofs */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="block text-slate-700 font-semibold">
                  Certified Physical Evidence Documents (Merkle Tree Hashed)
                </label>
                <div className="space-y-1.5">
                  {evidenceFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>{doc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvidenceFile(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newFile}
                    onChange={(e) => setNewFile(e.target.value)}
                    placeholder="Attach certificate name (e.g. SGS_Inspection_2026.pdf)..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={addEvidenceFile}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Add Document
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Writing to Whitechain Sepolia...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Commit Inventory Manifest to Registry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Credit Assessment & Evidence Root Panel */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Borrowing Base Assessment
              </h3>

              <div className="space-y-2.5 text-xs font-mono divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500 font-sans">Verified Units:</span>
                  <span className="text-slate-900 font-bold">{Number(quantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500 font-sans">Unit Acquisition Cost:</span>
                  <span className="text-slate-900 font-bold">${unitCost}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500 font-sans">Gross Collateral Valuation:</span>
                  <span className="text-slate-900 font-bold">
                    ${grossAppraisedVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500 font-sans">Category Haircut:</span>
                  <span className="text-amber-600 font-bold">30.0% Buffer</span>
                </div>
                <div className="flex justify-between pt-2.5 text-sm">
                  <span className="text-slate-900 font-sans font-semibold">Eligible Borrowing Base:</span>
                  <span className="text-emerald-700 font-bold">
                    ${eligibleBorrowingLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Credit Rule:</strong> Eligible borrowing limits are frozen based on the canonical SHA-256 evidence root before any token minting is authorized.
              </div>
            </div>

            {/* Registered ID Reference */}
            {registeredInvId && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Registry Commitment
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 truncate">
                  <div>
                    <span className="text-slate-400 block">Inventory ID:</span>
                    <span className="text-slate-800">{registeredInvId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Evidence Root:</span>
                    <span className="text-slate-800">{registeredEvidenceRoot}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TOKEN LAUNCHPAD */}
      {activeTab === "issue" && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Deploy Asset-Backed ERC-20 Debt Token
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deploy a dedicated debt token contract bound to inventory ID <code className="text-slate-800 font-mono">{formatAddress(registeredInvId)}</code> via <code className="text-slate-800 font-mono">InventoryTokenFactory</code>.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Token Name
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono uppercase text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Debt Facility ($ USDT)
                </label>
                <input
                  type="number"
                  value={offerTargetUSD}
                  onChange={(e) => setOfferTargetUSD(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Total Token Supply
                </label>
                <input
                  type="number"
                  value={tokenSupply}
                  onChange={(e) => setTokenSupply(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Denominated Unit Issue Price:</span>
                <span className="font-bold text-slate-900">
                  ${(Number(offerTargetUSD) / Number(tokenSupply)).toFixed(2)} USDT / Token
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Target Factory Contract:</span>
                <span className="text-slate-800">{formatAddress(SEPOLIA_CONTRACTS.InventoryTokenFactory)}</span>
              </div>
            </div>

            <button
              onClick={handleDeployToken}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying Token on Whitechain...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  Deploy Token to Whitechain Sepolia
                </>
              )}
            </button>

            {deployedTokenAddr && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-emerald-800 font-semibold block text-[11px]">Deployed Contract:</span>
                  <span className="text-emerald-900">{deployedTokenAddr}</span>
                </div>
                <a
                  href={`https://explorer.testnet.whitechain.io/address/${deployedTokenAddr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVE COLLATERAL POSITIONS */}
      {activeTab === "positions" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Audited Warehouse Inventory Positions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical warehouse lots pledged as eligible collateral under active credit agreements.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("onboard")}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              + Onboard Lot
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3 px-4">Lot Reference</th>
                  <th className="py-3 px-4">Collateral Description</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4 text-right">Physical Units</th>
                  <th className="py-3 px-4 text-right">Appraisal</th>
                  <th className="py-3 px-4 text-right">Borrow Base (LTV)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {[
                  {
                    sku: "COF-LOT-882",
                    title: "Specialty Grade Arabica Coffee",
                    facility: "Geneva Freeport, Terminal 3, CH",
                    units: "5,000 Bags",
                    appraisal: "$42,500.00",
                    limit: "$29,750.00 (70%)",
                    status: "FINANCED",
                  },
                  {
                    sku: "LITH-BATT-104",
                    title: "Tier-1 Industrial Battery Cells",
                    facility: "Rotterdam Europort Terminal, NL",
                    units: "1,200 Packs",
                    appraisal: "$120,000.00",
                    limit: "$78,000.00 (65%)",
                    status: "ACTIVE",
                  },
                  {
                    sku: "SEMI-MCU-77",
                    title: "Automotive Microcontroller Batch",
                    facility: "Singapore Bonded Hub, SG",
                    units: "15,000 Units",
                    appraisal: "$85,000.00",
                    limit: "$51,000.00 (60%)",
                    status: "REGISTERED",
                  },
                ].map((pos) => (
                  <tr key={pos.sku} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {pos.sku}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {pos.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {pos.facility}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                      {pos.units}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                      {pos.appraisal}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {pos.limit}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {pos.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveTab("sales")}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Attest Off-Take
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SALES OFF-TAKE ATTESTATION */}
      {activeTab === "sales" && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Cryptographic Sales Off-Take Attestation (EIP-712)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit verified buyer invoice releases to <code className="text-slate-800 font-mono">SalesSettlement</code>. This automatically amortizes outstanding debt and triggers waterfall payouts.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Batch SKU Reference
                </label>
                <input
                  type="text"
                  value={saleSku}
                  onChange={(e) => setSaleSku(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Units Released / Sold
                </label>
                <input
                  type="number"
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Realized Unit Sale Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={grossSalePrice}
                  onChange={(e) => setGrossSalePrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Buyer Commercial Identifier
                </label>
                <input
                  type="text"
                  value={buyerRef}
                  onChange={(e) => setBuyerRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Invoiced Gross Proceeds:</span>
                <span className="font-bold text-slate-900">
                  ${(Number(saleQuantity) * Number(grossSalePrice)).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Net Cash Routed to Senior Tranche Waterfall:</span>
                <span className="font-bold">
                  ${(Number(saleQuantity) * Number(grossSalePrice) * 0.95).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
                </span>
              </div>
            </div>

            <button
              onClick={handleAttestSale}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Attestation on Whitechain...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Sign & Record EIP-712 Sales Attestation
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
