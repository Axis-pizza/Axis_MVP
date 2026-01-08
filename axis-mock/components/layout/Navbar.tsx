"use client";

// ★ここが抜けていました
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { WalletSelector } from "@/components/wallet/WalletSelector";
import { useAxisStore } from "@/app/store/useAxisStore";
import { AppSidebar } from "./AppSidebar";
import { usePrivy } from "@privy-io/react-auth";
import { PortfolioSheet } from "@/components/wallet/PortfolioSheet";
import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

export function Navbar() {
  const { usdcBalance, solBalance, fetchBalances, isFaucetLoading } = useAxisStore();
  const { ready, authenticated, user } = usePrivy();
  const [isMounted, setIsMounted] = useState(false);
  
  // ウォレットアドレスを取得
  const walletAccounts = user?.linkedAccounts?.filter((account: any) => account.type === 'wallet') || [];
  const walletAddress = user?.wallet?.address || (walletAccounts.length > 0 ? (walletAccounts[0] as any).address : undefined);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRefreshBalance = () => {
    fetchBalances();
  };

  if (!isMounted) return null;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-neutral-800 bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <AppSidebar />
          <Link href="/" className="group flex items-center gap-2">
            <span className="hidden text-xl font-bold tracking-tight text-white md:block">
              Axis
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <SettingsDialog />

          {authenticated && walletAddress && (
            <div className="mr-2 hidden items-center gap-3 md:flex">
              <div className="flex flex-col items-end leading-none">
                <span className="text-sm font-bold text-white">
                  {usdcBalance.toLocaleString()} USDC
                </span>
                <span className="font-mono text-[10px] text-neutral-500">Devnet</span>
              </div>
              <div className="mx-1 h-8 w-px bg-neutral-800" />
              <div className="flex flex-col items-end leading-none">
                <span className="text-sm font-bold text-white">
                  {solBalance.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL
                </span>
                <button
                  onClick={handleRefreshBalance}
                  disabled={isFaucetLoading}
                  className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white"
                >
                  <RefreshCw size={10} className={isFaucetLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            </div>
          )}

          {!authenticated ? (
            <WalletSelector />
          ) : (
            <PortfolioSheet>
              <Button
                variant="outline"
                className="h-10 border-neutral-800 bg-neutral-900 px-4 font-mono text-white transition-all hover:border-emerald-500/50 hover:bg-neutral-800"
              >
                <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
              </Button>
            </PortfolioSheet>
          )}
        </div>
      </div>
    </nav>
  );
}
