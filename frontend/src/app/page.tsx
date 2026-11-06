"use client";

import React, { useState } from "react";
import { SEPOLIA_CONTRACTS } from "../lib/contracts";
import { useToast } from "../components/Toast";
import {
  Layers,
  Building2,
  Users,
  Copy,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  ChevronRight,
  Check,
} from "lucide-react";

export default function Home() {
  const { addToast } = useToast();
  const [copiedContract, setCopiedContract] = useState<string | null>(null);

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(name);
    addToast({
      type: "success",
      title: "Address Copied",
      description: `${name} address copied to clipboard.`,
    });
    setTimeout(() => setCopiedContract(null), 2000);
  };

  const facilities = [
    {
      id: "FAC-2026-088",
      title: "Arabica Coffee Beans (Grade 1)",
      borrower: "Apex Commodity Trading Ltd",
      underlying: "5,000 Bags Specialty Arabica",
      facility: "Geneva Freeport, Terminal 3, CH",
      approvedLimit: "$29,750.00",
      drawnAmount: "$24,500.00",
      appraisedValue: "$42,500.00",
      ltv: "70.0%",
      coupon: "11.2%",
      tenor: "90 Days",
      status: "ACTIVE",
      tokenAddr: "0xc77447aca50ca5e8650631257D8c63974B5993f2",
    },
    {
      id: "FAC-2026-104",
      title: "Tier-1 Lithium Storage Cells",
      borrower: "Nordic Battery Logistics BV",
      underlying: "1,200 High-Capacity Modules",
      facility: "Rotterdam Europort Terminal, NL",
      approvedLimit: "$78,000.00",
      drawnAmount: "$52,000.00",
      appraisedValue: "$120,000.00",
      ltv: "65.0%",
      coupon: "13.4%",
      tenor: "120 Days",
      status: "ACTIVE",
      tokenAddr: "0x02b5f19528cd1feB982029bBf14A91ef467249eA",
    },
    {
      id: "FAC-2026-077",
      title: "Automotive Microcontrollers",
      borrower: "Pacific Semiconductor Corp",
      underlying: "15,000 Sealed Industrial Units",
      facility: "Singapore Changi Bonded Hub, SG",
      approvedLimit: "$51,000.00",
      drawnAmount: "$47,000.00",
      appraisedValue: "$85,000.00",
      ltv: "60.0%",
      coupon: "14.8%",
      tenor: "60 Days",
      status: "ACTIVE",
      tokenAddr: "0xE85562e518a84c63330Ca7f7E67EC29Aa4ade09D",
    },
  ];

  const contractsList = [
    {
      name: "InventoryRegistry",
      role: "Commitment Authority",
      desc: "Immutable registry for physical warehouse commitments and SHA-256 evidence roots.",
      address: SEPOLIA_CONTRACTS.InventoryRegistry,
    },
    {
      name: "InventoryTokenFactory",
      role: "Issuance Factory",
      desc: "Deterministic factory deploying ERC-20 debt tokens bound to physical inventory IDs.",
      address: SEPOLIA_CONTRACTS.InventoryTokenFactory,
    },
    {
      name: "SalesSettlement",
      role: "Off-Take Attestation",
      desc: "Cryptographic EIP-712 verification engine processing ERP warehouse sale releases.",
      address: SEPOLIA_CONTRACTS.SalesSettlement,
    },
    {
      name: "DistributionManager",
      role: "Waterfall Settlement",
      desc: "Pull-based Merkle distribution manager enforcing deterministic 5-tier waterfall payouts.",
      address: SEPOLIA_CONTRACTS.DistributionManager,
    },
    {
      name: "AccessController",
      role: "Institutional RBAC",
      desc: "Role-based access control authority and emergency platform circuit breaker.",
      address: SEPOLIA_CONTRACTS.AccessController,
    },
    {
      name: "MockUSDC (Stablecoin)",
      role: "Settlement Currency",
      desc: "6-decimal payment token for credit facility draws, subscriptions, and yield claims.",
      address: SEPOLIA_CONTRACTS.MockUSDC,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Credit Portfolio & Facilities
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Overview of active asset-backed credit facilities, warehouse collateral positions, and on-chain settlement contracts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/company"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            Originate Facility
          </a>
          <a
            href="/investor"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            Investor Orderbook
          </a>
        </div>
      </div>

      {/* High-Density Treasury Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: "Total Facility Commitment",
            value: "$18,450,000.00",
            sub: "6 Active Credit Facilities",
          },
          {
            label: "Drawn Principal Balance",
            value: "$12,820,000.00",
            sub: "69.4% Utilization",
          },
          {
            label: "Collateral Coverage",
            value: "142.8%",
            sub: "Overcollateralized Buffer",
          },
          {
            label: "Weighted Avg Coupon",
            value: "11.40% Net APY",
            sub: "Senior Secured Priority",
          },
          {
            label: "Default & Impairment",
            value: "0.00%",
            sub: "Double-Entry Verified",
          },
        ].map((metric, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              {metric.label}
            </span>
            <div className="text-xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
              {metric.value}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              {metric.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Active Facilities Table (Institutional Ledger) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Warehouse Credit Facilities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live borrowing facilities secured by verified physical inventory lots on Whitechain Sepolia.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            3 Facilities Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3 px-4">Facility ID</th>
                <th className="py-3 px-4">Borrower & Collateral</th>
                <th className="py-3 px-4">Storage Hub</th>
                <th className="py-3 px-4 text-right">Appraised Value</th>
                <th className="py-3 px-4 text-right">Approved Limit</th>
                <th className="py-3 px-4 text-right">Drawn Amount</th>
                <th className="py-3 px-4 text-center">LTV %</th>
                <th className="py-3 px-4 text-center">Coupon</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Settlement Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {facilities.map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {fac.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{fac.title}</div>
                    <div className="text-[11px] text-slate-500">{fac.borrower}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                    {fac.facility}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {fac.appraisedValue}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                    {fac.approvedLimit}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 tabular-nums">
                    {fac.drawnAmount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                    {fac.ltv}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-600">
                    {fac.coupon}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {fac.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={`https://explorer.testnet.whitechain.io/address/${fac.tokenAddr}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      {fac.tokenAddr.substring(0, 6)}...{fac.tokenAddr.substring(fac.tokenAddr.length - 4)}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Invariants & On-Chain Authority Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: The 4 Core Architectural Invariants */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              Settlement Accounting Invariants
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Strictly enforced separation of financial concepts across all planes:
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wide">
                1. Inventory Valuation (Gross)
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Physical units × verified acquisition cost. Used strictly as baseline appraisal.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wide">
                2. Eligible Borrowing Base
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Gross appraisal discounted by category haircut matrices (e.g. 70% LTV).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wide">
                3. Token Unit Price
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Standard subscription tranche unit denomination (fixed at $100.00 USDC).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 space-y-1">
              <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wide">
                4. Distributable Sales Cash
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Realized fiat/stablecoin proceeds collected from ERP sales into the waterfall.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Smart Contract Verification Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                Whitechain Sepolia Settlement Node Contracts
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Verified smart contracts deployed on Whitechain testnet (Chain ID 1874).
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Network Online
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {contractsList.map((contract) => (
              <div
                key={contract.name}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{contract.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                      {contract.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{contract.desc}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center font-mono text-[11px]">
                  <span className="text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {contract.address.substring(0, 8)}...{contract.address.substring(contract.address.length - 6)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(contract.address, contract.name)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedContract === contract.name ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={`https://explorer.testnet.whitechain.io/address/${contract.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                    title="View on Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
