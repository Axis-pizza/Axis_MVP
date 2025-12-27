"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAxisStore } from "@/app/store/useAxisStore";
import { Loader2, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

const WALLETS = [
  {
    id: "Phantom",
    name: "Phantom",
    iconUrl: "/wallet/phantom.svg",
    fallback: "PH",
  },
  {
    id: "Solflare",
    name: "Solflare",
    iconUrl: "/wallet/solflare.svg",
    fallback: "SF",
  },
  {
    id: "Backpack",
    name: "Backpack",
    iconUrl: "/wallet/backpack.png",
    fallback: "BP",
  },
  {
    id: "OKX Wallet",
    name: "OKX Wallet",
    iconUrl: "/wallet/okx.png",
    fallback: "OK",
  },
];

export function WalletSelector() {
  const { select, connect, connected, connecting: isAdapterConnecting, wallet } = useWallet();
  const { connectWallet: syncStoreWallet, isConnected: isStoreConnected } = useAxisStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  useEffect(() => {
    if (connected && wallet) {
      syncStoreWallet("Phantom");
      setIsOpen(false);
    }
  }, [connected, wallet, syncStoreWallet]);

  const handleConnect = async (walletName: string) => {
    setSelectedWalletId(walletName);

    select(walletName as any);
  };

  if (connected) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white font-bold text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)] transition-all hover:bg-neutral-200">
          <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
        </Button>
      </DialogTrigger>

      <DialogContent className="border-neutral-800 bg-[#0A0A0A] p-6 text-white shadow-2xl shadow-black sm:max-w-[400px]">
        <DialogHeader className="mb-4 space-y-1 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight text-white">
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            Select your preferred Solana wallet to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {WALLETS.map((w) => (
            <button
              key={w.id}
              disabled={isAdapterConnecting && selectedWalletId === w.id}
              onClick={() => handleConnect(w.id)}
              className="group flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-900 active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 rounded-lg border border-neutral-800 bg-black">
                  <AvatarImage src={w.iconUrl} alt={w.name} className="object-contain p-1" />
                  <AvatarFallback className="rounded-lg bg-neutral-900 text-xs font-bold text-neutral-400">
                    {w.fallback}
                  </AvatarFallback>
                </Avatar>

                <span className="text-lg font-bold text-neutral-300 transition-colors group-hover:text-white">
                  {w.name}
                </span>
              </div>

              {isAdapterConnecting && selectedWalletId === w.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-neutral-800 transition-colors group-hover:bg-white" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 text-center text-[10px] tracking-widest text-neutral-600 uppercase">
          Secured by Axis Protocol
        </div>
      </DialogContent>
    </Dialog>
  );
}
