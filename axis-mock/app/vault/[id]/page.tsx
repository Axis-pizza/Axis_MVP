"use client";


import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxisStore, Vault } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, TrendingUp, Wallet, ArrowDownUp, Share2, 
  Activity, Loader2, Settings2, Info, AlertTriangle, RefreshCw 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { toast } from "sonner";

// --- Mock Chart Data ---
const generateChartData = () => {
  const data = [];
  let val = 100;
  for (let i = 0; i < 30; i++) {
    val = val * (1 + (Math.random() * 0.1 - 0.04));
    data.push({ date: `Day ${i+1}`, value: val });
  }
  return data;
};

export default function VaultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const { vaults, usdcBalance, fetchVaults, depositToVault } = useAxisStore();
  const { publicKey } = useWallet();

  const [vault, setVault] = useState<Vault | null>(null);
  const [chartData] = useState(generateChartData());
  
  // --- Swap Widget State ---
  const [swapDirection, setSwapDirection] = useState<"deposit" | "withdraw">("deposit"); // deposit = USDC->Vault, withdraw = Vault->USDC
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(30);

  // --- Initialization ---
  useEffect(() => {
    if (vaults.length === 0) fetchVaults();
  }, [fetchVaults, vaults.length]);

  useEffect(() => {
    const found = vaults.find(v => v.id === id);
    if (found) setVault(found);
  }, [vaults, id]);

  // Price Refresh Timer Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimer((prev) => (prev <= 0 ? 30 : prev - 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // --- Calculations ---
  const tokenPrice = 1.24; // Mock Price
  const numericAmount = parseFloat(amount) || 0;
  
  // 入力に対する計算
  const receiveAmount = swapDirection === "deposit" 
    ? numericAmount / tokenPrice 
    : numericAmount * tokenPrice;
  
  const tradingFee = numericAmount * 0.005; // 0.5%
  const priceImpact = numericAmount > 10000 ? 1.2 : 0.1; // Mock Impact

  // --- Handlers ---
  const handleSwapDirection = () => {
    setSwapDirection(prev => prev === "deposit" ? "withdraw" : "deposit");
    setAmount(""); // 方向転換時はクリア
  };

  const handleMax = () => {
    if (swapDirection === "deposit") {
      setAmount(usdcBalance.toString());
    } else {
      // Mock: Vault Token Balance (実際はStoreから取得)
      setAmount("100"); 
    }
  };

  const handleShare = () => {
    if (!vault) return;
    const text = `Check out ${vault.name} ($${vault.symbol}) on Axis Protocol. The next gen ETF on Solana.`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSwap = async () => {
    if (!publicKey) return toast.error("Please connect wallet first.");
    if (numericAmount <= 0) return toast.error("Enter valid amount.");
    
    if (swapDirection === "deposit" && numericAmount > usdcBalance) {
      return toast.error("Insufficient USDC balance.");
    }

    setIsSwapping(true);
    setTimeout(() => {
      if (swapDirection === "deposit") {
        depositToVault(vault!.id, numericAmount);
        toast.success(`Successfully swapped ${amount} USDC for ${vault?.symbol}`);
      } else {
        toast.success(`Successfully swapped ${amount} ${vault?.symbol} for USDC`);
      }
      setAmount("");
      setIsSwapping(false);
    }, 2000);
  };

  if (!vault) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* --- Header --- */}
      <div className="pt-8 flex flex-col gap-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="w-fit text-neutral-400 hover:text-white pl-0 hover:bg-transparent"
        >
          <ArrowLeft className="mr-2" size={18} /> Back to Market
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {vault.image_url ? (
                  <img src={vault.image_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold font-serif text-neutral-600">{vault.symbol[0]}</span>
                )}
             </div>
             <div>
               <h1 className="text-3xl md:text-4xl font-bold font-serif text-white tracking-tight">{vault.name}</h1>
               <div className="flex items-center gap-3 mt-1">
                 <Badge variant="secondary" className="bg-white/10 text-white border-white/10 text-xs px-2">
                   {vault.symbol}
                 </Badge>
                 <span className="text-sm text-neutral-500">
                    Created by {vault.creator.slice(0,4)}...{vault.creator.slice(-4)}
                 </span>
               </div>
             </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleShare}
            className="border-white/10 bg-black hover:bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <Share2 size={18} className="mr-2" /> Share on X
          </Button>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LEFT COLUMN: Chart & Info === */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-[#0A0A0A] border-white/10 shadow-2xl overflow-hidden">
             {/* Stats Row */}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-white/5 bg-white/[0.02]">
                <div>
                   <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">Price</div>
                   <div className="text-2xl font-mono text-white">${tokenPrice.toFixed(2)}</div>
                </div>
                <div>
                   <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">APY (Est.)</div>
                   <div className="text-2xl font-mono text-emerald-400">12.4%</div>
                </div>
                <div>
                   <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">TVL</div>
                   <div className="text-2xl font-mono text-white">${vault.min_liquidity?.toLocaleString() || "0"}</div>
                </div>
                <div>
                   <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider mb-1">24h Change</div>
                   <div className="text-2xl font-mono text-emerald-400 flex items-center">
                     <TrendingUp size={16} className="mr-1" /> +2.4%
                   </div>
                </div>
             </div>
             {/* Chart */}
             <div className="p-6 h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </Card>

          {/* Info Tabs */}
          <Tabs defaultValue="composition" className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 mb-6">
              <TabsTrigger value="composition" className="font-serif w-32">Composition</TabsTrigger>
              <TabsTrigger value="strategy" className="font-serif w-32">Strategy</TabsTrigger>
              <TabsTrigger value="risk" className="font-serif w-32">Risk</TabsTrigger>
            </TabsList>

            <TabsContent value="composition" className="space-y-4 animate-in fade-in">
              <Card className="bg-[#0A0A0A] border-white/10 p-6">
                <h3 className="text-lg font-bold font-serif text-white mb-6 flex items-center gap-2">
                   <Activity size={18} className="text-emerald-400" /> Asset Allocation
                </h3>
                <div className="space-y-4">
                  {vault.composition && vault.composition.length > 0 ? (
                    vault.composition.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-white/5 p-1.5 border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                              <img src={item.token.logoURI} className="w-full h-full rounded-full object-cover" />
                           </div>
                           <div>
                             <div className="font-bold text-white">{item.token.symbol}</div>
                             <div className="text-xs text-neutral-500">{item.token.name}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4 w-1/3 justify-end">
                           <Progress value={item.weight} className="h-2 w-24 bg-white/5" indicatorClassName="bg-emerald-500" />
                           <span className="font-mono text-white w-12 text-right">{item.weight}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-500 text-center py-8">No composition data available.</div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="strategy" className="animate-in fade-in">
              <Card className="bg-[#0A0A0A] border-white/10 p-6">
                <h3 className="text-lg font-bold font-serif text-white mb-4">Investment Strategy</h3>
                <p className="text-neutral-400 leading-relaxed font-serif">
                  {vault.description || "No description provided."}
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Rebalance Type</div>
                      <div className="text-white font-medium">Momentum Based</div>
                   </div>
                   <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                      <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Frequency</div>
                      <div className="text-white font-medium">Weekly / Threshold</div>
                   </div>
                </div>
              </Card>
            </TabsContent>

            {/* Fixed Risk Tab */}
            <TabsContent value="risk" className="animate-in fade-in">
              <Card className="bg-[#0A0A0A] border-white/10 p-6 space-y-6">
                <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                   <AlertTriangle className="text-yellow-500" size={18} /> Risk Disclosure
                </h3>
                
                <div className="space-y-4 text-sm text-neutral-400 leading-relaxed font-serif">
                  <div className="p-4 bg-yellow-950/10 border border-yellow-900/20 rounded-lg">
                    <h4 className="text-yellow-500 font-bold mb-1">Smart Contract Risk</h4>
                    <p>
                      While Axis Protocol undergoes rigorous audits, smart contracts are experimental technology. 
                      Unforeseen bugs or vulnerabilities could lead to loss of funds.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-lg">
                    <h4 className="text-white font-bold mb-1">Market Volatility</h4>
                    <p>
                      Crypto assets are highly volatile. The value of this ETF can fluctuate significantly 
                      based on the performance of underlying assets. Past performance is not indicative of future results.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-lg">
                    <h4 className="text-white font-bold mb-1">Liquidity Risk</h4>
                    <p>
                      Under extreme market conditions, liquidity for underlying assets may dry up, 
                      potentially causing delays in rebalancing or withdrawals.
                    </p>
                  </div>

                  <p className="text-xs text-neutral-600 italic mt-4">
                    By depositing into this vault, you acknowledge that you have read and understood these risks.
                    Axis Protocol is not responsible for any financial losses incurred.
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>


        {/* === RIGHT COLUMN: Advanced Swap Widget === */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            
            <Card className="bg-[#0E0E0E] border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
               
               {/* Widget Header */}
               <div className="p-4 border-b border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Button size="sm" variant="ghost" className="h-8 px-2 text-neutral-500 hover:text-white border border-white/5 bg-white/5 text-xs">
                     Slippage: 1% <Settings2 size={12} className="ml-1" />
                   </Button>
                 </div>
                 {/* 30s Refresh Timer Animation */}
                 <div className="relative w-6 h-6 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="text-neutral-800" />
                      <circle 
                        cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none" 
                        strokeDasharray="62.8"
                        strokeDashoffset={62.8 * (1 - refreshTimer / 30)}
                        className="transition-all duration-100 ease-linear"
                      />
                    </svg>
                 </div>
               </div>

               <CardContent className="p-5 space-y-1">
                  
                  {/* FROM Section */}
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                     <div className="flex justify-between text-xs text-neutral-500 mb-2">
                        <span className="font-bold">{swapDirection === "deposit" ? "Sell" : "Sell"}</span>
                        <div className="flex gap-2">
                           <span>Avail: {swapDirection === "deposit" ? usdcBalance.toLocaleString() : "100.00"}</span>
                           <button onClick={handleMax} className="text-emerald-500 hover:text-emerald-400 font-bold text-[10px] bg-emerald-950/30 px-1.5 rounded">MAX</button>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Input 
                           type="number" 
                           placeholder="0.00" 
                           value={amount}
                           onChange={(e) => setAmount(e.target.value)}
                           className="border-none bg-transparent text-2xl font-mono font-bold text-white p-0 h-auto focus-visible:ring-0 placeholder:text-neutral-700"
                        />
                        <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                           <img 
                              src={swapDirection === "deposit" ? "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" : vault.image_url} 
                              className="w-5 h-5 rounded-full" 
                           />
                           <span className="font-bold text-sm text-white">{swapDirection === "deposit" ? "USDC" : vault.symbol}</span>
                        </div>
                     </div>
                  </div>

                  {/* Switch Arrow (Animated) */}
                  <div className="flex justify-center -my-3 relative z-10">
                    <button 
                       onClick={handleSwapDirection}
                       className="bg-neutral-900 border border-white/10 p-2 rounded-lg text-neutral-400 hover:text-white hover:border-emerald-500/50 transition-all active:scale-95 group"
                    >
                       <ArrowDownUp size={16} className={`transition-transform duration-500 ${swapDirection === "withdraw" ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* TO Section */}
                  <div className="bg-black/40 rounded-xl p-4 pt-5 border border-white/5 hover:border-white/10 transition-colors">
                     <div className="flex justify-between text-xs text-neutral-500 mb-2">
                        <span className="font-bold">{swapDirection === "deposit" ? "Buy" : "Buy"}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="flex-1 text-2xl font-mono font-bold text-neutral-400 truncate">
                           {numericAmount > 0 ? receiveAmount.toFixed(4) : "0.00"}
                        </div>
                        <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                           <img 
                              src={swapDirection === "deposit" ? vault.image_url : "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"} 
                              className="w-5 h-5 rounded-full" 
                           />
                           <span className="font-bold text-sm text-white">{swapDirection === "deposit" ? vault.symbol : "USDC"}</span>
                        </div>
                     </div>
                  </div>

                  {/* Dynamic Details */}
                  <div className="pt-4 px-2 space-y-3">
                     <div className="flex justify-between text-xs">
                        <span className="text-neutral-500 border-b border-dashed border-neutral-700 cursor-help">Effective Implied APY</span>
                        <span className="text-red-400 font-mono">-12.5%</span> 
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Trading Fee (0.5%)</span>
                        <span className="text-white font-mono flex items-center gap-1">
                           {tradingFee.toFixed(2)} <span className="text-neutral-600">USDC</span>
                        </span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Price per {vault.symbol}</span>
                        <span className="text-white font-mono flex items-center gap-1">
                           {tokenPrice} <span className="text-neutral-600">USDC</span>
                        </span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Price Impact</span>
                        <span className={`${priceImpact > 1 ? "text-yellow-500" : "text-emerald-400"} font-mono`}>
                           {priceImpact}%
                        </span>
                     </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                     <Button 
                       size="lg" 
                       onClick={handleSwap}
                       disabled={isSwapping}
                       className="w-full h-14 font-bold text-lg rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg transition-all"
                     >
                       {isSwapping ? <Loader2 className="animate-spin" /> : "SWAP"}
                     </Button>
                  </div>

                  {/* Summary Box */}
                  <div className="mt-4 p-4 rounded-xl border border-sky-500/20 bg-sky-950/10 text-center space-y-1">
                     <div className="text-xs text-neutral-400">You will receive</div>
                     <div className="text-xl font-bold text-white font-mono">
                        {numericAmount > 0 ? receiveAmount.toFixed(4) : "0.00"} <span className="text-sm">{swapDirection === "deposit" ? vault.symbol : "USDC"}</span>
                     </div>
                     <div className="text-[10px] text-neutral-500">
                        (≈ ${numericAmount > 0 ? (numericAmount * 0.995).toFixed(2) : "0.00"} Value)
                     </div>
                  </div>

               </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}