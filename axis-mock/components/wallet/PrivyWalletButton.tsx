"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

/**
 * Privy Wallet Button Component
 * 
 * Displays login/logout button based on authentication state
 * Replaces the old WalletSelector component
 */
export function PrivyWalletButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <Button disabled className="bg-white/10">
        Loading...
      </Button>
    );
  }

  if (authenticated && user) {
    const walletAddress = user.wallet?.address;
    const displayAddress = walletAddress 
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : "Connected";

    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" className="border-white/10 font-mono text-sm">
          {displayAddress}
        </Button>
        <Button
          onClick={logout}
          variant="ghost"
          size="icon"
          className="hover:bg-red-500/20"
        >
          <LogOut size={16} />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={login}
      className="bg-white font-bold text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)] transition-all hover:bg-neutral-200"
    >
      <Wallet className="mr-2 h-4 w-4" />
      Connect Wallet
    </Button>
  );
}
