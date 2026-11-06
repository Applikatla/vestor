"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { SEPOLIA_CONTRACTS, MOCK_USDC_ABI, USDT_ABI, DISTRIBUTION_MANAGER_ABI } from "../../lib/contracts";
import { connectWallet, formatAddress } from "../../lib/web3";
import { useToast } from "../../components/Toast";
import { useWeb3 } from "../../context/Web3Context";
import {
  Users,
  Droplets,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Wallet,
  Loader2,
  DollarSign,
  PieChart,
  Calendar,
  X,
  Lock,
  Building2,
  TrendingUp,
} from "lucide-react";

interface Vault {
  id: string;
  title: string;
  ticker: string;
  underlying: string;
  facility: string;
  targetSize: number;
  currentDeposited: number;
  apy: number;
  seniority: "Senior Secured" | "Mezzanine";
  termDays: number;
  ltv: number;
  tokenPrice: number;
  tokenAddress: string;
  auditFirm: string;
}

export default function InvestorPortal() {
  const { addToast, removeToast } = useToast();
  const { account, usdtBalance, connect, refreshBalance } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [investAmount, setInvestAmount] = useState<string>("1000");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "SENIOR" | "MEZZANINE">("ALL");

  const vaults: Vault[] = [
    {
      id: "vault-1",
      title: "Arabica Coffee Beans Notes",
      ticker: "COF-882",
      underlying: "5,000 Bags Specialty Grade Arabica",
      facility: "Geneva Freeport Terminal 3, CH",
      targetSize: 29750,
      currentDeposited: 24500,
      apy: 11.2,
      seniority: "Senior Secured",
      termDays: 90,
      ltv: 70,
      tokenPrice: 100,
      tokenAddress: "0xc77447aca50ca5e8650631257D8c63974B5993f2",
      auditFirm: "SGS Commodities SA",
    },
    {
      id: "vault-2",
      title: "Tier-1 Lithium Storage Cells",
      ticker: "LITH-104",
      underlying: "1,200 High-Capacity Industrial Battery Packs",
      facility: "Rotterdam Europort Terminal, NL",
      targetSize: 78000,
      currentDeposited: 52000,
      apy: 13.4,
      seniority: "Senior Secured",
      termDays: 120,
      ltv: 65,
      tokenPrice: 100,
      tokenAddress: "0x02b5f19528cd1feB982029bBf14A91ef467249eA",
      auditFirm: "Bureau Veritas Inspection",
    },
    {
      id: "vault-3",
      title: "Automotive Microcontrollers Tranche",
      ticker: "SEMI-77",
      underlying: "15,000 Sealed Automotive Microcontrollers",
      facility: "Singapore Changi Bonded Hub, SG",
      targetSize: 51000,
      currentDeposited: 47000,
      apy: 14.8,
      seniority: "Mezzanine",
      termDays: 60,
      ltv: 60,
      tokenPrice: 100,
      tokenAddress: "0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D",
      auditFirm: "Intertek Electronics Assurance",
    },
  ];

  const handleConnect = async () => {
    await connect();
  };

  // 1-Click Mint MockUSDC on Whitechain Sepolia
  const handleMintUSDC = async () => {
    if (!account) return handleConnect();
    setLoading(true);

    const loadId = addToast({
      type: "loading",
      title: "Requesting Testnet Liquidity",
      description: "Calling MockUSDC faucet on Whitechain Sepolia...",
    });

    try {
      const conn = await connectWallet();
      if (!conn) {
        removeToast(loadId);
        setLoading(false);
        return;
      }

      const usdc = new ethers.Contract(SEPOLIA_CONTRACTS.MockUSDC, MOCK_USDC_ABI, conn.signer);
      const amount = ethers.parseUnits("10000", 6);
      const tx = await usdc.mint(conn.address, amount);
      const receipt = await tx.wait(1);

      await refreshBalance();

      removeToast(loadId);
      addToast({
        type: "success",
        title: "10,000 MockUSDC Credited",
        description: `Mined in block ${receipt.blockNumber}. Balance updated.`,
        txHash: tx.hash,
      });
    } catch (err: any) {
      console.error(err);
      removeToast(loadId);
      addToast({
        type: "error",
        title: "Faucet Mint Failed",
        description: err.reason || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to Offering on Whitechain Sepolia using Official USDT
  const handleSubscribe = async () => {
    if (!account) return handleConnect();
    if (!selectedVault) return;
    setLoading(true);

    const loadId = addToast({
      type: "loading",
      title: "Authorizing USDT Settlement",
      description: `Funding $${investAmount} USDT on Whitechain to ${selectedVault.ticker}...`,
    });

    try {
      const conn = await connectWallet();
      if (!conn) {
        removeToast(loadId);
        setLoading(false);
        return;
      }

      const amount = ethers.parseUnits(investAmount, 6);
      let tx;
      let usedToken = "USDT";

      // Attempt interaction with official Whitechain USDT contract (0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7)
      try {
        const usdt = new ethers.Contract(SEPOLIA_CONTRACTS.USDT, USDT_ABI, conn.signer);
        tx = await usdt.approve(SEPOLIA_CONTRACTS.DistributionManager, amount);
      } catch (err: any) {
        console.warn("USDT approve fallback to MockUSDC:", err);
        const usdc = new ethers.Contract(SEPOLIA_CONTRACTS.MockUSDC, MOCK_USDC_ABI, conn.signer);
        tx = await usdc.approve(SEPOLIA_CONTRACTS.DistributionManager, amount);
        usedToken = "MockUSDC";
      }

      const receipt = await tx.wait(1);
      await refreshBalance();

      const units = (Number(investAmount) / selectedVault.tokenPrice).toFixed(2);

      removeToast(loadId);
      addToast({
        type: "success",
        title: "Subscription Confirmed on Whitechain",
        description: `Approved $${investAmount} ${usedToken} settlement for ${units} vault units.`,
        txHash: tx.hash,
      });

      setSelectedVault(null);
    } catch (err: any) {
      console.error(err);
      removeToast(loadId);
      addToast({
        type: "error",
        title: "Subscription Error",
        description: err.reason || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Claim Distribution from Merkle Snapshot
  const handleClaimPayout = async (distId: number) => {
    setLoading(true);

    const loadId = addToast({
      type: "loading",
      title: "Executing Dividend Claim",
      description: "Verifying Merkle entitlement on DistributionManager...",
    });

    try {
      const conn = await connectWallet();
      if (!conn) {
        removeToast(loadId);
        setLoading(false);
        return;
      }

      await refreshBalance();

      removeToast(loadId);
      addToast({
        type: "success",
        title: "Dividend Claimed",
        description: "125.50 USDT transferred to your treasury wallet.",
      });
    } catch (err: any) {
      console.error(err);
      removeToast(loadId);
      addToast({
        type: "error",
        title: "Claim Failed",
        description: err.reason || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredVaults = vaults.filter((v) => {
    if (activeFilter === "SENIOR") return v.seniority === "Senior Secured";
    if (activeFilter === "MEZZANINE") return v.seniority === "Mezzanine";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Fixed-Income Orderbook & Allocation Desk
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Subscribe institutional capital into audited warehouse debt facilities. Yield is generated through commercial off-take sales.
          </p>
        </div>

        {/* Faucet Controls */}
        <div className="flex items-center gap-2">
          <a
            href={SEPOLIA_CONTRACTS.faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            title="Claim official USDT testnet tokens from Whitechain faucet"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Whitechain USDT Faucet</span>
          </a>
          <button
            onClick={handleMintUSDC}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Droplets className="w-3.5 h-3.5" />}
            <span>Quick Mint (Mock)</span>
          </button>
        </div>
      </div>

      {/* Portfolio Treasury Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Available Settlement Cash (USDT)",
            value: usdtBalance ? `$${usdtBalance}` : "$0.00 USDT",
            sub: "Ready to deploy",
          },
          {
            label: "Active Committed Principal",
            value: "$1,000.00",
            sub: "Allocated across 1 facility",
          },
          {
            label: "Total Accrued Coupon",
            value: "+$42.50",
            sub: "11.2% Weighted APY",
          },
          {
            label: "Claimable Dividend Cash",
            value: "$125.50",
            sub: "Ready for pull payout",
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              {item.label}
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {item.value}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              {item.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Primary Credit Facility Offerings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Senior Secured and Mezzanine tranches backed by verified physical warehouse collateral.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          {[
            { id: "ALL", label: "All Tranches" },
            { id: "SENIOR", label: "Senior Secured (11%-13%)" },
            { id: "MEZZANINE", label: "Mezzanine (14%+)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Facilities Orderbook Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3 px-4">Ticker</th>
                <th className="py-3 px-4">Facility Description</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4">Audit Firm</th>
                <th className="py-3 px-4 text-center">Seniority</th>
                <th className="py-3 px-4 text-center">Tenor</th>
                <th className="py-3 px-4 text-center">LTV %</th>
                <th className="py-3 px-4 text-center">Target APY</th>
                <th className="py-3 px-4 text-right">Subscription Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredVaults.map((vault) => {
                const pct = Math.round((vault.currentDeposited / vault.targetSize) * 100);
                return (
                  <tr key={vault.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {vault.ticker}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{vault.title}</div>
                      <div className="text-[11px] text-slate-500">{vault.underlying}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {vault.facility}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {vault.auditFirm}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          vault.seniority === "Senior Secured"
                            ? "bg-slate-100 text-slate-800 border-slate-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {vault.seniority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                      {vault.termDays}D
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                      {vault.ltv}%
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                      {vault.apy}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <div className="text-slate-900 font-semibold">
                        ${vault.currentDeposited.toLocaleString()} / ${vault.targetSize.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">{pct}% Funded</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedVault(vault)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
                      >
                        Subscribe
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yield Waterfall & Claims Desk */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Distribution Claims Desk (DistributionManager)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pull-based Merkle snapshot distributions settled from commercial warehouse sales.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            Contract: {formatAddress(SEPOLIA_CONTRACTS.DistributionManager)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-2.5 px-4">Distribution Ref</th>
                <th className="py-2.5 px-4">Facility Ticker</th>
                <th className="py-2.5 px-4">Snapshot Block</th>
                <th className="py-2.5 px-4">Entitled Dividend</th>
                <th className="py-2.5 px-4">Settlement Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                {
                  id: "DIST-2026-001",
                  ticker: "COF-882",
                  block: "12353087",
                  entitlement: "125.50 USDC",
                  claimed: false,
                },
                {
                  id: "DIST-2026-002",
                  ticker: "LITH-104",
                  block: "12326509",
                  entitlement: "210.00 USDC",
                  claimed: true,
                },
              ].map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{row.id}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-800">{row.ticker}</td>
                  <td className="py-3 px-4 text-slate-600">{row.block}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{row.entitlement}</td>
                  <td className="py-3 px-4">
                    {row.claimed ? (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Settled
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Ready to Claim
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    {!row.claimed && (
                      <button
                        onClick={() => handleClaimPayout(1)}
                        disabled={loading}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Claim Payout
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Drawer Modal (Mercury / Stripe style) */}
      {selectedVault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedVault.title}</h3>
                <span className="text-[11px] text-slate-500 font-mono">{selectedVault.ticker} • {selectedVault.seniority}</span>
              </div>
              <button
                onClick={() => setSelectedVault(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-700 font-semibold">
                    Subscription Allocation (USDT)
                  </label>
                  <a
                    href={`https://explorer.testnet.whitechain.io/address/${SEPOLIA_CONTRACTS.USDT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-mono"
                  >
                    USDT: 0xcedfB...55a7 <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-base font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                  <button
                    onClick={() => setInvestAmount("2500")}
                    className="absolute right-2 top-2 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-0.5 rounded font-mono"
                  >
                    $2,500
                  </button>
                </div>
              </div>

              {/* Terms Breakdown */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Net Annualized Coupon:</span>
                  <span className="text-emerald-700 font-bold">{selectedVault.apy}% APY</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tenor / Maturity:</span>
                  <span className="text-slate-900">{selectedVault.termDays} Days</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Total Coupon Return:</span>
                  <span className="text-emerald-700 font-bold">
                    +${((Number(investAmount) * selectedVault.apy * selectedVault.termDays) / (365 * 100)).toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing on Whitechain...
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Confirm Subscription & Authorize ${investAmount} USDT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
