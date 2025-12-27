"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, TrendingUp, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface VaultCardProps {
  title: string;
  symbol: string;
  creator: string;
  contract: string;
  tvl: number;
  apy: number;
  createdAt: string;
  imageUrl?: string;
  type: "Official" | "Community";
}

export function VaultCard({
  title,
  symbol,
  creator,
  contract,
  tvl,
  apy,
  createdAt,
  imageUrl,
  type,
}: VaultCardProps) {
  const router = useRouter();

  const safeSymbol = symbol && symbol.length > 0 ? symbol : "?";
  const displayChar = safeSymbol[0];

  return (
    <Card className="group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
      <div className="absolute -inset-1 translate-x-[-100%] -skew-x-12 transform bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:translate-x-[100%] group-hover:opacity-100" />

      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black shadow-inner">
                <img src={imageUrl} alt={safeSymbol} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-neutral-800 to-neutral-900 font-serif text-xl font-bold text-emerald-500 shadow-inner">
                {displayChar}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="truncate pr-2 font-serif text-lg font-bold tracking-wide text-white">
                {title || "Unknown Vault"}
              </h3>
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <span className="truncate">
                  by{" "}
                  {creator
                    ? creator === "Axis Team"
                      ? "Axis Team"
                      : creator.slice(0, 4) + "..." + creator.slice(-4)
                    : "Unknown"}
                </span>
                {type === "Official" && (
                  <Badge
                    variant="secondary"
                    className="h-4 shrink-0 border-emerald-500/20 bg-emerald-950/30 px-1 text-[10px] text-emerald-400"
                  >
                    Official
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-sm text-neutral-500">APY</div>
            <div className="font-serif text-xl font-bold text-emerald-400">{apy}%</div>
          </div>
        </div>

        <div className="my-4 grid grid-cols-2 gap-4 rounded-lg border border-white/5 bg-black/20 p-3">
          <div>
            <div className="text-[10px] tracking-wider text-neutral-500 uppercase">TVL</div>
            <div className="font-serif text-base font-medium text-white">
              ${tvl?.toLocaleString() || "0"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-wider text-neutral-500 uppercase">Created</div>
            <div className="flex items-center justify-end gap-1 text-sm font-medium text-neutral-300">
              <Clock size={12} /> {createdAt}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between rounded border border-white/5 bg-neutral-900/50 p-2 text-xs text-neutral-500">
          <span className="font-mono">
            {contract ? contract.slice(0, 6) + "..." + contract.slice(-6) : "No Contract"}
          </span>
          <button
            className="transition-colors hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              if (contract) navigator.clipboard.writeText(contract);
            }}
          >
            <Copy size={12} />
          </button>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full flex-1 border border-white/10 bg-white/5 font-serif text-white transition-all hover:bg-white/10"
          onClick={() => router.push(`/vault/${contract}`)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
