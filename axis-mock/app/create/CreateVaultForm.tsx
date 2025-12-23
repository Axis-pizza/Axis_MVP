"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAxisStore } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { 
  Loader2, Sparkles, Zap, Search, Plus, 
  Upload, X, PieChart, ArrowRight, ArrowLeft, CheckCircle2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

// --- Types ---
interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
}

interface AssetComposition {
  token: Token;
  weight: number; 
}

export function CreateVaultForm() {
  const router = useRouter();
  const { createVault } = useAxisStore();
  const { publicKey } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Form Data
  const [basicInfo, setBasicInfo] = useState({
    name: "",
    symbol: "",
    description: "",
    imagePreview: null as string | null,
  });

  const [strategyParams, setStrategyParams] = useState({
    managementFee: 0.95,     
    rebalanceThreshold: 2.0, 
    auctionPremium: 5.0,     
    auctionDuration: 100,    
    minLiquidity: 1000,      
    solverBuffer: 0.1,       
  });

  const [composition, setComposition] = useState<AssetComposition[]>([]);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTokenListOpen, setIsTokenListOpen] = useState(false);
  const [isTokensLoading, setIsTokensLoading] = useState(false);

  const totalWeight = composition.reduce((sum, item) => sum + item.weight, 0);
  const isWeightValid = totalWeight === 100;

  // --- Effects ---
  useEffect(() => {
    const fetchTokens = async () => {
      setIsTokensLoading(true);
      try {
        const res = await fetch(" https://axis-api.yusukekikuta-05.workers.dev/tokens");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAvailableTokens(data.slice(0, 300)); 
      } catch (e) {
        console.error(e);
      } finally {
        setIsTokensLoading(false);
      }
    };
    fetchTokens();
  }, []);

  // --- Logic Helpers ---
  const updateWeight = (address: string, newWeight: number) => {
    const clamped = Math.max(0, Math.min(100, newWeight));
    setComposition(prev => prev.map(item => 
      item.token.address === address ? { ...item, weight: clamped } : item
    ));
  };

  const toggleToken = (token: Token) => {
    const exists = composition.find(c => c.token.address === token.address);
    if (exists) {
      setComposition(prev => prev.filter(c => c.token.address !== token.address));
    } else {
      if (composition.length >= 10) {
        toast.error("Maximum 10 assets allowed.");
        return;
      }
      setComposition(prev => [...prev, { token, weight: 0 }]);
    }
  };

  const updateParam = (key: keyof typeof strategyParams, value: number) => {
    setStrategyParams(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBasicInfo(prev => ({ ...prev, imagePreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const isStep1Valid = basicInfo.name.length > 0 && basicInfo.symbol.length > 0 && basicInfo.description.length > 0;
  const isStep3Valid = composition.length > 0 && isWeightValid;

  // --- Navigation with Animation ---
  const changeStep = (direction: 'next' | 'back') => {
    if (direction === 'next') {
        if (currentStep === 1 && !isStep1Valid) return toast.error("Please fill in all fields.");
        if (currentStep === 3 && !isStep3Valid) return toast.error("Total weight must be 100%.");
    }

    setIsTransitioning(true);

    setTimeout(() => {
        if (direction === 'next') setCurrentStep(prev => prev + 1);
        else setCurrentStep(prev => Math.max(1, prev - 1));
        
        setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!publicKey) return toast.error("Please connect wallet.");
    
    setIsLoading(true);
    const success = await createVault({
      name: basicInfo.name,
      symbol: basicInfo.symbol,
      description: basicInfo.description,
      creator: publicKey.toString(),
      imageUrl: basicInfo.imagePreview,
      strategy: "yield_max",
      fee: 0.95,
      minLiquidity: strategyParams.minLiquidity,
      composition: composition,
    });
    setIsLoading(false);

    if (success) {
      toast.success("ETF Vault Created Successfully!");
      router.push("/");
    } else {
      toast.error("Failed to create vault.");
    }
  };

  const filteredTokens = availableTokens.filter(t => 
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Progress Indicator (Integrated closely) */}
      <div className="w-full max-w-xl px-6 flex items-center justify-between text-xs font-medium text-neutral-600 mb-8 transition-all duration-500 ease-in-out z-20">
        {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-500 ${currentStep >= step ? "bg-white text-black border-white scale-110" : "border-neutral-800"}`}>
                {step}
              </div>
              {step < 4 && <div className={`h-[1px] w-8 md:w-16 transition-colors duration-500 ${currentStep > step ? "bg-white" : "bg-neutral-800"}`} />}
            </div>
        ))}
      </div>

      {/* --- Main Content Area --- */}
      <div 
        className={`w-full max-w-5xl px-4 flex flex-col items-center transition-all duration-500 ease-in-out transform ${
            isTransitioning 
              ? "opacity-0 blur-md scale-95 translate-y-4" 
              : "opacity-100 blur-0 scale-100 translate-y-0"
        }`}
      >
        
        {/* --- STEP 1: Basic Information (Expanded) --- */}
        {currentStep === 1 && (
          <div className="w-full max-w-3xl text-center space-y-10">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-2">Let's start with the basics.</h1>
              <p className="text-xl text-neutral-400">Name your ETF and define its identity.</p>
            </div>

            <div className="space-y-12">
              <div className="flex justify-center">
                 <div 
                  className="group relative w-32 h-32 rounded-full border-2 border-dashed border-white/20 hover:border-emerald-500/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {basicInfo.imagePreview ? (
                    <img src={basicInfo.imagePreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <>
                      <Upload className="text-neutral-500 group-hover:text-emerald-400 mb-2" size={24} />
                      <span className="text-xs text-neutral-500 uppercase font-bold">Icon</span>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>

              <div className="space-y-8">
                  <div className="group relative">
                    <Input 
                      placeholder="Enter ETF Name" 
                      className="h-24 text-center text-4xl md:text-5xl font-bold bg-transparent border-b-2 border-white/10 rounded-none focus-visible:ring-0 focus-visible:border-white px-0 font-serif placeholder:text-neutral-800 text-white transition-all"
                      value={basicInfo.name}
                      onChange={(e) => setBasicInfo({...basicInfo, name: e.target.value})}
                    />
                    <Label className="text-neutral-600 mt-2 block text-sm">e.g. Axis Blue Chip Index</Label>
                  </div>

                  <div className="grid grid-cols-3 gap-8 items-start">
                    <div className="group relative">
                       <Input 
                        placeholder="TICKER" 
                        className="h-16 text-center text-2xl md:text-3xl font-bold uppercase bg-transparent border-b border-white/10 rounded-none focus-visible:ring-0 focus-visible:border-white px-0 font-serif placeholder:text-neutral-800 text-white tracking-[0.2em]"
                        maxLength={5}
                        value={basicInfo.symbol}
                        onChange={(e) => setBasicInfo({...basicInfo, symbol: e.target.value.toUpperCase()})}
                      />
                       <Label className="text-neutral-600 mt-2 block text-sm">Max 5 chars</Label>
                    </div>
                    <div className="col-span-2 group relative">
                       <Input 
                        placeholder="Short description of your strategy..." 
                        className="h-16 text-xl md:text-2xl bg-transparent border-b border-white/10 rounded-none focus-visible:ring-0 focus-visible:border-white px-0 font-serif placeholder:text-neutral-800 text-white"
                        value={basicInfo.description}
                        onChange={(e) => setBasicInfo({...basicInfo, description: e.target.value})}
                      />
                       <Label className="text-neutral-600 mt-2 block text-sm">Investment thesis</Label>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 2: Strategy Parameters --- */}
        {currentStep === 2 && (
          <div className="w-full max-w-4xl">
             <div className="text-center mb-8">
              <h1 className="text-4xl font-bold font-serif text-white mb-2">Fine-tune strategy.</h1>
              <p className="text-xl text-neutral-400">Configure parameters for automated rebalancing.</p>
            </div>

            <ScrollArea className="h-[500px] pr-6 -mr-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-2">
                  <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/5">
                     <Label className="text-neutral-400 text-sm uppercase tracking-wider">Management Fee</Label>
                     <div className="flex items-baseline gap-3">
                       <span className="text-4xl font-bold text-white font-mono">0.95%</span>
                       <Badge variant="secondary" className="text-xs">FIXED</Badge>
                     </div>
                     <p className="text-sm text-neutral-500">Standard protocol fee.</p>
                  </div>
                   <div className="space-y-6 pt-2">
                     <div className="flex justify-between items-end"><Label className="text-lg text-neutral-300">Min Liquidity</Label><span className="text-2xl font-mono text-emerald-400">${strategyParams.minLiquidity.toLocaleString()}</span></div>
                     <Slider value={[strategyParams.minLiquidity]} max={10000} step={100} onValueChange={(val) => updateParam('minLiquidity', val[0])} className="py-2"/>
                  </div>
                  <div className="space-y-6 pt-2">
                     <div className="flex justify-between items-end"><Label className="text-lg text-neutral-300">Rebalance Threshold</Label><span className="text-2xl font-mono text-white">{strategyParams.rebalanceThreshold}%</span></div>
                     <Slider value={[strategyParams.rebalanceThreshold]} max={10.0} step={0.1} onValueChange={(val) => updateParam('rebalanceThreshold', val[0])} className="py-2"/>
                  </div>
                  <div className="space-y-6 pt-2">
                     <div className="flex justify-between items-end"><Label className="text-lg text-neutral-300">Auction Premium</Label><span className="text-2xl font-mono text-white">{strategyParams.auctionPremium}%</span></div>
                     <Slider value={[strategyParams.auctionPremium]} max={20.0} step={0.5} onValueChange={(val) => updateParam('auctionPremium', val[0])} className="py-2"/>
                  </div>
                  <div className="space-y-6 pt-2">
                     <div className="flex justify-between items-end"><Label className="text-lg text-neutral-300">Auction Duration</Label><span className="text-2xl font-mono text-white">{strategyParams.auctionDuration} <span className="text-sm text-neutral-500">Slots</span></span></div>
                     <Slider value={[strategyParams.auctionDuration]} max={1000} step={10} onValueChange={(val) => updateParam('auctionDuration', val[0])} className="py-2"/>
                  </div>
                   <div className="space-y-6 pt-2">
                     <div className="flex justify-between items-end"><Label className="text-lg text-neutral-300">Solver Buffer</Label><span className="text-2xl font-mono text-white">{strategyParams.solverBuffer}%</span></div>
                     <Slider value={[strategyParams.solverBuffer]} max={2.0} step={0.01} onValueChange={(val) => updateParam('solverBuffer', val[0])} className="py-2"/>
                  </div>
               </div>
            </ScrollArea>
          </div>
        )}

        {/* --- STEP 3: Composition & Weights --- */}
        {currentStep === 3 && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center mb-4">
              <h1 className="text-4xl font-bold font-serif text-white mb-2">Build portfolio.</h1>
              <p className="text-xl text-neutral-400">Total weight must be 100%.</p>
            </div>

            <div className="bg-[#0A0A0A] rounded-3xl border border-white/5 shadow-2xl flex flex-col h-[550px]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                 <div className="space-y-1">
                   <div className="flex items-center gap-3">
                     <h3 className={`text-4xl font-bold font-mono ${isWeightValid ? "text-emerald-400" : "text-white"}`}>
                       {totalWeight}%
                     </h3>
                     <span className="text-neutral-500 text-lg">/ 100%</span>
                   </div>
                   <Progress value={totalWeight} className={`h-2 w-48 ${totalWeight > 100 ? "bg-red-900" : "bg-neutral-800"}`} />
                 </div>

                 <Dialog open={isTokenListOpen} onOpenChange={setIsTokenListOpen}>
                   <DialogTrigger asChild>
                     <Button size="lg" className="h-12 bg-white text-black hover:bg-neutral-200 font-bold rounded-full px-6 text-base">
                       <Plus size={18} className="mr-2" /> Add Asset
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-[500px]">
                     <DialogHeader><DialogTitle className="font-serif text-2xl">Select Token</DialogTitle></DialogHeader>
                     <div className="space-y-4 pt-4">
                       <div className="relative">
                         <Search className="absolute left-4 top-3.5 text-neutral-500" size={20} />
                         <Input placeholder="Search ticker..." className="h-12 pl-12 bg-neutral-900 border-white/10 text-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                       </div>
                       <ScrollArea className="h-[400px] pr-4">
                         {isTokensLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-neutral-500" /></div> : (
                           <div className="space-y-2">
                             {filteredTokens.map((token) => {
                               const isSelected = composition.some(c => c.token.address === token.address);
                               return (
                                 <div key={token.address} onClick={() => toggleToken(token)} className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-emerald-900/20 border border-emerald-500/30" : "hover:bg-white/5"}`}>
                                   <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full" />
                                   <div className="flex-1"><div className="font-bold text-base">{token.symbol}</div><div className="text-sm text-neutral-500">{token.name}</div></div>
                                   {isSelected && <Zap size={18} className="text-emerald-400" />}
                                 </div>
                               )
                             })}
                           </div>
                         )}
                       </ScrollArea>
                     </div>
                   </DialogContent>
                 </Dialog>
              </div>

              <ScrollArea className="flex-1 p-8">
                <div className="space-y-6">
                  {composition.length === 0 ? (
                     <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                       <PieChart className="mx-auto text-neutral-600 mb-6" size={64} />
                       <p className="text-neutral-500 text-lg">No assets selected yet.</p>
                     </div>
                  ) : (
                    composition.map((item) => (
                      <div key={item.token.address} className="bg-white/5 p-6 rounded-2xl space-y-4 animate-in fade-in border border-white/5 hover:border-white/10 transition-colors">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <img src={item.token.logoURI} alt={item.token.symbol} className="w-12 h-12 rounded-full" />
                               <div><div className="font-bold text-xl text-white">{item.token.symbol}</div><div className="text-sm text-neutral-500">{item.token.name}</div></div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="relative group">
                                 <Input type="number" value={item.weight} onChange={(e) => updateWeight(item.token.address, Number(e.target.value))} className="w-28 h-12 text-right pr-8 bg-black/40 border-white/10 font-mono text-xl focus:border-emerald-500/50" />
                                 <span className="absolute right-3 top-3 text-neutral-500 text-sm font-bold">%</span>
                               </div>
                               <button onClick={() => toggleToken(item.token)} className="p-2 hover:bg-red-900/20 text-neutral-500 hover:text-red-400 rounded-full transition-colors"><X size={24} /></button>
                            </div>
                         </div>
                         <Slider value={[item.weight]} max={100} step={1} onValueChange={(val) => updateWeight(item.token.address, val[0])} className="py-2" />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* --- STEP 4: Final Preview --- */}
        {currentStep === 4 && (
          <div className="w-full max-w-xl">
             <div className="text-center mb-8">
              <h1 className="text-4xl font-bold font-serif text-white mb-2">Review & Launch</h1>
              <p className="text-xl text-neutral-400">Ready to deploy your ETF?</p>
            </div>

             <Card className="relative overflow-hidden border-white/20 bg-black/60 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                <CardContent className="p-10 space-y-8">
                  <div className="flex items-center gap-8">
                     <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl shrink-0">
                         {basicInfo.imagePreview ? <img src={basicInfo.imagePreview} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold font-serif text-neutral-600">{basicInfo.symbol ? basicInfo.symbol[0] : "?"}</span>}
                      </div>
                      <div>
                        <h3 className="text-4xl font-bold text-white font-serif tracking-tight leading-tight">{basicInfo.name}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-white border-white/20 px-3 py-1 text-sm">{basicInfo.symbol}</Badge>
                          <span className="text-sm text-neutral-500 flex items-center gap-1"><CheckCircle2 size={16} className="text-emerald-500" /> Ready to Deploy</span>
                        </div>
                      </div>
                  </div>
                  <div className="h-[1px] bg-white/10 w-full" />
                  <div className="space-y-4">
                     <h4 className="text-xs uppercase tracking-widest text-neutral-500 font-bold">Composition</h4>
                     <div className="space-y-3">
                       {composition.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-base">
                             <div className="flex items-center gap-3"><img src={item.token.logoURI} className="w-6 h-6 rounded-full" /><span className="text-white font-medium">{item.token.name}</span></div>
                             <div className="font-mono text-white font-bold">{item.weight}%</div>
                          </div>
                       ))}
                     </div>
                  </div>
                  <div className="h-[1px] bg-white/10 w-full" />
                  <div className="grid grid-cols-2 gap-6 text-sm">
                     <div><div className="text-[10px] uppercase text-neutral-500 font-bold mb-1">Fee</div><div className="font-mono text-white text-lg">0.95%</div></div>
                     <div><div className="text-[10px] uppercase text-neutral-500 font-bold mb-1">Rebalance</div><div className="font-mono text-white text-lg">{strategyParams.rebalanceThreshold}%</div></div>
                     <div><div className="text-[10px] uppercase text-neutral-500 font-bold mb-1">Liquidity</div><div className="font-mono text-white text-lg">${strategyParams.minLiquidity.toLocaleString()}</div></div>
                  </div>
                </CardContent>
             </Card>
          </div>
        )}

      </div>


      {/* --- Footer Controls (Fixed Bottom) --- */}
      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 flex justify-center bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
         <div className="w-full max-w-4xl flex items-center justify-between pointer-events-auto">
            
            <Button 
              variant="ghost" 
              onClick={() => changeStep('back')}
              disabled={currentStep === 1 || isLoading}
              className={`text-neutral-400 hover:text-white hover:bg-white/10 transition-opacity duration-300 text-lg px-6 ${currentStep === 1 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
              <ArrowLeft className="mr-2" size={24} /> Back
            </Button>

            {currentStep < 4 ? (
              <Button 
                onClick={() => changeStep('next')}
                size="lg"
                className="h-14 rounded-full px-10 text-xl font-bold bg-white text-black hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105"
              >
                Next Step <ArrowRight className="ml-2" size={24} />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isLoading}
                size="lg"
                className="h-16 rounded-full px-12 text-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-black shadow-[0_0_30px_rgba(52,211,153,0.4)] transition-all hover:scale-105"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 fill-black" />}
                Create Vault
              </Button>
            )}

         </div>
      </div>

    </div>
  );
}