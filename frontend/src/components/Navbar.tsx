"use client";

import React, { useState } from "react";
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
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Portfolio", full: "Portfolio & Facilities", href: "/", icon: Layers },
    { name: "Borrower Desk", full: "Borrower Loan Console", href: "/company", icon: Building2 },
    { name: "Investor Desk", full: "Investor Marketplace", href: "/investor", icon: Users },
    { name: "Risk & Waterfall", full: "Credit Risk & Waterfall", href: "/admin", icon: SlidersHorizontal },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      {/* Top Institutional Environment Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 sm:px-6 py-1.5 flex items-center justify-between gap-2 overflow-x-hidden">
        <div className="flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="font-semibold text-white truncate text-[11px] sm:text-xs">
            Whitechain Sepolia (1874)
          </span>
          <span className="text-slate-400 hidden md:inline text-[11px]">
            | VESTOR RWA Protocol V1.0
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-[10px] sm:text-[11px] font-mono shrink-0">
          <span className="hidden sm:inline">2.1s Finality</span>
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
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Left: Organization / Brand Identity */}
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-sm shrink-0">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
                  VESTOR
                </span>
                <span className="hidden sm:inline-block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  RWA Desk
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono hidden sm:block">
                Whitechain Credit Protocol
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 pl-4 border-l border-slate-200">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Wallet & Account Information */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={SEPOLIA_CONTRACTS.faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs whitespace-nowrap"
            title="Claim testnet WBT & official USDT from Whitechain faucet"
          >
            <span>Faucet</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {account && isWrongNetwork && (
            <button
              onClick={switchNetwork}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Switch Network</span>
              <span>(1874)</span>
            </button>
          )}

          {account ? (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 p-1 sm:p-1.5 rounded-lg text-xs font-mono">
              {usdtBalance !== null && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-900 font-semibold tabular-nums text-[11px] sm:text-xs whitespace-nowrap">
                  <Coins className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>${usdtBalance}</span>
                </div>
              )}
              <div className="flex items-center gap-1 px-1.5 text-slate-700 text-[11px] sm:text-xs whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>{formatAddress(account)}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wallet className="w-3.5 h-3.5" />
              )}
              <span>Connect Wallet</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <a
              href={SEPOLIA_CONTRACTS.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-700 font-semibold"
            >
              <span>Whitechain USDT Faucet</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <span className="text-[11px] font-mono text-slate-400">Chain ID: 1874</span>
          </div>
        </div>
      )}
    </header>
  );
}
