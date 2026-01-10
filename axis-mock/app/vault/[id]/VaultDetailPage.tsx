"use client";

import { use, useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { AppLayout } from "@/components/layout/AppLayout";
import { SwapPanel } from "@/components/vault/SwapPanel";
import { useAxisStore } from "@/app/store/useAxisStore";
import { useVaultPrice } from "@/hooks/useTokenPrices";
import {
  TrendingUp,
  Clock,
  Users,
  Activity,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

// ==========================================
// Constants
// ==========================================

const MOCK_PRICE_DATA = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}d`,
  price: 0.75 + Math.sin(i / 5) * 0.1 + i * 0.005,
}));

// ==========================================
// Types
// ==========================================

interface VaultDetailPageProps {
  params: Promise<{ id: string }>;
}

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  positive?: boolean;
}

// ==========================================
// Sub Components
// ==========================================

/**
 * Stat Card Component
 */
function StatCard({ label, value, icon, positive }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${positive !== undefined ? (positive ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Price Chart Component
 */
function PriceChart() {
  const [timeframe, setTimeframe] = useState("1M");

  return (
    <Card className="bg-black/40 border-white/10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Price Chart</h3>
        <div className="flex gap-2">
          {["1H", "1D", "1W", "1M", "1Y"].map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeframe(tf)}
              className={timeframe === tf ? "bg-emerald-500 text-black" : ""}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={MOCK_PRICE_DATA}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="time" stroke="#666" style={{ fontSize: '10px' }} />
          <YAxis stroke="#666" style={{ fontSize: '10px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#000',
              border: '1px solid #333',
              borderRadius: '8px',
            }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#10b981" 
            fillOpacity={1}
            fill="url(#colorPrice)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

/**
 * Composition Component
 * Jupiter APIから取得した実際の価格を表示
 */
function Composition({ 
  composition, 
  formatPrice,
  isLoading 
}: { 
  composition: Array<{ token: { symbol: string; name: string; logoURI?: string }; weight: number }>;
  formatPrice: (symbol: string) => string;
  isLoading: boolean;
}) {
  if (!composition || composition.length === 0) {
    return (
      <Card className="bg-black/40 border-white/10 p-6">
        <div className="text-center text-neutral-500 py-8">
          No composition data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Composition</h3>
        <span className="text-sm text-neutral-500">{composition.length} Assets</span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 text-xs text-neutral-500 uppercase tracking-wider pb-2 border-b border-white/10">
          <div>Asset</div>
          <div className="text-right">Price</div>
          <div className="text-right">Weight</div>
        </div>

        {composition.map((item) => (
          <div key={item.token.symbol} className="grid grid-cols-3 items-center py-3 hover:bg-white/5 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              {item.token.logoURI ? (
                <img 
                  src={item.token.logoURI} 
                  alt={item.token.symbol}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                  {item.token.symbol[0]}
                </div>
              )}
              <div>
                <div className="font-bold text-sm">{item.token.symbol}</div>
                <div className="text-xs text-neutral-500">{item.token.name}</div>
              </div>
            </div>
            <div className="text-right font-mono text-sm">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : (
                formatPrice(item.token.symbol)
              )}
            </div>
            <div className="text-right font-bold text-emerald-400">{item.weight}%</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Vault Details Component
 */
function VaultDetails({ vaultId }: { vaultId: string }) {
  const copyAddress = () => {
    navigator.clipboard.writeText(vaultId);
    toast.success("Address copied!");
  };

  return (
    <Card className="bg-black/40 border-white/10 p-6">
      <h3 className="text-lg font-bold mb-6">Vault Details</h3>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Manager Fee</span>
          <span className="font-medium">0.10%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Withdrawal Fee</span>
          <span className="font-medium">0.00%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Last Rebalance</span>
          <span className="font-medium">2 days ago</span>
        </div>
        <div className="border-t border-white/10 pt-4">
          <div className="text-xs text-neutral-500 mb-2">Contract</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-black/60 rounded px-3 py-2">
              {vaultId.slice(0, 8)}...{vaultId.slice(-8)}
            </code>
            <button
              onClick={copyAddress}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <Copy size={14} className="text-neutral-400" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded transition-colors">
              <ExternalLink size={14} className="text-neutral-400" />
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
 * Displays comprehensive information about a specific vault
 * Based on the UI mockup showing:
 * - Vault header with price and performance
 * - Interactive price chart
 * - Swap panel for deposits/withdrawals
 * - Portfolio composition breakdown
 * - Vault details and metrics
 */
interface VaultData {
  id: string;
  name: string;
  symbol: string;
  image_url?: string;
  creator?: string;
  strategy_type?: string;
  status?: string;
  min_liquidity?: number;
  tvl?: number;
  apy?: number;
  composition?: Array<{ token: { symbol: string; name: string; logoURI?: string }; weight: number }>;
  priceChange?: number;
  holders?: number;
  volume24h?: number;
}

export default function VaultDetailPage({ params }: VaultDetailPageProps) {
  const { id } = use(params);
  const { vaults, fetchVaults } = useAxisStore();
  const [vault, setVault] = useState<VaultData | null>(null);

  // Vaultデータをストアから取得
  useEffect(() => {
    if (vaults.length === 0) {
      fetchVaults();
    }
  }, [vaults.length, fetchVaults]);

  // Derive vault data from vaults array - no setState needed
  const derivedVault = useMemo(() => {
    const found = vaults.find((v) => v.id === id);
    if (found) {
      return {
        ...found,
        priceChange: 11.2, // Mock data for now
        apy: found.apy || 18.2,
        holders: 1240,
        volume24h: 850000,
      } as VaultData;
    }
    return null;
  }, [vaults, id]);

  // Update local state only when derivedVault changes - syncing from derived state
  useEffect(() => {
    if (derivedVault) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing from derived vault data
      setVault(derivedVault);
    }
  }, [derivedVault]);

  // Jupiter APIから価格を取得
  const composition = vault?.composition || [];
  const { unitPrice, isLoading: pricesLoading, formatPrice } = useVaultPrice(
    composition,
    vault?.min_liquidity || vault?.tvl || 0
  );

  if (!vault) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AppLayout>
    );
  }

  // 表示用の価格を計算
  const displayPrice = unitPrice > 0 ? unitPrice : (vault.min_liquidity || vault.tvl || 0) / 100;

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-6">
        {/* Vault Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            {vault.image_url ? (
              <img 
                src={vault.image_url} 
                alt={vault.symbol}
                className="w-16 h-16 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold">
                {vault.symbol?.[0] || "V"}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-serif font-bold">{vault.name}</h1>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <span>Created by {vault.creator?.slice(0, 8)}...</span>
                <span>•</span>
                <span>{vault.strategy_type || "Quarterly"}</span>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                  {vault.status || "Active"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold">
              {pricesLoading ? (
                <Loader2 className="w-8 h-8 animate-spin inline" />
              ) : (
                `$${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </span>
            <span className="text-xl text-emerald-400 flex items-center gap-1">
              <TrendingUp size={20} />
              +{vault.priceChange}% (Past 30d)
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="TVL" 
            value={`$${((vault.min_liquidity || vault.tvl || 0) / 1000).toFixed(1)}K`}
            icon={<Activity size={16} className="text-neutral-500" />}
          />
          <StatCard 
            label="APY (Past)" 
            value={`${vault.apy}%`}
            icon={<TrendingUp size={16} className="text-emerald-400" />}
            positive
          />
          <StatCard 
            label="Holders" 
            value={(vault.holders ?? 0).toLocaleString()}
            icon={<Users size={16} className="text-neutral-500" />}
          />
          <StatCard 
            label="24h Volume" 
            value={`$${((vault.volume24h ?? 0) / 1000).toFixed(0)}K`}
            icon={<Clock size={16} className="text-neutral-500" />}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <PriceChart />
            <Composition 
              composition={composition}
              formatPrice={formatPrice}
              isLoading={pricesLoading}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SwapPanel 
              vaultId={id}
              vaultSymbol={vault.symbol}
              vaultPrice={displayPrice}
            />
            <VaultDetails vaultId={id} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
