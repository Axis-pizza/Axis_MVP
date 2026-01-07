"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Download, Play, Settings } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

// ==========================================
// Types
// ==========================================

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

interface AssetRow {
  symbol: string;
  weight: string;
  sector: string;
  contribution: string;
  alpha: string;
  beta: string;
  sortino: string;
  treynor: string;
  infoRatio: string;
}

// ==========================================
// Sub Components
// ==========================================

/**
 * Metric Card Component
 * Displays key performance metrics
 */
function MetricCard({ label, value, change, positive }: MetricCardProps) {
  return (
    <Card className="border-white/10 bg-white/5 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="font-mono text-xl font-bold text-white">{value}</div>
        {change && (
          <div className={`text-xs ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {change}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Performance Chart Component
 * Displays strategy vs benchmark comparison
 */
function PerformanceChart() {
  return (
    <Card className="border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Performance Analysis</h3>
          <div className="mt-1 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-neutral-400">Strategy (Benchmark SOL)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-neutral-400">ETF</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-xs">
            Live Portfolio
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 text-xs">
            Backtest Results
          </Button>
        </div>
      </div>
      
      {/* Chart placeholder */}
      <div className="h-64 rounded-lg bg-neutral-900/50 p-4">
        <div className="flex h-full items-end justify-between gap-2">
          {/* Simplified chart visualization */}
          {[65, 70, 68, 75, 72, 80, 85, 82, 88, 90, 87, 92].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1">
              <div 
                className="w-full bg-emerald-500/50 rounded-t"
                style={{ height: `${height}%` }}
              />
              <div 
                className="w-full bg-purple-500/50 rounded-t"
                style={{ height: `${height - 10}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 flex justify-between text-[10px] text-neutral-600">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
      </div>
    </Card>
  );
}

/**
 * Strategy Engine Component
 * Configuration panel for strategy parameters
 */
function StrategyEngine() {
  return (
    <Card className="border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center gap-2">
        <Settings size={16} className="text-emerald-500" />
        <h3 className="font-bold text-white">Strategy Engine</h3>
      </div>
      
      <div className="space-y-4">
        {/* Rebalancing Logic */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">
            REBALANCING LOGIC
          </label>
          <Select defaultValue="mcap-capped">
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-neutral-900">
              <SelectItem value="mcap-capped">Market Cap Weighted (Capped)</SelectItem>
              <SelectItem value="equal">Equal Weight</SelectItem>
              <SelectItem value="risk-parity">Risk Parity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Max Cap Threshold */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">
            MAX CAP <span className="text-neutral-600">THRESHOLD</span>
          </label>
          <div className="flex gap-2">
            <Input 
              type="number" 
              defaultValue="20"
              className="border-white/10 bg-white/5 text-white"
            />
            <span className="flex items-center text-neutral-500">%</span>
            <Input 
              type="number" 
              defaultValue="2.5"
              className="border-white/10 bg-white/5 text-white"
            />
            <span className="flex items-center text-neutral-500">%</span>
          </div>
        </div>
        
        {/* Asset Universe */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">
            ASSET UNIVERSE (WHITELIST)
          </label>
          <div className="flex flex-wrap gap-2">
            {["SOL", "JUP", "JTO", "PYTH", "BONK"].map((token) => (
              <Badge 
                key={token}
                variant="outline" 
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              >
                {token}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
            <Play size={14} className="mr-2" />
            Run Backtest
          </Button>
          <Button variant="outline" className="w-full border-white/10 text-white">
            <Download size={14} className="mr-2" />
            Export Report
          </Button>
        </div>
        
        {/* Output Log */}
        <div className="space-y-2 pt-4">
          <label className="text-xs font-medium text-neutral-400">
            OUTPUT LOG
          </label>
          <div className="h-32 overflow-y-auto rounded-lg border border-white/10 bg-black p-3 font-mono text-[10px] text-neutral-500">
            <div>[10:54:03] Initializing Strategy Engine v2.1...</div>
            <div>[10:54:05] Loading historical data (365 days)... OK</div>
            <div>[10:54:07] Applying filters (Mcap &gt; $100M, Vol &gt; $1M)...</div>
            <div>[10:54:10] Simulating Q1 Rebalance...</div>
            <div className="text-emerald-400">[10:54:12] SELL: 450 BONK → BUY: 25 JUP</div>
            <div>[10:54:14] Calculating complete. Final AUUM...</div>
            <div className="text-neutral-400">[10:54:15] $4,240,500 (+24.8% vs SOL)</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Risk Attribution Component
 * Detailed asset breakdown and risk metrics
 */
function RiskAttribution() {
  const assets: AssetRow[] = [
    { 
      symbol: "SOL", 
      weight: "35.0%", 
      sector: "L1", 
      contribution: "+1.2%",
      alpha: "+4.2%",
      beta: "0.85",
      sortino: "3.1",
      treynor: "1.2",
      infoRatio: "1.2"
    },
    { 
      symbol: "JUP", 
      weight: "15.0%", 
      sector: "DeFi", 
      contribution: "+0.8%",
      alpha: "+0.8%",
      beta: "2.7",
      sortino: "-3.1",
      treynor: "0.15",
      infoRatio: "1.25"
    },
    { 
      symbol: "JTO", 
      weight: "10.0%", 
      sector: "L2/J", 
      contribution: "-1.2%",
      alpha: "-3.1",
      beta: "0.85",
      sortino: "3.1",
      treynor: "0.15",
      infoRatio: "1.25"
    },
    { 
      symbol: "PYTH", 
      weight: "8.0%", 
      sector: "Infra", 
      contribution: "+0.1%",
      alpha: "+0.8%",
      beta: "2.7",
      sortino: "-3.1",
      treynor: "0.15",
      infoRatio: "1.25"
    },
    { 
      symbol: "BONK", 
      weight: "7.0%", 
      sector: "Meme", 
      contribution: "+1.5%",
      alpha: "2.1%",
      beta: "1.5",
      sortino: "1.5",
      treynor: "-0.2",
      infoRatio: "-0.2"
    },
  ];

  return (
    <Card className="border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <BarChart3 size={16} className="text-emerald-500" />
          Risk & Attribution
        </h3>
        <Button variant="ghost" size="sm" className="text-xs text-emerald-400">
          <Download size={12} className="mr-1" />
          Export CSV
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase text-neutral-500">
              <th className="pb-2 font-medium">Asset</th>
              <th className="pb-2 font-medium">Weight</th>
              <th className="pb-2 font-medium">Sector</th>
              <th className="pb-2 font-medium">Contrib.</th>
              <th className="pb-2 font-medium">Alpha</th>
              <th className="pb-2 font-medium">Beta</th>
              <th className="pb-2 font-medium">Sortino</th>
              <th className="pb-2 font-medium">Treynor</th>
              <th className="pb-2 font-medium">Info Ratio</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.symbol} className="border-b border-white/5">
                <td className="py-3 font-bold text-emerald-400">{asset.symbol}</td>
                <td className="py-3 text-white">{asset.weight}</td>
                <td className="py-3 text-neutral-400">{asset.sector}</td>
                <td className={`py-3 font-medium ${asset.contribution.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {asset.contribution}
                </td>
                <td className={`py-3 ${asset.alpha.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {asset.alpha}
                </td>
                <td className="py-3 text-white">{asset.beta}</td>
                <td className="py-3 text-white">{asset.sortino}</td>
                <td className="py-3 text-white">{asset.treynor}</td>
                <td className="py-3 text-white">{asset.infoRatio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ==========================================
// Main Component
// ==========================================

/**
 * Curator Studio Page
 * 
 * Professional-grade ETF creation and backtesting tool
 * For institutional investors and fund managers
 * 
 * Features:
 * - Advanced performance analysis
 * - Strategy engine with customizable parameters
 * - Comprehensive risk attribution metrics
 * - Historical backtesting
 * - Professional reporting
 */
export default function CuratorStudioPage() {
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-emerald-400">
              AXIS CURATOR STUDIO
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              v 2.4.0-build
            </Badge>
          </div>
          <p className="text-sm text-neutral-500">
            Professional ETF Creation & Backtesting Platform
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Connected: Solana Mainnet</span>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="mb-6 grid grid-cols-6 gap-4">
          <MetricCard label="STRATEGY AUM" value="$4,240,500" change="+24.23%" positive />
          <MetricCard label="UNIT PRICE (NAV)" value="$0.9342" change="-0.03%" />
          <MetricCard label="SHARPE RATIO" value="2.45" />
          <MetricCard label="MAX DRAWDOWN" value="-12.40%" />
          <MetricCard label="BETA (VS SOL)" value="0.85" />
          <MetricCard label="ACTIVE WALLETS" value="1,240" change="+12.40%" positive />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="border-b border-white/10 bg-transparent">
            <TabsTrigger value="performance" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
              Performance Analysis
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500">
              Backtest Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            {/* Main Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Chart - 2 columns */}
              <div className="col-span-2">
                <PerformanceChart />
              </div>

              {/* Strategy Engine - 1 column */}
              <div>
                <StrategyEngine />
              </div>
            </div>

            {/* Risk Attribution - Full Width */}
            <RiskAttribution />
          </TabsContent>

          <TabsContent value="backtest">
            <Card className="border-white/10 bg-black p-8 text-center">
              <p className="text-neutral-500">Backtest results will be displayed here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
