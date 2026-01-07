"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { SwapPanel } from "@/components/vault/SwapPanel";
import {
  TrendingUp,
  Clock,
  Users,
  Activity,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
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

const MOCK_COMPOSITION = [
  { symbol: "SOL", name: "Solana", price: "$145.2", change: "+2.4%", weight: 35, logo: "/tokens/sol.png" },
  { symbol: "JUP", name: "Jupiter", price: "$1.12", change: "+5.1%", weight: 15, logo: "/tokens/jup.png" },
  { symbol: "JTO", name: "Jito", price: "$3.45", change: "-1.2%", weight: 10, logo: "/tokens/jto.png" },
  { symbol: "PYTH", name: "Pyth Network", price: "$0.45", change: "+0.8%", weight: 8, logo: "/tokens/pyth.png" },
];

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
 */
function Composition() {
  return (
    <Card className="bg-black/40 border-white/10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Composition</h3>
        <span className="text-sm text-neutral-500">10 Assets</span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-4 text-xs text-neutral-500 uppercase tracking-wider pb-2 border-b border-white/10">
          <div>Asset</div>
          <div className="text-right">Price</div>
          <div className="text-right">24h</div>
          <div className="text-right">Weight</div>
        </div>

        {MOCK_COMPOSITION.map((asset) => (
          <div key={asset.symbol} className="grid grid-cols-4 items-center py-3 hover:bg-white/5 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                {asset.symbol[0]}
              </div>
              <div>
                <div className="font-bold text-sm">{asset.symbol}</div>
                <div className="text-xs text-neutral-500">{asset.name}</div>
              </div>
            </div>
            <div className="text-right font-mono text-sm">{asset.price}</div>
            <div className={`text-right text-sm font-medium ${asset.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
              {asset.change}
            </div>
            <div className="text-right font-bold text-emerald-400">{asset.weight}%</div>
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
export default function VaultDetailPage({ params }: VaultDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [vault, setVault] = useState<any>(null);

  useEffect(() => {
    // TODO: Fetch actual vault data
    setVault({
      id,
      name: "Axis Index",
      symbol: "AXIX",
      creator: "Axis Team",
      strategy: "Quarterly Rebalancing",
      price: 0.90,
      priceChange: 11.2,
      tvl: 4200000,
      apy: 18.2,
      holders: 1240,
      volume24h: 850000,
    });
  }, [id]);

  if (!vault) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-6">
        {/* Vault Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold">
              {vault.symbol[0]}
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold">{vault.name}</h1>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <span>Created by {vault.creator}</span>
                <span>•</span>
                <span>{vault.strategy}</span>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                  Official
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold">${vault.price.toFixed(2)}</span>
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
            value={`$${(vault.tvl / 1000000).toFixed(1)}M`}
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
            value={vault.holders.toLocaleString()}
            icon={<Users size={16} className="text-neutral-500" />}
          />
          <StatCard 
            label="24h Volume" 
            value={`$${(vault.volume24h / 1000).toFixed(0)}K`}
            icon={<Clock size={16} className="text-neutral-500" />}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <PriceChart />
            <Composition />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SwapPanel vaultId={id} />
            <VaultDetails vaultId={id} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
