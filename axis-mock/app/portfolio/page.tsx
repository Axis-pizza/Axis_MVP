"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAxisStore } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from "recharts";
import { 
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, 
  PieChart as PieIcon, LayoutDashboard, Twitter, Copy, Check, Users, Gift 
} from "lucide-react";
import { toast } from "sonner";

// ローカルAPI
const API_URL = "http://localhost:8787";

export default function PortfolioPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { vaults, positions, usdcBalance, email, fetchVaults, fetchBalances } = useAxisStore();

  // Invite State
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // データ初期化
  useEffect(() => {
    fetchVaults();
    if (publicKey) fetchBalances();
  }, [publicKey, fetchVaults, fetchBalances]);

  // 招待コード取得
  useEffect(() => {
    if (email) {
      fetch(`${API_URL}/my-invites?email=${email}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMyInvites(data);
        })
        .catch(err => console.error("Failed to fetch invites:", err));
    }
  }, [email]);

  // --- Handlers ---

  const handleShareInvite = (code: string) => {
    const text = `I'm inviting @friend to join the @Axis__Solana closed beta.\n\nThe first on-chain ETF protocol.\n\nMy Access Code: ${code}\n\n#AxisProtocol #Solana`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // --- Data Calculations ---
  const myPositions = useMemo(() => {
    return positions.map(pos => {
      const vault = vaults.find(v => v.id === pos.vaultId);
      if (!vault) return null;
      const currentPriceMultiplier = 1.05; 
      const currentValue = pos.lpAmount * currentPriceMultiplier;
      const profit = currentValue - pos.entryValue;
      const profitPercent = (profit / pos.entryValue) * 100;
      return { ...pos, vault, currentValue, profit, profitPercent };
    }).filter(p => p !== null);
  }, [positions, vaults]);

  const totalPortfolioValue = myPositions.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalProfit = myPositions.reduce((acc, curr) => acc + curr.profit, 0);
  const totalProfitPercent = totalPortfolioValue > 0 ? (totalProfit / (totalPortfolioValue - totalProfit)) * 100 : 0;
  
  const chartData = myPositions.map(p => ({
    name: p.vault.symbol,
    value: p.currentValue,
    color: "#10b981" 
  }));
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  // --- Invite Logic ---
  const unusedInvites = myInvites.filter(i => !i.used_by_user_id);
  const nextInvite = unusedInvites.length > 0 ? unusedInvites[0] : null;

  if (!publicKey) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in">
        <Wallet size={48} className="text-neutral-600 mb-2" />
        <h2 className="text-2xl font-bold text-white font-serif">Connect Wallet</h2>
        <p className="text-neutral-400">Please connect your wallet to view your portfolio.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* --- Header --- */}
      <div className="pt-8 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white font-serif tracking-tight mb-2">
          Dashboard
        </h1>
        <p className="text-neutral-400 font-serif italic text-lg">
          Welcome back. Here is your performance overview.
        </p>
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#0A0A0A] border-white/10 shadow-lg group">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Net Worth</CardTitle>
            <Wallet size={20} className="text-neutral-600 group-hover:text-white transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-white mb-1">
              ${(totalPortfolioValue + usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-neutral-500">Wallet: ${usdcBalance.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-white/10 shadow-lg group">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Total Profit</CardTitle>
            <TrendingUp size={20} className={totalProfit >= 0 ? "text-emerald-600 group-hover:text-emerald-400" : "text-red-600 group-hover:text-red-400"} />
          </CardHeader>
          <CardContent>
             <div className={`text-3xl font-bold font-mono mb-1 flex items-center gap-2 ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
               {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </div>
             <Badge variant="secondary" className={`${totalProfit >= 0 ? "bg-emerald-950/30 text-emerald-400" : "bg-red-950/30 text-red-400"} border-0`}>
                {totalProfit >= 0 ? <ArrowUpRight size={12} className="mr-1"/> : <ArrowDownRight size={12} className="mr-1"/>}
                {totalProfitPercent.toFixed(2)}%
             </Badge>
          </CardContent>
        </Card>

        {/* --- Invite Hub (Compact) --- */}
        <Card className="bg-gradient-to-br from-[#0A0A0A] to-[#111] border-white/10 shadow-lg group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <CardHeader className="pb-2 flex flex-row items-center justify-between relative z-10">
            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Gift size={14} className="text-emerald-500" /> Invites
            </CardTitle>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/10 text-[10px]">
              {unusedInvites.length} Remaining
            </Badge>
          </CardHeader>
          
          <CardContent className="relative z-10">
            {nextInvite ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10">
                   <code className="text-xl font-bold text-white font-mono tracking-widest pl-2">
                     {nextInvite.code}
                   </code>
                   <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-white" onClick={() => handleCopyCode(nextInvite.code)}>
                        {copiedCode === nextInvite.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-[#1DA1F2]" onClick={() => handleShareInvite(nextInvite.code)}>
                        <Twitter size={14} />
                      </Button>
                   </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-xs text-neutral-500 hover:text-white w-full h-auto p-0">
                      View all {myInvites.length} codes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl">Manage Invites</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {myInvites.map((invite) => (
                          <div 
                            key={invite.code} 
                            className={`p-3 rounded-lg border flex flex-col gap-2 ${
                              invite.used_by_user_id 
                                ? "bg-neutral-900/30 border-neutral-800 opacity-50" 
                                : "bg-white/5 border-white/10"
                            }`}
                          >
                             <div className="flex justify-between items-center">
                                <span className={`font-mono font-bold ${invite.used_by_user_id ? "text-neutral-500 line-through" : "text-white"}`}>
                                  {invite.code}
                                </span>
                                {!invite.used_by_user_id && (
                                  <button onClick={() => handleCopyCode(invite.code)} className="text-neutral-500 hover:text-white">
                                    <Copy size={12} />
                                  </button>
                                )}
                             </div>
                             {invite.used_by_user_id ? (
                               <Badge variant="secondary" className="justify-center bg-neutral-800 text-[10px]">USED</Badge>
                             ) : (
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="h-7 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30"
                                 onClick={() => handleShareInvite(invite.code)}
                               >
                                 Share
                               </Button>
                             )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="text-sm text-neutral-500 py-2">No active invites available.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Asset Allocation Chart --- */}
        <Card className="lg:col-span-1 bg-[#0A0A0A] border-white/10 h-[400px]">
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-white font-serif">
               <PieIcon size={18} className="text-emerald-400" /> Allocation
             </CardTitle>
           </CardHeader>
           <CardContent className="h-[320px]">
             {myPositions.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={chartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : Number(value ?? 0);
                        return [`$${n.toFixed(2)}`, "Value"] as const;
                      }}
                   />
                   <Legend verticalAlign="bottom" height={36}/>
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                 <div className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-800 flex items-center justify-center mb-2">
                   <PieIcon size={24} />
                 </div>
                 No assets yet
               </div>
             )}
           </CardContent>
        </Card>

        {/* --- Positions List --- */}
        <Card className="lg:col-span-2 bg-[#0A0A0A] border-white/10 min-h-[400px]">
           <CardHeader>
             <CardTitle className="text-white font-serif">Your Assets</CardTitle>
           </CardHeader>
           <CardContent>
             {myPositions.length === 0 ? (
               <div className="text-center py-20">
                 <p className="text-neutral-500 mb-4">You don't own any ETFs yet.</p>
                 <Button 
                   onClick={() => router.push('/')}
                   variant="outline"
                   className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/20"
                 >
                   Explore Market
                 </Button>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-12 text-[10px] uppercase text-neutral-500 font-bold tracking-wider px-4 pb-2 border-b border-white/5">
                   <div className="col-span-4">Asset</div>
                   <div className="col-span-3 text-right">Balance</div>
                   <div className="col-span-3 text-right">Value</div>
                   <div className="col-span-2 text-right">P&L</div>
                 </div>

                 {myPositions.map((pos) => (
                   <div 
                      key={pos.vaultId} 
                      className="grid grid-cols-12 items-center px-4 py-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/vault/${pos.vaultId}`)}
                   >
                     <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                          {pos.vault.symbol[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{pos.vault.name}</div>
                          <div className="text-xs text-neutral-500">{pos.vault.symbol}</div>
                        </div>
                     </div>
                     <div className="col-span-3 text-right">
                        <div className="text-white font-mono text-sm">{pos.lpAmount.toFixed(2)}</div>
                     </div>
                     <div className="col-span-3 text-right">
                        <div className="text-white font-mono text-sm">${pos.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div className="text-[10px] text-neutral-500">Avg: ${(pos.entryValue / pos.lpAmount).toFixed(2)}</div>
                     </div>
                     <div className="col-span-2 text-right">
                        <div className={`font-mono text-sm ${pos.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                           {pos.profit >= 0 ? "+" : ""}{pos.profitPercent.toFixed(2)}%
                        </div>
                        <div className={`text-[10px] ${pos.profit >= 0 ? "text-emerald-500/60" : "text-red-500/60"}`}>
                           {pos.profit >= 0 ? "+" : ""}${pos.profit.toFixed(2)}
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}