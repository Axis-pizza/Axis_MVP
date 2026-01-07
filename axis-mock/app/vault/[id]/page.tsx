"use client";

import { use, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, TrendingUp, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ==========================================
// Types
// ==========================================

interface VaultData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  tvl: number;
  apy: number;
  holders: number;
  volume24h: number;
  creator: string;
  strategy: string;
  managementFee: number;
  withdrawalFee: number;
  lastRebalance: string;
  contract: string;
  composition: Array<{
    symbol: string;
    name: string;
    weight: number;
    price: number;
    change24h: number;
    logoURI: string;
  }>;
}

// ==========================================
// Sub Components
// ==========================================

/**
 * Price Chart Component
 * Displays vault price history
 */
function PriceChart({ data }: { data: VaultData }) {
  const [timeframe, setTimeframe] = useState("1M");

  return (
    <Card className="border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Price Chart</h3>
        <div className="flex gap-1">
          {["1H", "1D", "1W", "1M", "1Y"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                timeframe === tf
                  ? "bg-emerald-500 text-black"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Simplified chart visualization */}
      <div className="h-64 rounded-lg bg-neutral-900/50 p-4">
        <div className="flex h-full items-end gap-1">
          {Array.from({ length: 50 }).map((_, i) => {
            const height = 30 + Math.random() * 60;
            const isGreen = Math.random() > 0.5;
            return (
              <div
                key={i}
                className={`flex-1 ${isGreen ? "bg-emerald-500/50" : "bg-red-500/50"} rounded-t`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase text-neutral-500">TVL</div>
          <div className="mt-1 font-mono text-lg font-bold text-white">
            ${data.tvl.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-neutral-500">APY (Past)</div>
          <div className="mt-1 flex items-center gap-1 font-mono text-lg font-bold text-emerald-400">
            <TrendingUp size={14} />
            {data.apy}%
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-neutral-500">Holders</div>
          <div className="mt-1 font-mono text-lg font-bold text-white">
            {data.holders.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-neutral-500">24h Volume</div>
          <div className="mt-1 font-mono text-lg font-bold text-white">
            ${data.volume24h.toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Swap Panel Component
 * Allows users to swap USDC for vault tokens
 */
function SwapPanel({ data }: { data: VaultData }) {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("0.00");

  const handleSwap = () => {
    toast.success("Swap initiated!");
  };

  return (
    <Card className="border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Swap</h3>
        <div className="flex gap-2">
          <button className="text-xs text-neutral-500 hover:text-white">
            <RefreshCw size={14} />
          </button>
          <button className="text-xs text-neutral-500 hover:text-white">
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* You Pay */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-xs text-neutral-500">You Pay</div>
          <div className="flex items-center justify-between">
            <Input
              type="number"
              value={fromAmount}
              onChange={(e) => {
                setFromAmount(e.target.value);
                setToAmount((parseFloat(e.target.value) / data.price).toFixed(2));
              }}
              placeholder="0.00"
              className="border-0 bg-transparent p-0 text-2xl font-bold text-white focus-visible:ring-0"
            />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                <span className="text-xs font-bold">$</span>
              </div>
              <span className="font-bold text-white">USDC</span>
            </div>
          </div>
          <div className="mt-1 text-xs text-neutral-500">Balance: 2,500.00</div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <div className="rounded-lg bg-white/10 p-2">
            <ArrowLeftRight size={16} className="text-neutral-400" />
          </div>
        </div>

        {/* You Receive */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-xs text-neutral-500">You Receive</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-emerald-400">{toAmount}</div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800">
                <span className="text-xs font-bold">{data.symbol[0]}</span>
              </div>
              <span className="font-bold text-white">{data.symbol}</span>
            </div>
          </div>
        </div>

        {/* Rate Info */}
        <div className="rounded-lg bg-white/5 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Rate</span>
            <span className="text-white">1 {data.symbol} = {data.price.toFixed(2)} USDC</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-neutral-500">Network Cost</span>
            <span className="text-emerald-400">≈ Free</span>
          </div>
        </div>

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          className="w-full bg-emerald-500 text-lg font-bold text-black hover:bg-emerald-400"
        >
          Swap
        </Button>
      </div>
    </Card>
  );
}

/**
 * Composition Component
 * Displays vault asset allocation
 */
function Composition({ data }: { data: VaultData }) {
  return (
    <Card className="border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          Composition <span className="text-neutral-500">({data.composition.length} Assets)</span>
        </h3>
      </div>

      <div className="space-y-3">
        {data.composition.map((asset) => (
          <div
            key={asset.symbol}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4"
          >
            <div className="flex items-center gap-3">
              <img src={asset.logoURI} alt={asset.symbol} className="h-8 w-8 rounded-full" />
              <div>
                <div className="font-bold text-white">{asset.symbol}</div>
                <div className="text-xs text-neutral-500">{asset.name}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono font-bold text-white">${asset.price.toFixed(2)}</div>
              <div className={`text-xs ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(1)}%
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-lg font-bold text-white">{asset.weight}%</div>
              <div className="text-xs text-neutral-500">WEIGHT</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Vault Details Component
 * Displays vault metadata and information
 */
function VaultDetails({ data }: { data: VaultData }) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card className="border-white/10 bg-black p-6">
      <h3 className="mb-4 text-sm font-bold text-white">Vault Details</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Manager Fee</span>
          <span className="text-white">{data.managementFee}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Withdrawal Fee</span>
          <span className="text-white">{data.withdrawalFee}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Last Rebalance</span>
          <span className="text-white">{data.lastRebalance}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Contract</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-emerald-400">
              Ax...92
            </span>
            <button onClick={() => copyToClipboard(data.contract)}>
              <Copy size={12} className="text-neutral-500 hover:text-white" />
            </button>
            <button onClick={() => window.open(`https://solscan.io/account/${data.contract}`, '_blank')}>
              <ExternalLink size={12} className="text-neutral-500 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ==========================================
// Main Component
// ==========================================

/**
 * Vault Detail Page
 * 
 * Displays comprehensive vault information including:
 * - Price chart and performance metrics
 * - Swap interface
 * - Asset composition
 * - Vault details and metadata
 */
export default function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockData: VaultData = {
      id,
      name: "Axis Index",
      symbol: "AXIX",
      price: 0.90,
      change24h: 11.2,
      tvl: 4200000,
      apy: 18.2,
      holders: 1240,
      volume24h: 850000,
      creator: "Axis Team",
      strategy: "Quarterly Rebalancing",
      managementFee: 0.10,
      withdrawalFee: 0.05,
      lastRebalance: "2 days ago",
      contract: "AxisVault1234567890abcdefghijklmnopqrstuvwxyz",
      composition: [
        {
          symbol: "SOL",
          name: "Solana",
          weight: 35,
          price: 145.2,
          change24h: 2.4,
          logoURI: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
        },
        {
          symbol: "JUP",
          name: "Jupiter",
          weight: 15,
          price: 1.12,
          change24h: 5.1,
          logoURI: "https://assets.coingecko.com/coins/images/10365/large/juptr.jpg",
        },
        {
          symbol: "JTO",
          name: "Jito",
          weight: 10,
          price: 3.45,
          change24h: -1.2,
          logoURI: "https://assets.coingecko.com/coins/images/33853/large/jito.png",
        },
        {
          symbol: "PYTH",
          name: "Pyth Network",
          weight: 8,
          price: 0.45,
          change24h: 0.8,
          logoURI: "https://assets.coingecko.com/coins/images/31924/large/pyth.png",
        },
      ],
    };

    setTimeout(() => {
      setVaultData(mockData);
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading || !vaultData) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-neutral-500">Loading vault...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black p-6 pb-24 text-white">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 text-xl font-bold">
              {vaultData.symbol[0]}
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white">{vaultData.name}</h1>
              <p className="text-sm text-neutral-400">
                Created by {vaultData.creator} • {vaultData.strategy}
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-mono text-4xl font-bold text-white">
              ${vaultData.price.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <TrendingUp size={16} />
              <span className="text-lg font-medium">+{vaultData.change24h}%</span>
              <span className="text-sm text-neutral-500">(Past 30d)</span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Chart + Composition */}
          <div className="col-span-2 space-y-6">
            <PriceChart data={vaultData} />
            <Composition data={vaultData} />
          </div>

          {/* Right Column: Swap + Details */}
          <div className="space-y-6">
            <SwapPanel data={vaultData} />
            <VaultDetails data={vaultData} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
