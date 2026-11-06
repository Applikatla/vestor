"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
import { SEPOLIA_CONTRACTS } from "../lib/contracts";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-20 py-10 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Platform Overview */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                IC
              </div>
              <span className="font-bold text-sm text-slate-900">
                InventoryCredit Protocol
              </span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed max-w-md">
              Enterprise real-world asset credit facility and continuous settlement desk. Enables corporate inventory holders to tokenize physical warehouse positions, borrow non-dilutive stablecoin working capital, and settle repayments under deterministic 5-tier waterfall smart contract rules.
            </p>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
              <span>EVM Target: Cancun</span>
              <span>•</span>
              <span>Settlement Layer: Whitechain Sepolia (1874)</span>
              <span>•</span>
              <span>Evidence: SHA-256 Merkle Roots</span>
            </div>
          </div>

          {/* Col 2: Core Contracts */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              On-Chain Settlement
            </h4>
            <ul className="space-y-1.5 text-xs font-mono text-slate-600">
              <li>
                <a
                  href={`https://explorer.testnet.whitechain.io/address/${SEPOLIA_CONTRACTS.InventoryRegistry}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  InventoryRegistry <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href={`https://explorer.testnet.whitechain.io/address/${SEPOLIA_CONTRACTS.InventoryTokenFactory}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  TokenFactory <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href={`https://explorer.testnet.whitechain.io/address/${SEPOLIA_CONTRACTS.SalesSettlement}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  SalesSettlement (EIP-712) <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href={`https://explorer.testnet.whitechain.io/address/${SEPOLIA_CONTRACTS.DistributionManager}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  DistributionManager <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href={`https://explorer.testnet.whitechain.io/address/${SEPOLIA_CONTRACTS.AccessController}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-600 transition-colors flex items-center gap-1.5"
                >
                  AccessController (RBAC) <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Portal Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Operational Portals
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li>
                <Link href="/company" className="hover:text-slate-900 transition-colors">
                  Borrower Loan Origination Console
                </Link>
              </li>
              <li>
                <Link href="/investor" className="hover:text-slate-900 transition-colors">
                  Institutional Investor Orderbook
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-slate-900 transition-colors">
                  Credit Risk & Waterfall Workstation
                </Link>
              </li>
              <li>
                <a
                  href="https://explorer.testnet.whitechain.io"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  Whitechain Testnet Explorer <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© 2026 InventoryCredit Protocol. Enterprise Real-World Asset (RWA) Architecture.</p>
          <div className="flex items-center gap-4 font-mono">
            <span>Deterministic Double-Entry Ledger</span>
            <span>•</span>
            <span>2.1s Block Finality</span>
            <span>•</span>
            <span>Audit-Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
