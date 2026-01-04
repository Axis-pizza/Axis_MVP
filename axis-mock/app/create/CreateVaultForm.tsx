"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Sparkles,
  Zap,
  Shield,
  Wallet,
  Trash2,
  ArrowLeft,
  Plus,
  Search,
  AlertTriangle,
  X,
  BrainCircuit,
  ImageIcon,
  CheckCircle2,
  Upload
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";

// --- Constants ---
const MAX_ASSETS = 10;
const COLOR_PALETTE = [
  "#9945FF", "#22C55E", "#F97316", "#3B82F6", 
  "#EF4444", "#EAB308", "#EC4899", "#14B8A6",
];

// --- Types ---
interface Token {
  address: string
  symbol: string
  name: string
  logoURI: string | null
}

interface CompositionItem {
  token: Token;
  weight: number;
  color: string;
}

// --- Helper Components ---

// 1. Simulation Chart
const SimulationChart = ({ isAggressive }: { isAggressive: boolean }) => {
  const width = 300;
  const height = 150;
  const solPoints = "0,120 50,110 100,115 150,90 200,80 250,85 300,70";
  const etfPoints = isAggressive
    ? "0,120 50,100 100,110 150,60 200,70 250,40 300,10"
    : "0,120 50,115 100,105 150,95 200,85 250,75 300,60";

  return (
    <div className="relative w-full h-48 bg-white/5 rounded-xl border border-white/10 p-4 overflow-hidden">
      <div className="absolute top-2 left-4 text-xs font-bold text-neutral-500">Backtest Simulation (1Y)</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <line x1="0" y1="120" x2="300" y2="120" stroke="#333" strokeWidth="1" strokeDasharray="4" />
        <path d={`M${solPoints}`} fill="none" stroke="#666" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
        <text x="280" y="65" fill="#666" fontSize="10">SOL</text>
        <motion.path 
          d={`M${etfPoints}`} 
          fill="none" 
          stroke={isAggressive ? "#F97316" : "#22C55E"} 
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

// ✅ 2. 3D Holographic Card (Auto-Rotating)
const ThreeDCard = ({ name, ticker, logo }: { name: string, ticker: string, logo: string | null }) => {
  return (
    <div className="flex justify-center perspective-1000 py-8 min-h-[450px] items-center">
      <motion.div
        animate={{
          rotateY: [0, 160, 200, 360],
        }}
        transition={{
          duration: 6,
          times: [0, 0.35, 0.45, 1],
          ease: [0.22, 1, 0.36, 1],
          repeat: Infinity,
        }}
        whileHover={{
          rotateX: 6,
          rotateY: 6,
        }}
        className="relative w-72 h-[420px] rounded-3xl preserve-3d"
        style={{ transformStyle: "preserve-3d" }}
      >

        {/* --- FRONT SIDE --- */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-[#0a0a0a]"
          style={{ backfaceVisibility: "hidden" }}
        >
           {/* Background & Effects */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
           <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black" />
           
           {/* Moving Glare (Animation synced with rotation) */}
           <motion.div 
             animate={{ x: ["-100%", "200%"] }}
             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
             className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent skew-x-12"
           />

           {/* Content */}
           <div className="relative z-10 flex flex-col items-center justify-between h-full p-8 py-10">
              <div className="flex flex-col items-center">
                 <div className="relative w-24 h-24 rounded-full border-4 border-white/10 p-1 mb-6 shadow-xl bg-black">
                    {logo ? (
                       <img src={logo} className="w-full h-full rounded-full object-cover" />
                    ) : (
                       <div className="w-full h-full rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-3xl font-bold text-emerald-500">{ticker[0]}</span>
                       </div>
                    )}
                 </div>
                 
                 <h3 className="text-2xl font-serif font-bold text-white text-center leading-tight drop-shadow-md">{name}</h3>
                 <Badge variant="outline" className="mt-3 border-emerald-500/50 text-emerald-400 bg-emerald-500/10 px-3 py-1">
                   {ticker}
                 </Badge>
              </div>

              <div className="w-full space-y-3 bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                 <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-neutral-500">Structure</span>
                    <span className="font-mono">Tokenized Index</span>
                 </div>
                 <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-neutral-500">Engine</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold"><Zap size={10}/> Jito MEV</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Network</span>
                    <span className="flex items-center gap-1">Solana</span>
                 </div>
              </div>
              
              <div className="text-[9px] text-neutral-600 font-mono tracking-widest mt-2">
                 AXIS PROTOCOL • VERIFIED
              </div>
           </div>
           
           {/* Border Glow */}
           <div className="absolute inset-0 rounded-3xl border border-emerald-500/30 z-20" />
        </div>

        {/* --- BACK SIDE --- */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border border-white/10 overflow-hidden shadow-xl bg-[#050505] flex items-center justify-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
           {/* Back Pattern */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
           <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <BrainCircuit size={150} />
           </div>
           
           <div className="relative z-10 text-center">
              <div className="text-3xl font-serif font-bold text-white mb-2">Axis.</div>
              <div className="text-[10px] text-emerald-500 font-mono tracking-[0.3em]">QUANTUM VAULT</div>
           </div>

           {/* Back Glare */}
           <motion.div 
             animate={{ x: ["200%", "-100%"] }}
             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
             className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -skew-x-12"
           />
           <div className="absolute inset-0 rounded-3xl border border-white/5" />
        </div>

      </motion.div>
    </div>
  );
};


// --- Main Component ---
export default function CreateWizard() {
  const router = useRouter();
  const { publicKey } = useWallet();

  // --- Global State ---
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Data State
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [composition, setComposition] = useState<CompositionItem[]>([
    { 
      token: {
        address: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        logoURI: "https://assets.coingecko.com/coins/images/4128/large/solana.png"
      }, 
      weight: 100,
      color: "#9945FF"
    }, 
  ]);

  // Token Selection State
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulation State
  const [simData, setSimData] = useState({ roi: "0%", stdDev: "0%", type: "balanced" });

  // --- Initial Load ---
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const res = await fetch("https://api.jup.ag/tokens/v2/tag?query=verified", {
          headers: { "x-api-key": process.env.NEXT_PUBLIC_JUP_API_KEY! }
        });
        if (!res.ok) throw new Error("API Error");
        const raw = await res.json();
        setAllTokens(raw.map((t: any) => ({
          address: t.id || t.mint, symbol: t.symbol, name: t.name, logoURI: t.icon || null,
        })));
      } catch (err) { console.error(err); }
    };
    loadTokens();
  }, []);

  // --- Handlers ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addToken = (token: Token) => {
    if (composition.length >= MAX_ASSETS) return toast.error("Max assets reached");
    if (composition.find(c => c.token.address === token.address)) return toast.error("Already added");
    
    setComposition(prev => [...prev, { token, weight: 0, color: COLOR_PALETTE[prev.length % 8] }]);
    setIsTokenModalOpen(false);
  };

  const updateWeight = (address: string, newVal: number) => {
    setComposition(prev => {
      const otherWeight = prev.filter(c => c.token.address !== address).reduce((s, c) => s + c.weight, 0);
      return prev.map(c => c.token.address === address ? { ...c, weight: Math.min(newVal, 100 - otherWeight) } : c);
    });
  };

  // ✅ AI Strategy with Duplicate Prevention & No Overlap
  const applyAiStrategy = (type: 'aggressive' | 'balanced') => {
    if (allTokens.length === 0) return toast.error("Loading tokens...");

    const targetSymbols = type === 'aggressive'
      ? ["BONK", "WIF", "JUP", "PYTH", "RAY", "POPCAT", "SOL"]
      : ["SOL", "mSOL", "JitoSOL", "USDC", "USDT", "INF"];

    let candidates: Token[] = [];
    const usedAddresses = new Set<string>();

    for (const sym of targetSymbols) {
      const found = allTokens.find(t => t.symbol.toUpperCase() === sym.toUpperCase());
      if (found && !usedAddresses.has(found.address)) {
        candidates.push(found);
        usedAddresses.add(found.address);
      }
      if (candidates.length >= 4) break;
    }
    
    // Fallback if no tokens found
    if (candidates.length === 0) {
        const sol = allTokens.find(t => t.symbol === "SOL");
        if (sol) candidates.push(sol);
    }

    const newComp = candidates.map((token, idx) => {
      let weight = 0;
      if (type === 'aggressive') {
        if (idx === 0) weight = 40; else if (idx === 1) weight = 30; else if (idx === 2) weight = 20; else weight = 10;
      } else {
        if (idx === 0) weight = 60; else if (idx === 1) weight = 30; else weight = 10;
      }
      return { token, weight, color: COLOR_PALETTE[idx % 8] };
    });

    const total = newComp.reduce((s, c) => s + c.weight, 0);
    if (total !== 100 && newComp.length > 0) newComp[0].weight += (100 - total);

    setComposition(newComp);
    
    if (type === 'aggressive') {
      setSimData({ roi: "+42.5%", stdDev: "High", type: "aggressive" });
      toast.success("Applied: High Yield Degen Strategy");
    } else {
      setSimData({ roi: "+18.2%", stdDev: "Low", type: "balanced" });
      toast.success("Applied: Balanced Foundation Strategy");
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name || !ticker) return toast.error("Please fill in Name and Ticker");
      setStep(2);
    } else if (step === 2) {
      const total = composition.reduce((s, c) => s + c.weight, 0);
      if (total !== 100) return toast.error(`Total weight must be 100% (Current: ${total}%)`);
      setStep(3); 
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleDeploy = async () => {
    if (!publicKey) return toast.error("Connect Wallet");
    setIsDeploying(true);
    
    try {
        const payload = {
          name,
          symbol: ticker,
          description: "",
          creator: publicKey.toBase58(),
          strategy: "Weekly",
          fee: 0.95,
          minLiquidity: 1000,
          composition: composition.map(c => ({
            mint: c.token.address,
            symbol: c.token.symbol,
            weight: c.weight,
          })),
          imageUrl: logoPreview,
        };
    
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_AXIS_API_BASE_URL}/vaults`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
    
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed");
    
        toast.success("Vault Created Successfully!");
        router.push(`/vaults/${data.id}`);
    
      } catch (err: any) {
        console.error("Deploy Error:", err);
        toast.error(err.message || "Deployment failed");
      } finally {
        setIsDeploying(false);
      }
  };

  return (
    <div className="min-h-screen w-full  text-white font-sans pb-32">
      <Toaster 
      position="top-right"
      duration={1200}
      toastOptions={{
        className: "axis-toast",
      }}
      />

      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-50  backdrop-blur">
        <div className="flex items-center gap-2">
           {step > 1 && (
             <Button variant="ghost" size="icon" onClick={() => setStep(s => Math.max(1, s-1) as any)} className="mr-1 -ml-2">
               <ArrowLeft size={20} />
             </Button>
           )}
           <h1 className="text-xl font-serif font-bold">Create Vault</h1>
        </div>
        <div className="flex gap-1">
           {[1,2,3,4].map(i => (
             <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-emerald-500" : "bg-white/10"}`} />
           ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <AnimatePresence mode="wait">
          
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">Define Identity</h2>
                <p className="text-neutral-400 text-sm">Give your fund a face and a name.</p>
              </div>
              <div className="flex justify-center">
                <div 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/10 hover:border-emerald-500/50 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group"
                >
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="text-neutral-500 mb-2 group-hover:text-emerald-400" size={32} />
                      <span className="text-[10px] uppercase font-bold text-neutral-500 group-hover:text-emerald-400">Upload Logo</span>
                    </>
                  )}
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-neutral-500 uppercase">Vault Name</label>
                   <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Citadel Solana Fund" className="h-12 bg-white/5 border-white/10 text-lg rounded-xl focus:border-emerald-500/50" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-neutral-500 uppercase">Ticker Symbol</label>
                   <Input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. CTDL" className="h-12 bg-white/5 border-white/10 text-lg font-mono rounded-xl focus:border-emerald-500/50" />
                </div>

                <div className="flex justify-end pt-2">
      <Button
        onClick={handleNext}
        className="h-12 px-8 bg-white text-black hover:bg-neutral-200 font-bold shadow-xl"
      >
        Next
      </Button>
    </div>

              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
               <div className="text-center space-y-1">
                <h2 className="text-2xl font-serif">Portfolio Composition</h2>
                <p className="text-neutral-400 text-sm">Select assets or ask AI for a strategy.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => applyAiStrategy('balanced')} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-left group">
                    <div className="mb-2 p-2 bg-purple-500/20 w-fit rounded-lg text-purple-400 group-hover:scale-110 transition-transform"><Sparkles size={20}/></div>
                    <div className="font-bold text-sm">Safe / Balanced</div>
                 </button>
                 <button onClick={() => applyAiStrategy('aggressive')} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all text-left group">
                    <div className="mb-2 p-2 bg-orange-500/20 w-fit rounded-lg text-orange-400 group-hover:scale-110 transition-transform"><Zap size={20}/></div>
                    <div className="font-bold text-sm">Degen / Aggressive</div>
                 </button>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-neutral-500 uppercase">Allocation ({composition.length}/{MAX_ASSETS})</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsTokenModalOpen(true)} className="text-xs text-emerald-400 hover:text-emerald-300">
                      <Plus size={14} className="mr-1"/> Add Asset
                    </Button>
                 </div>
                 
                 <div className="space-y-4">
                  {composition.map(item => (
                    <div key={item.token.address} className="bg-[#121212] p-4 rounded-2xl border border-white/5">
                       <div className="flex justify-between mb-3">
                          <div className="flex items-center gap-3">
                             {item.token.logoURI && <img src={item.token.logoURI} className="w-6 h-6 rounded-full"/>}
                             <span className="font-bold">{item.token.symbol}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="font-mono">{item.weight}%</span>
                             <button onClick={() => setComposition(p => p.filter(x => x.token.address !== item.token.address))} className="text-neutral-600 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                       </div>
                       <Slider value={[item.weight]} max={100} step={1} onValueChange={(v) => updateWeight(item.token.address, v[0])} className="py-1" />
                    </div>
                  ))}
                 </div>
                 <div className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${composition.reduce((s,c)=>s+c.weight,0) === 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                    {composition.reduce((s,c)=>s+c.weight,0) === 100 ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
                    Total Allocation: {composition.reduce((s,c)=>s+c.weight,0)}%
                 </div>

                 <div className="flex justify-end pt-2">
      <Button
        onClick={handleNext}
        className="h-12 px-8 bg-white text-black hover:bg-neutral-200 font-bold shadow-xl"
      >
        Next
      </Button>
    </div>

              </div>
            </motion.div>
          )}

          {step === 3 && (
             <motion.div 
               key="step3"
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
               className="space-y-8"
             >
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-serif">AI Performance Projection</h2>
                  <p className="text-neutral-400 text-sm">Simulating 1-year historic performance...</p>
                </div>
                <SimulationChart isAggressive={simData.type === 'aggressive'} />
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-neutral-500 text-xs uppercase font-bold mb-1">Proj. 1Y ROI</div>
                      <div className="text-2xl font-mono font-bold text-emerald-400">{simData.roi}</div>
                   </div>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-neutral-500 text-xs uppercase font-bold mb-1">Volatility</div>
                      <div className={`text-2xl font-mono font-bold ${simData.type === 'aggressive' ? "text-orange-400" : "text-blue-400"}`}>{simData.stdDev}</div>
                   </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900/20 to-black border border-emerald-500/20">
                   <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                      <BrainCircuit size={16} /> Axis AI Analysis
                   </div>
                   <p className="text-xs text-neutral-300 leading-relaxed">
                      This composition outperforms holding SOL by utilizing Jito MEV capture. 
                      Standard deviation is within expected range for {simData.type} strategy.
                   </p>
                </div>
                <div className="flex justify-end pt-2">
      <Button
        onClick={handleNext}
        className="h-12 px-8 bg-white text-black hover:bg-neutral-200 font-bold shadow-xl"
      >
        Generate ETF Card
      </Button>
    </div>
             </motion.div>
          )}

          {step === 4 && (
             <motion.div 
             key="step4"
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="space-y-8 py-4"
           >
              <div className="text-center">
                <h2 className="text-2xl font-serif mb-2">Ready to Deploy?</h2>
                <p className="text-neutral-400 text-sm">Review your vault details.</p>
              </div>

              {/* 3D Auto-Rotating Card */}
              <ThreeDCard name={name} ticker={ticker} logo={logoPreview} />

              <div className="text-center text-xs text-neutral-500">
                 By clicking deploy, you accept the terms of service.<br/>
                 Estimated Gas: ~0.02 SOL
              </div>

              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Edit
                </Button>
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="bg-emerald-500 text-black font-bold"
                >
                  Deploy
                </Button>
              </div>

           </motion.div>
          )}

        </AnimatePresence>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#050505] border-t border-white/10 z-50 pb-safe"> 
     {/* ここにbottomnavの要素を入れていく */}
      </div>

      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-md w-[95%] rounded-2xl top-[40%]">
          <DialogHeader><DialogTitle>Select Asset</DialogTitle></DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 bg-black/20 border-white/10 rounded-xl" />
          </div>
          <ScrollArea className="h-[300px] mt-4 pr-2">
             <div className="space-y-1">
                {allTokens.filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase())).map((token, i) => (
                    <button key={`${token.address}-${i}`} onClick={() => addToken(token)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 text-left">
                       <div className="flex items-center gap-3">
                          {token.logoURI ? <img src={token.logoURI} className="w-8 h-8 rounded-full"/> : <div className="w-8 h-8 rounded-full bg-white/10"/>}
                          <div><div className="font-bold text-sm">{token.symbol}</div><div className="text-xs text-neutral-500">{token.name}</div></div>
                       </div>
                       {composition.find(c=>c.token.address===token.address) && <span className="text-xs text-emerald-500">Added</span>}
                    </button>
                ))}
             </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}