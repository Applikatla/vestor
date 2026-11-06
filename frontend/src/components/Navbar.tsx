"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWeb3 } from "../context/Web3Context";
import { formatAddress } from "../lib/web3";
import { SEPOLIA_CONTRACTS } from "../lib/contracts";
import {
  Layers,
  Wallet,
  Building2,
  Users,
  SlidersHorizontal,
  Coins,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";

export function Navbar() {
  const {
    account,
    usdtBalance,
    isWrongNetwork,
    connecting,
    connect,
    switchNetwork,
  } = useWeb3();
  const pathname = usePathname();

  const navLinks = [
    { name: "Portfolio & Facilities", href: "/", icon: Layers },
    { name: "Borrower Portal", href: "/company", icon: Building2 },
    { name: "Investor Marketplace", href: "/investor", icon: Users },
    { name: "Credit Risk & Waterfall", href: "/admin", icon: SlidersHorizontal },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      {/* Top Institutional Environment Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-white">Whitechain Sepolia (Chain ID: 1874)</span>
          <span className="text-slate-400 hidden sm:inline">| Institutional Credit Facility Protocol V1.0</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[11px] font-mono">
          <span>Block Finality: 2.1s</span>
          <a
            href="https://explorer.testnet.whitechain.io"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            Explorer <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Organization / Brand Identity */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-base shadow-sm">
              IC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  InventoryCredit
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Institutional
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono block">
                Warehouse RWA Desk
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Wallet & Account Information */}
        <div className="flex items-center gap-3">
          <a
            href={SEPOLIA_CONTRACTS.faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
            title="Claim testnet WBT & official USDT from Whitechain faucet"
          >
            <span>Faucet</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {account && isWrongNetwork && (
            <button
              onClick={switchNetwork}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Switch Network (1874)
            </button>
          )}

          {account ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-mono">
              {usdtBalance !== null && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-900 font-semibold tabular-nums">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>${usdtBalance}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{formatAddress(account)}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              Connect Treasury Wallet
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
