"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxisStore, Vault } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, Share2, Loader2, 
  Settings2, ArrowDownUp, Wallet, ChevronDown
} from "lucide-react";
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer 
} from 'recharts';
import { toast } from "sonner";

// ... (generateChartData関数はそのまま)
const generateChartData = () => {
  const data = [];
  let val = 100;
  for (let i = 0; i < 50; i++) {
    val = val * (1 + (Math.random() * 0.08 - 0.035)); 
    data.push({ date: i, value: val });
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
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  
  const [swapDirection, setSwapDirection] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    if (vaults.length === 0) fetchVaults();
  }, [fetchVaults, vaults.length]);

  useEffect(() => {
    const found = vaults.find(v => v.id === id);
    if (found) setVault(found);
  }, [vaults, id]);

  const tokenPrice = 124.53; 
  const numericAmount = parseFloat(amount) || 0;
  const receiveAmount = swapDirection === "deposit" ? numericAmount / tokenPrice : numericAmount * tokenPrice;
  const priceChange = 4.25; 
  const priceChangePercent = 3.52; 
  const isPositive = priceChange >= 0;

  const handleSwap = async () => {
    if (!publicKey) return toast.error("Connect wallet first");
    setIsSwapping(true);
    setTimeout(() => {
      if (vault && swapDirection === "deposit") depositToVault(vault.id, numericAmount);
      toast.success("Transaction Confirmed");
      setAmount("");
      setIsSwapping(false);
      setIsSwapOpen(false); 
    }, 1500);
  };

  const handleMax = () => {
    setAmount(swapDirection === "deposit" ? usdcBalance.toString() : "10");
  };

  if (!vault) return <div className="min-h-screen flex items-center justify-center "><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    // ★ 修正: 下部余白を増やして、ボタンに隠れないようにする (pb-48)
    <div className="min-h-screen text-white font-sans pb-48">
      
      {/* 1. Header */}
      <div className="sticky top-0 z-40  backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 -ml-2">
          <ArrowLeft size={24} />
        </Button>
        <div className="flex flex-col items-center">
            <span className="font-bold text-sm">{vault.name}</span>
            <span className="text-[10px] text-neutral-500">{vault.symbol}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -mr-2">
          <Share2 size={24} />
        </Button>
      </div>

      <div className="px-6 pt-6 max-w-md mx-auto">
        
        {/* 2. Hero Section */}
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
                <Avatar className="w-10 h-10 border border-white/10">
                    <AvatarImage src={vault.image_url} className="object-cover" />
                    <AvatarFallback className="bg-neutral-900 font-bold text-neutral-500">{vault.symbol[0]}</AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold tracking-tight">${tokenPrice.toFixed(2)}</h1>
            </div>
            
            <div className={`flex items-center gap-2 font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                <span className="text-lg">{isPositive ? "+" : "-"}${Math.abs(priceChange).toFixed(2)}</span>
                <span className="text-sm">({Math.abs(priceChangePercent).toFixed(2)}%)</span>
            </div>
        </div>

        {/* 3. Chart Section */}
        <div className="h-[250px] w-full -mx-2 mb-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <Tooltip content={() => null} cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={isPositive ? "#10b981" : "#ef4444"} 
                    strokeWidth={2} 
                    fill="url(#colorValue)" 
                />
                </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* Time Range Tabs */}
        <Tabs defaultValue="1D" className="mb-8">
            <TabsList className="bg-transparent p-0 w-full flex justify-between border-b border-white/10 rounded-none h-10">
                {["1H", "1D", "1W", "1M", "1Y"].map((period) => (
                    <TabsTrigger 
                        key={period} 
                        value={period}
                        className="flex-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-400 data-[state=active]:font-bold text-neutral-500 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 transition-none"
                    >
                        {period}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>

        {/* 4. Stats & Holdings */}
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#111] rounded-2xl border border-white/5">
                    <div className="text-xs text-neutral-500 mb-1">TVL</div>
                    <div className="text-lg font-mono font-medium text-white">${vault.min_liquidity?.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-[#111] rounded-2xl border border-white/5">
                    <div className="text-xs text-neutral-500 mb-1">APY</div>
                    <div className="text-lg font-mono font-medium text-emerald-400">12.4%</div>
                </div>
                <div className="p-4 bg-[#111] rounded-2xl border border-white/5">
                    <div className="text-xs text-neutral-500 mb-1">24h Vol</div>
                    <div className="text-lg font-mono font-medium text-white">$2.4M</div>
                </div>
                <div className="p-4 bg-[#111] rounded-2xl border border-white/5">
                    <div className="text-xs text-neutral-500 mb-1">Holders</div>
                    <div className="text-lg font-mono font-medium text-white">1,240</div>
                </div>
            </div>

            {/* Description */}
            <div>
                <h3 className="text-lg font-bold text-white mb-2">About {vault.symbol}</h3>
                <div className="text-sm text-neutral-400 leading-relaxed">
                    <p className="line-clamp-3">{vault.description || "This vault strategy focuses on maximizing yield through a diversified basket of Solana ecosystem assets."}</p>
                </div>
            </div>

            {/* Top Holdings */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Top Holdings</h3>
                <div className="space-y-3">
                    {vault.composition?.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={item.token.logoURI} alt={item.token.symbol} className="object-cover"/>
                                    <AvatarFallback className="bg-neutral-800 text-xs text-neutral-500">{item.token.symbol[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-sm text-white">{item.token.name}</div>
                                    <div className="text-xs text-neutral-500">{item.token.symbol}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-sm text-white">{item.weight}%</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* 5. Sticky Bottom Action Bar (Floating above Bottom Nav) */}
      {/* ★ 修正: bottom-24 にして Bottom Nav の上に配置 */}
      <div className="fixed bottom-24 left-0 w-full px-4 z-40 pointer-events-none">
         <div className="max-w-md mx-auto pointer-events-auto">
            <Sheet open={isSwapOpen} onOpenChange={setIsSwapOpen}>
                <SheetTrigger asChild>
                    <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-black font-bold text-lg hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                        Swap
                    </Button>
                </SheetTrigger>
                
                {/* 6. Swap Modal */}
                <SheetContent side="bottom" className="bg-[#111] border-t border-white/10 rounded-t-[32px] p-6 pb-12 z-[100]">
                    {/* ... (Modal content is the same) ... */}
                    <SheetHeader className="mb-6 flex flex-row items-center justify-between">
                        <SheetTitle className="text-white text-xl font-bold">Swap</SheetTitle>
                        <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-white">
                            <Settings2 size={18} />
                        </Button>
                    </SheetHeader>

                    <div className="space-y-2">
                        {/* FROM Input */}
                        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5">
                            <div className="flex justify-between text-xs text-neutral-500 mb-2">
                                <span>You pay</span>
                                <span className="text-emerald-400 cursor-pointer" onClick={handleMax}>
                                    Balance: {swapDirection === "deposit" ? usdcBalance : "10.0"}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-transparent border-none text-4xl font-bold text-white p-0 h-auto placeholder:text-neutral-700 focus-visible:ring-0"
                                />
                                <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                                    <img src={swapDirection === "deposit" ? "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" : vault.image_url} className="w-6 h-6 rounded-full"/>
                                    <span className="font-bold">{swapDirection === "deposit" ? "USDC" : vault.symbol}</span>
                                    <ChevronDown size={14} className="text-neutral-500"/>
                                </div>
                            </div>
                            <div className="text-xs text-neutral-500 mt-2">
                                ${numericAmount > 0 ? numericAmount.toFixed(2) : "0.00"}
                            </div>
                        </div>

                        {/* Switch Arrow */}
                        <div className="flex justify-center -my-4 relative z-10">
                            <button 
                                onClick={() => {
                                    setSwapDirection(prev => prev === "deposit" ? "withdraw" : "deposit");
                                    setAmount("");
                                }}
                                className="bg-[#111] border border-white/10 p-2 rounded-xl text-white hover:scale-110 transition-transform"
                            >
                                <ArrowDownUp size={20} />
                            </button>
                        </div>

                        {/* TO Input */}
                        <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5">
                            <div className="flex justify-between text-xs text-neutral-500 mb-2">
                                <span>You receive</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 text-4xl font-bold text-neutral-400">
                                    {numericAmount > 0 ? receiveAmount.toFixed(4) : "0"}
                                </div>
                                <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-full border border-white/10 shrink-0">
                                    <img src={swapDirection === "deposit" ? vault.image_url : "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"} className="w-6 h-6 rounded-full"/>
                                    <span className="font-bold">{swapDirection === "deposit" ? vault.symbol : "USDC"}</span>
                                    <ChevronDown size={14} className="text-neutral-500"/>
                                </div>
                            </div>
                            <div className="text-xs text-neutral-500 mt-2">
                                ${numericAmount > 0 ? (numericAmount * 0.99).toFixed(2) : "0.00"} (-0.5% fee)
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl border border-white/5 bg-white/5">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-neutral-400">Rate</span>
                            <span className="text-white font-mono">1 {vault.symbol} = ${tokenPrice}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-400">Network Cost</span>
                            <span className="text-white flex items-center gap-1"><Wallet size={10}/> ~$0.002</span>
                        </div>
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full mt-6 h-14 rounded-2xl text-lg font-bold bg-emerald-500 text-black hover:bg-emerald-400"
                        onClick={handleSwap}
                        disabled={isSwapping}
                    >
                        {isSwapping ? <Loader2 className="animate-spin" /> : "Review Swap"}
                    </Button>
                </SheetContent>
            </Sheet>
         </div>
      </div>

    </div>
  );
}