"use client";

import { useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAxisStore } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { ExternalLink, Coins, Wallet, TrendingUp, ShieldCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PortfolioSheet({ children }: { children: React.ReactNode }) {
  const {
    connectWallet,
    usdcBalance,
    solBalance,
    positions,
    vaults,
    claimFaucet,
    isFaucetLoading,
    disconnectWallet,
    claimedWallets,
    fetchBalances,
  } = useAxisStore();

  const { publicKey, disconnect } = useWallet();

  useEffect(() => {
    if (!publicKey) return;

    connectWallet(publicKey.toString());
  }, [publicKey, connectWallet]);

  const handleDisconnect = async () => {
    await disconnect();
    disconnectWallet();
  };

  const handleClaim = async () => {
    if (!publicKey) return;

    try {
      await claimFaucet();

      fetchBalances();
    } catch (e) {
      console.error("Claim Error:", e);
      toast.error("Failed to claim USDC. Please try again.");
    }
  };

  const myVaults = vaults.filter((v) => v.creator === publicKey?.toString());

  const hasClaimed = publicKey ? claimedWallets.includes(publicKey.toString()) : false;

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        side="right"
        className="z-[100] flex w-full flex-col border-l border-white/10 bg-black/80 p-0 font-serif text-white backdrop-blur-xl sm:w-[400px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Wallet Portfolio</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              <Wallet size={18} />
            </div>
            <div className="flex flex-col">
              <span className="max-w-[150px] truncate font-serif text-base font-bold tracking-wide">
                {publicKey
                  ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
                  : "Not Connected"}
              </span>
              <span className="font-sans text-[10px] tracking-wider text-neutral-400 uppercase">
                Connected via Solana
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="h-8 font-sans text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300"
          >
            Disconnect
          </Button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="space-y-4">
            <span className="font-sans text-xs font-bold tracking-widest text-neutral-500 uppercase">
              Total Balance
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="font-serif text-5xl font-bold tracking-tight text-white">
                {usdcBalance.toLocaleString()}{" "}
                <span className="text-lg font-normal text-neutral-500">USDC</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm text-neutral-400">
              <span className="rounded border border-white/5 bg-white/10 px-2 py-0.5 text-xs text-neutral-300">
                {solBalance.toFixed(3)} SOL
              </span>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleClaim}
                disabled={isFaucetLoading || hasClaimed}
                className={`h-12 w-full border font-serif shadow-lg transition-all ${
                  hasClaimed
                    ? "cursor-not-allowed border-neutral-800 bg-neutral-900 text-neutral-500"
                    : "border-white/10 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                {isFaucetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : hasClaimed ? (
                  "Faucet Already Claimed"
                ) : (
                  <>
                    <Coins className="mr-2 h-4 w-4 text-yellow-500" /> Get 1,000 USDC (Demo)
                  </>
                )}
              </Button>
              {!hasClaimed && (
                <p className="mt-2 text-center font-sans text-[10px] text-neutral-600">
                  *Available once per wallet on Devnet.
                </p>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="space-y-4">
            <div className="flex items-center gap-2 font-sans text-xs font-bold tracking-widest text-neutral-400 uppercase">
              <ShieldCheck size={14} /> Active Positions ({positions.length})
            </div>

            {positions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center font-serif text-sm text-neutral-500">
                No active positions yet.
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos, idx) => {
                  const vault = vaults.find((v) => v.id === pos.vaultId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
                    >
                      <div>
                        <p className="font-serif text-base font-bold text-white">
                          {vault?.name || "Unknown Vault"}
                        </p>
                        <p className="mt-1 font-mono text-xs text-neutral-500">
                          Entry: ${pos.entryValue.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-500/10 font-sans text-[10px] text-emerald-400"
                        >
                          Active
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 font-sans text-xs font-bold tracking-widest text-neutral-400 uppercase">
              <TrendingUp size={14} /> My ETF ({myVaults.length})
            </div>

            {myVaults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center font-serif text-sm text-neutral-500">
                You haven't created any ETFs.
              </div>
            ) : (
              <div className="space-y-3">
                {myVaults.map((vault) => (
                  <div
                    key={vault.id}
                    className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <span className="font-serif text-base font-bold text-white">
                        {vault.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-white/20 bg-black/40 text-[10px] text-neutral-400"
                      >
                        {vault.status || "Active"}
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="font-sans text-xs text-neutral-500">
                        TVL{" "}
                        <span className="ml-1 font-serif text-sm text-white">
                          ${vault.tvl?.toLocaleString() || 0}
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 font-sans text-xs text-emerald-500 hover:text-emerald-400"
                      >
                        Manage <ExternalLink size={10} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
