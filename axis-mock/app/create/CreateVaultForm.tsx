"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  Sparkles, ArrowRight, Upload, Loader2, Settings2, Trash2, Image as ImageIcon, CheckCircle2, X, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner"; // Toasterをインポート
import ReactMarkdown from 'react-markdown';

// --- Types & Constants (変更なし) ---
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  uiAction?: "NONE" | "REQUEST_LOGO" | "SHOW_PREVIEW";
  isTyping?: boolean;
};

interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string;
}

const MOCK_TOKENS: Token[] = [
  { address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Solana", logoURI: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
  { address: "JUPyiwrYJFskUPiHa7hkeR8VUtkOp66YWug2yPnTxk3", symbol: "JUP", name: "Jupiter", logoURI: "https://static.jup.ag/jup/icon.png" },
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", logoURI: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg" },
  { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", logoURI: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://axis-api.yusukekikuta-05.workers.dev";

const Typewriter = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);
  useEffect(() => {
    setDisplayedText(""); indexRef.current = 0;
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(indexRef.current));
      indexRef.current++;
      if (indexRef.current >= text.length) { clearInterval(intervalId); if (onComplete) onComplete(); }
    }, 20);
    return () => clearInterval(intervalId);
  }, [text]);
  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

export function CreateWithAI() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- State ---
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0); 

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Welcome. I am Axis AI. Let's create your ETF.\nFirst, **what is the Name** for your new Vault?",
      uiAction: "NONE",
      isTyping: true
    }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    imageUrl: null as string | null,
    composition: [] as { token: Token, weight: number }[],
    strategy: { fee: 0.95, rebalance: 2.0, rebalanceType: "Weekly" }
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Effects & Logic (変更なし) ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (formData.imageUrl && step === 2) {
        setTimeout(() => {
            const aiMsg: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: "Logo received. Looking good.\nNow, tell me your **investment strategy** (e.g. 'High risk Solana ecosystem').",
                uiAction: "NONE",
                isTyping: true
            };
            setMessages(prev => [...prev, aiMsg]);
            setStep(3); 
        }, 1000);
    }
  }, [formData.imageUrl, step]);

  const processMockAI = (userInput: string) => {
    let responseText = "";
    let nextStep = step;
    let uiAction: "NONE" | "REQUEST_LOGO" | "SHOW_PREVIEW" = "NONE";
    let updatedData: any = {};

    switch (step) {
        case 0: 
            updatedData = { name: userInput };
            responseText = `**"${userInput}"**. Great name.\nNext, what should be the **Ticker Symbol**? (e.g. AXIS)`;
            nextStep = 1;
            break;
        case 1: 
            updatedData = { symbol: userInput.toUpperCase().slice(0, 5) };
            responseText = `Got it, **$${userInput.toUpperCase().slice(0, 5)}**.\nPlease upload a logo for your vault.`;
            uiAction = "REQUEST_LOGO";
            nextStep = 2; 
            break;
        case 2: 
            responseText = "Okay, we can add the logo later.\nWhat is your **investment strategy**? (e.g. 'Aggressive growth')";
            nextStep = 3;
            break;
        case 3: 
            updatedData = { description: userInput };
            responseText = `Understood: "${userInput}".\n\nI have designed a portfolio based on your strategy. You can edit the composition below.`;
            uiAction = "SHOW_PREVIEW";
            updatedData.composition = [
                { token: MOCK_TOKENS[0], weight: 40 },
                { token: MOCK_TOKENS[1], weight: 30 },
                { token: MOCK_TOKENS[2], weight: 30 },
            ];
            nextStep = 4;
            break;
        case 4: 
            responseText = "Is there anything you'd like to adjust? You can use the 'Edit' button.";
            uiAction = "SHOW_PREVIEW";
            break;
    }
    return { responseText, nextStep, uiAction, updatedData };
  };

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
        const result = processMockAI(textToSend);
        if (Object.keys(result.updatedData).length > 0) {
            setFormData(prev => ({ ...prev, ...result.updatedData }));
        }
        setStep(result.nextStep);

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: result.responseText,
            uiAction: result.uiAction,
            isTyping: true
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false);
    }, 800); 
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        toast.success("Logo uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeploy = async () => {
    // 1. ウォレット接続チェック
    if (!publicKey) return toast.error("Connect wallet first.");

    // 2. バリデーション (合計100%)
    const totalWeight = formData.composition.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) return toast.error(`Total weight must be 100%. Current: ${totalWeight}%`);

    const toastId = toast.loading("Deploying Vault config to Database...");

    try {
      // 3. 送信データの整形
      // バックエンドの期待するフィールド名に合わせる
      const payload = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        creator: publicKey.toBase58(), // ウォレットアドレス
        strategy: formData.strategy.rebalanceType, // strategy_typeとして送信
        fee: formData.strategy.fee,
        minLiquidity: 1000, // デフォルト値（必要ならフォームに追加）
        imageUrl: formData.imageUrl,
        composition: formData.composition.map(c => ({
            token_address: c.token.address, // トークンのアドレス
            symbol: c.token.symbol,         // シンボル（表示用）
            weight: c.weight
        }))
      };

      // 4. APIリクエスト送信
      const response = await fetch(`${API_BASE_URL}/vaults`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create vault");
      }

      const data = await response.json();

      // 5. 成功時の処理
      toast.success("Vault Created Successfully!", { id: toastId });
      
      // 少し待ってからトップページ（またはポートフォリオ）へ遷移
      setTimeout(() => router.push("/"), 1000);

    } catch (error: any) {
      console.error("Deploy Error:", error);
      toast.error(error.message || "Something went wrong", { id: toastId });
    }
  };

  const handleTypingComplete = (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTyping: false } : m));
  };

  const updateWeight = (address: string, newWeight: number) => {
    setFormData(prev => {
        const otherWeights = prev.composition
            .filter(c => c.token.address !== address)
            .reduce((sum, c) => sum + c.weight, 0);
        const maxAllowed = 100 - otherWeights;
        const clampedWeight = Math.min(newWeight, maxAllowed);
        return {
            ...prev,
            composition: prev.composition.map(c => 
                c.token.address === address ? { ...c, weight: clampedWeight } : c
            )
        };
    });
  };

  const removeToken = (address: string) => {
    setFormData(prev => ({
        ...prev,
        composition: prev.composition.filter(c => c.token.address !== address)
    }));
  };

  const currentTotalWeight = useMemo(() => {
    return formData.composition.reduce((sum, c) => sum + c.weight, 0);
  }, [formData.composition]);

  return (
    // ★ポイント1: メインコンテナの Z-Index を 99999 から 50 に下げて、ToasterやModalが上に来れる余地を作ります
    <div className="fixed inset-0 z-[60] flex flex-col w-full h-[100dvh] text-white font-sans overflow-hidden overscroll-none">
      
      {/* ★修正1: Toasterの位置修正と重複防止 
         - position="top-right" を指定
         - theme="dark"
         - z-indexを高めに設定（sonnerのデフォルトは高いですが、念の為）
         - richColors: 成功時に緑、失敗時に赤色になるオプション
      */}
      <Toaster 
        position="top-right" 
        theme="dark" 
        richColors 
        closeButton
        // もしLayout.tsxにもToasterがある場合、ここで定義すると2重になることがありますが、
        // このページは全画面モーダルのような扱い(z-50)なので、
        // ここに専用のToasterを置くのが確実です。
        toastOptions={{
            style: { zIndex: 99999 } // 念の為スタイルでもZ-Indexを指定
        }}
      />

      {/* Header */}
      <div className="flex-none px-4 py-3 flex items-center justify-between border-b border-white/10 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
           <Sparkles className="text-emerald-400 animate-pulse" size={16} />
           <span className="font-serif font-bold tracking-wide text-base">Axis AI (Demo)</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={() => router.back()}>
            <X size={20} />
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto scrollbar-hide">
        <div className="px-4 py-6 space-y-6 pb-4">
            <AnimatePresence initial={false}>
            {messages.map((msg) => (
                <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    
                    {/* Message Bubble */}
                    <div className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                        ? 'bg-[#222] text-white border border-white/10 rounded-br-none' 
                        : 'text-neutral-200 pl-0'
                    }`}>
                    {msg.role === 'assistant' && msg.isTyping ? (
                        <Typewriter text={msg.content} onComplete={() => handleTypingComplete(msg.id)} />
                    ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                    </div>

                    {/* UI Widgets */}
                    {msg.role === 'assistant' && !msg.isTyping && (
                    <div className="mt-2 w-full animate-in fade-in pl-0">
                        
                        {(msg.uiAction === 'REQUEST_LOGO') && (
                            <div className="mt-1">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <Button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    variant="outline" 
                                    size="sm"
                                    className="border-white/20 text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full h-9"
                                >
                                    {formData.imageUrl ? <CheckCircle2 size={14} className="text-emerald-500 mr-2" /> : <Upload size={14} className="mr-2" />}
                                    {formData.imageUrl ? "Logo Uploaded" : "Upload Logo"}
                                </Button>
                            </div>
                        )}

                        {msg.uiAction === 'SHOW_PREVIEW' && (
                        <motion.div 
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                            className="mt-3 w-full"
                        >
                            <Card className="bg-[#0A0A0A] border border-white/10 shadow-2xl relative overflow-hidden group rounded-3xl">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
                                <CardContent className="p-5">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {formData.imageUrl ? (
                                            <img src={formData.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="text-neutral-700" size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-serif font-bold text-white truncate">{formData.name || "Untitled"}</h3>
                                        <Badge variant="outline" className="mt-1 border-white/10 text-neutral-400 font-mono text-[10px]">{formData.symbol || "TICKER"}</Badge>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-neutral-400 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div>Fee: <span className="text-emerald-400 font-mono">0.95%</span></div>
                                    <div>Rebal: <span className="text-white font-mono">{formData.strategy.rebalanceType}</span></div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <ScrollArea className="h-[120px] pr-2">
                                        {(formData.composition || []).map((c, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-neutral-300 font-medium">{c.token.symbol}</span>
                                            </div>
                                            <span className="font-mono text-white text-xs">{c.weight}%</span>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>

                                <div className="flex gap-2">
                                    {/* ★修正2: Modalトリガーボタン 
                                       onClickイベントは正しく動作していますが、Z-index問題でModalが見えていませんでした。
                                       下のDialogContentの修正で解決します。
                                    */}
                                    <Button onClick={() => setIsEditModalOpen(true)} variant="outline" className="flex-1 border-white/10 text-neutral-300 bg-white/5 hover:bg-white/10 h-10 rounded-xl">
                                        <Settings2 size={16} />
                                    </Button>
                                    <Button onClick={handleDeploy} className="flex-[3] bg-white text-black hover:bg-neutral-200 font-bold font-serif h-10 rounded-xl">
                                        <Sparkles size={16} className="mr-2" /> Deploy
                                    </Button>
                                </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        )}
                    </div>
                    )}
                </div>
                </motion.div>
            ))}
            </AnimatePresence>
            
            <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 pb-8 bg-[#000000] border-t border-white/10 z-50">
        <div className="relative w-full max-w-lg mx-auto">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="Type message..."
            className="h-12 pl-5 pr-12 rounded-full bg-[#1A1A1A] border-white/10 focus:border-white/30 text-white placeholder:text-neutral-600 shadow-lg"
            disabled={isLoading}
          />
          <Button 
            onClick={() => sendMessage()} 
            size="icon" 
            disabled={!input.trim() || isLoading} 
            className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full bg-white text-black hover:bg-emerald-400 disabled:opacity-50 disabled:bg-neutral-800 transition-all"
          >
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* --- Edit Modal (Improved) --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        {/* ★修正3: DialogContentのZ-Indexを修正
            classNameに `z-[99999]` (またはそれ以上) を追加して、
            メインの背景よりも手前に来るようにします。
        */}
        <DialogContent className="z-[99999] bg-[#09090b] border-white/10 text-white sm:max-w-[400px] w-[95%] rounded-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="font-serif text-xl">Edit Strategy</DialogTitle>
                <DialogDescription className="text-xs text-neutral-500">
                    Adjust allocations. Total must be 100%.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
                {/* 1. Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <span className="text-xs text-neutral-500 font-bold">Name</span>
                        <Input value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className="bg-white/5 border-white/10 rounded-xl h-10" />
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs text-neutral-500 font-bold">Symbol</span>
                        <Input value={formData.symbol} onChange={(e) => setFormData(p => ({...p, symbol: e.target.value}))} className="bg-white/5 border-white/10 rounded-xl h-10" />
                    </div>
                </div>

                {/* 2. Rebalance & Fee */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <span className="text-xs text-neutral-500 font-bold">Rebalance Freq.</span>
                        <Select 
                            value={formData.strategy.rebalanceType} 
                            onValueChange={(val) => setFormData(p => ({ ...p, strategy: { ...p.strategy, rebalanceType: val } }))}
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111] border-white/10 text-white z-[100000]">
                                <SelectItem value="Daily">Daily</SelectItem>
                                <SelectItem value="Weekly">Weekly</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Threshold">Threshold</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs text-neutral-500 font-bold">Management Fee</span>
                        <div className="h-10 flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-neutral-400 cursor-not-allowed">
                            0.95% (Fixed)
                        </div>
                    </div>
                </div>

                {/* 3. Assets Allocation */}
                <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-500 uppercase font-bold">Assets & Weight</span>
                        <div className={`text-xs font-mono font-bold px-2 py-1 rounded-md ${currentTotalWeight === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            Total: {currentTotalWeight}%
                        </div>
                    </div>

                    {(formData.composition || []).map((c) => {
                        const otherWeight = currentTotalWeight - c.weight;
                        const maxForThis = 100 - otherWeight;
                        return (
                            <div key={c.token.address} className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <img src={c.token.logoURI} alt="" className="w-5 h-5 rounded-full" />
                                        <span className="font-bold text-sm">{c.token.symbol}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm">{c.weight}%</span>
                                        <Button variant="ghost" size="icon" onClick={() => removeToken(c.token.address)} className="h-6 w-6 text-neutral-500 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={12}/></Button>
                                    </div>
                                </div>
                                <Slider 
                                    value={[c.weight]} 
                                    max={Math.max(c.weight, maxForThis)}
                                    step={1} 
                                    onValueChange={(v) => updateWeight(c.token.address, v[0])} 
                                    className="flex-1 py-1" 
                                />
                            </div>
                        );
                    })}
                    
                    {currentTotalWeight < 100 && (
                        <div className="flex items-center gap-2 text-yellow-500 text-xs mt-2 bg-yellow-500/10 p-2 rounded-lg">
                            <AlertTriangle size={12} />
                            <span>You need {100 - currentTotalWeight}% more to reach 100%.</span>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter className="mt-6">
                <Button 
                    onClick={() => setIsEditModalOpen(false)} 
                    disabled={currentTotalWeight !== 100}
                    className="w-full bg-white text-black hover:bg-neutral-200 rounded-xl font-bold h-12 disabled:opacity-50"
                >
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}