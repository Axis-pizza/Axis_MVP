"use client";

import { useEffect, useState, useCallback, useMemo } from "react"; // useMemo追加
import { useAxisStore } from "@/app/store/useAxisStore";
import { ExplorePage } from "@/components/pages/ExplorePage";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
// --- Solana Wallet Imports ---
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
// CSSのインポート (これを忘れるとモーダルのスタイルが崩れます)
import "@solana/wallet-adapter-react-ui/styles.css";

import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { Loader2, Sparkles, ChevronDown, X, Heart, Send, Wallet, SlidersHorizontal, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";


const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://axis-api.yusukekikuta-05.workers.dev";

// ------------------------------------------------------------------
// 0. Wallet Context Provider (ここを追加)
// アプリ全体でSolanaウォレットを使えるようにするためのラッパー
// ------------------------------------------------------------------
const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  // ネットワーク設定 (Devnet / Mainnet)
  const network = WalletAdapterNetwork.Devnet; 
  
  // RPCエンドポイント
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // 使用するウォレットアダプター
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// ------------------------------------------------------------------
// 1. Auth Modal
// ------------------------------------------------------------------
const AuthModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { login } = useAxisStore();
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal(); // プロバイダー内であれば動作します
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const LOGOS = {
    solana: "https://solana.com/src/img/branding/solanaLogoMark.svg",
    google: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
    x: "https://upload.wikimedia.org/wikipedia/commons/5/53/X_logo_2023_original.svg" // 黒背景用なら白ロゴがいいですが、ここでは標準ロゴ
  };
  
  const callBackendLogin = async (payload: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/social-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Authentication failed");
      }
      return await res.json();
    } catch (error) {
      console.error("Backend Auth Error:", error);
      throw error;
    }
  };

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setIsLoading(true);
    setStatusText("Verifying Google account...");
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      const authResult = await callBackendLogin({
        provider: "google",
        email: userInfo.email,
        google_id: userInfo.sub,
      });

      if (authResult.success) {
        login(authResult.user);
        toast.success(`Welcome back!`);
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify Google profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginToGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error("Google login connection failed."),
  });

  const handleSolanaAuth = useCallback(async () => {
    if (!connected || !publicKey) {
      // WalletModalProvider でラップされているのでエラーが出ずにモーダルが開きます
      setVisible(true);
      return;
    }
    setIsLoading(true);
    setStatusText("Requesting wallet signature...");

    try {
      if (signMessage) {
        const messageString = `Log in to Axis Protocol\nTimestamp: ${Date.now()}`;
        const message = new TextEncoder().encode(messageString);
        await signMessage(message);
      }

      const authResult = await callBackendLogin({
        provider: "solana",
        wallet_address: publicKey.toBase58(),
      });

      if (authResult.success) {
        login(authResult.user);
        toast.success("Wallet verified successfully!");
        onClose();
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Authentication cancelled.");
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, signMessage, setVisible, login, onClose]);

  const handleTwitterAuth = () => {
    setIsLoading(true);
    setStatusText("Connecting to X...");
    
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      `${API_BASE_URL}/auth/twitter`,
      "Twitter Login",
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "AXIS_AUTH_SUCCESS" && event.data.provider === "twitter") {
            const user = event.data.user;
            login(user);
            toast.success(`Welcome from X!`);
            setIsLoading(false);
            onClose();
            window.removeEventListener("message", handleMessage);
        }
    };
    window.addEventListener("message", handleMessage);

    const timer = setInterval(() => {
        if (popup?.closed) {
            clearInterval(timer);
            window.removeEventListener("message", handleMessage);
            setIsLoading(false);
        }
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-[360px] bg-[#09090b] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            <button onClick={onClose} disabled={isLoading} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
              <X size={20} />
            </button>
            <div className="text-center mb-8 space-y-3">
              <h2 className="text-2xl font-bold text-white tracking-tight leading-none">
                CREATE YOUR<br/>OWN ETF.
              </h2>
            </div>
            <div className="space-y-3">
            <Button 
                onClick={handleSolanaAuth} 
                disabled={isLoading} 
                className="w-full h-14 bg-white hover:bg-neutral-200 text-black rounded-xl border-0 flex items-center justify-center gap-3 text-sm font-bold tracking-wide transition-transform active:scale-95"
            >
               <img src={LOGOS.solana} alt="Solana" className="w-6 h-6 object-contain" />
               {connected ? "Sign in with wallet" : "Login with Solana"}
            </Button>

            {/* Google Button */}
            <Button 
                onClick={() => loginToGoogle()} 
                disabled={isLoading} 
                className="w-full h-14 bg-[#1c1c1c] hover:bg-[#2a2a2a] text-white rounded-xl border border-white/5 flex items-center justify-center gap-3 text-sm font-medium tracking-wide transition-transform active:scale-95"
            >
              <img src={LOGOS.google} alt="Google" className="w-5 h-5 object-contain" />
              Continue with Google
            </Button>

            {/* Twitter Button */}
            <Button 
                onClick={handleTwitterAuth} 
                disabled={isLoading} 
                className="w-full h-14 bg-[#1c1c1c] hover:bg-[#2a2a2a] text-white rounded-xl border border-white/5 flex items-center justify-center gap-3 text-sm font-medium tracking-wide transition-transform active:scale-95"
            >
              {/* Xのロゴは白く反転させるためにinvertフィルタを使用 */}
              <img src={LOGOS.x} alt="X" className="w-4 h-4 object-contain invert" />
              Continue with X
            </Button>
            </div>
            {isLoading && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#14F195] mb-2" />
                <p className="text-xs text-neutral-400 font-mono animate-pulse">{statusText}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ------------------------------------------------------------------
// 2. Sections (Hero, Swipe, Chat) - 内容は同じなので省略せずに記載
// ------------------------------------------------------------------

const HeroSection = ({ onOpenAuth }: { onOpenAuth: () => void }) => {
  // 簡易的なセクター選択ステート
  const [selectedSector, setSelectedSector] = useState("Solana High Yield");

  return (
    <section className="h-screen w-full snap-start relative flex flex-col items-center pt-32 pb-20 px-6 overflow-hidden">
      
      {/* Background Effects (Travala風の地球儀っぽさを出すため下部に配置) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/50 via-black to-black" />
      
      {/* Globe Representation */}
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute bottom-[-40vh] left-1/2 -translate-x-1/2 w-[150vw] h-[150vw] md:w-[80vw] md:h-[80vw] bg-[#000] border border-white/10 rounded-full shadow-[0_0_100px_rgba(20,241,149,0.1)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        {/* Grid lines to look like a globe */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
        
        {/* Glowing Dots (Mocking "Stays" or "Vaults") */}
        <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-[30%] left-[40%] w-2 h-2 bg-[#14F195] rounded-full blur-[2px]" />
        <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} className="absolute top-[45%] left-[60%] w-1.5 h-1.5 bg-cyan-400 rounded-full blur-[1px]" />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-lg mx-auto h-full justify-start md:justify-center">
        
        {/* Text Area */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
           className="space-y-6 mb-12 mt-10 md:mt-0"
        >
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                INVEST SMARTER.<br/>
                <span className="text-neutral-500">EARN MORE.</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm font-medium tracking-widest uppercase px-8 leading-relaxed">
                Book your position in top performing<br className="hidden md:block"/> on-chain strategies with AI.
            </p>
        </motion.div>

        {/* --- HERO WIDGET (The "Travala Search Bar") --- */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full relative group"
        >
            {/* Glow Effect behind widget */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#14F195] to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur" />
            
            {/* The Widget Container */}
            <div className="relative bg-[#09090b] border border-white/10 rounded-2xl p-1 flex items-center shadow-2xl">
                
                {/* Icon Area */}
                <div className="pl-4 pr-3 text-[#14F195]">
                    <Sparkles size={20} fill="currentColor" className="text-[#14F195]/20" />
                </div>

                {/* Input / Selector Area */}
                <div className="flex-1 h-12 flex flex-col justify-center cursor-pointer hover:bg-white/5 rounded-lg px-2 transition-colors relative" onClick={onOpenAuth}>
                    <span className="text-[10px] text-neutral-500 font-bold tracking-wider uppercase">Select Strategy</span>
                    <div className="text-white font-medium text-sm flex items-center gap-2">
                        {selectedSector}
                    </div>
                </div>

                {/* Filter / Settings Button */}
                <button className="h-12 w-12 flex items-center justify-center text-neutral-400 hover:text-white transition-colors border-l border-white/5">
                    <SlidersHorizontal size={18} />
                </button>
            </div>

            {/* Main Action Button (Floating below or attached) */}
            <div className="mt-4">
                <Button 
                    onClick={onOpenAuth}
                    className="w-full h-14 rounded-xl bg-[#14F195] hover:bg-[#10c479] text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(20,241,149,0.2)] border-0 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    EXPLORE VAULTS
                    <ArrowRight size={16} />
                </Button>
            </div>
        </motion.div>

      </div>
    </section>
  );
};

// ... (SwipeSection と ChatSection のコードは変更がないため、元のコードを使用してください) ...
const CARDS = [
  { id: 1, title: "Solana High Yield", apy: "+24.5%", desc: "Automated rebalancing strategy focusing on LSTs.", image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop", tags: ["LST", "DeFi"] },
  { id: 2, title: "Meme Supercycle", apy: "+140.2%", desc: "High-risk, high-reward index tracking memes.", image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1000&auto=format&fit=crop", tags: ["Meme", "Aggr"] },
  { id: 3, title: "RWA Blue Chip", apy: "+8.2%", desc: "Stable yield generated from Real World Assets.", image: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1000&auto=format&fit=crop", tags: ["Stable", "RWA"] }
];

const SwipeSection = () => {
  const [cards, setCards] = useState(CARDS);
  useEffect(() => {
    const interval = setInterval(() => {
      setCards((prev) => {
        const newCards = [...prev];
        const top = newCards.shift();
        if (top) newCards.push(top);
        return newCards;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="h-screen w-full snap-start relative flex flex-col items-center justify-center overflow-hidden px-6 border-t border-white/5">
      <div className="absolute top-20 left-0 w-full text-center z-10 pointer-events-none">
        <motion.h2 initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-4xl font-serif text-white mb-2">Discover ETF</motion.h2>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-neutral-500 text-xs tracking-widest uppercase">Swipe to Invest</motion.p>
      </div>
      <div className="relative w-full max-w-[340px] h-[460px] flex items-center justify-center perspective-[1000px]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            if (index > 2) return null;
            const isFront = index === 0;
            return (
              <motion.div
                key={card.id}
                layoutId={`card-${card.id}`}
                initial={false}
                animate={{ scale: 1 - index * 0.05, y: index * 20, zIndex: 30 - index, opacity: 1 - index * 0.2, x: isFront ? [0, 0, 150] : 0, rotate: isFront ? [0, 0, 15] : 0 }}
                transition={{ duration: isFront ? 4 : 0.5, times: isFront ? [0, 0.7, 1] : undefined, ease: "easeInOut" }}
                className="absolute top-0 w-full h-full rounded-[32px] border border-white/10 bg-[#111] overflow-hidden shadow-2xl flex flex-col origin-bottom"
              >
                <div className="h-[60%] relative">
                   <img src={card.image} alt={card.title} className="w-full h-full object-cover"/>
                   <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/20 to-transparent" />
                   <div className="absolute bottom-2 left-5 w-full pr-10">
                      <h3 className="text-white font-serif text-2xl drop-shadow-lg leading-tight">{card.title}</h3>
                      <p className="text-[#14F195] text-lg font-mono font-bold drop-shadow-md">{card.apy} <span className="text-xs text-white/60 font-normal">APY</span></p>
                   </div>
                </div>
                <div className="h-[40%] p-6 flex flex-col justify-between bg-[#111]">
                    <p className="text-neutral-400 text-xs leading-relaxed line-clamp-3">{card.desc}</p>
                    <div className="flex justify-center gap-6 mt-auto pt-2">
                        <div className="w-12 h-12 rounded-full border border-neutral-800 bg-neutral-900/50 flex items-center justify-center text-neutral-500"><X size={20} /></div>
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center"><Heart size={20} fill="currentColor" /></div>
                    </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
};
const ChatSection = () => {
  return (
    <section className="h-screen w-full snap-start relative flex flex-col items-center justify-center overflow-hidden px-6 border-t border-white/5">
       <div className="absolute top-20 left-0 w-full text-center z-10">
        <motion.h2 initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-4xl font-serif text-white mb-2">Create your ETF</motion.h2>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-neutral-500 text-xs tracking-widest uppercase">Chat with AI Agent</motion.p>
      </div>
      <div className="w-full max-w-md space-y-4 z-10 mt-10">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex gap-4 items-end">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">AI</div>
            <div className="bg-neutral-900 border border-white/10 p-4 rounded-2xl rounded-bl-sm max-w-[80%]"><p className="text-neutral-300 text-sm font-light">How can I help you structure your portfolio today?</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="flex gap-4 items-end flex-row-reverse">
             <div className="bg-white text-black p-4 rounded-2xl rounded-br-sm max-w-[80%]"><p className="text-sm font-medium">I want a low-risk vault with stablecoins and blue-chip exposure.</p></div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 1.5 }} className="flex gap-4 items-end">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">AI</div>
            <div className="bg-neutral-900 border border-white/10 p-4 rounded-2xl rounded-bl-sm max-w-[90%] w-full">
                <div className="flex items-center gap-2 mb-3"><Loader2 className="w-3 h-3 animate-spin text-neutral-500" /><span className="text-xs text-neutral-500 uppercase tracking-wider">Analyzing Market...</span></div>
                <div className="h-16 flex items-end gap-1 w-full opacity-50">{[40, 60, 35, 70, 50, 80].map((h, i) => (<motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} transition={{ duration: 0.5, delay: 1.8 + (i * 0.1) }} className="flex-1 bg-white/20 rounded-t-sm" />))}</div>
            </div>
        </motion.div>
      </div>
      <motion.div initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="absolute bottom-12 w-[90%] max-w-md h-14 bg-neutral-900/80 backdrop-blur border border-white/10 rounded-full flex items-center px-6 justify-between">
        <span className="text-neutral-600 text-sm">Type your strategy...</span>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Send size={14} className="text-white" /></div>
      </motion.div>
    </section>
  );
};

// --- Section 4: FAQ (Q&A) ---
const QA_ITEMS = [
  {
    q: "What is Axis Protocol?",
    a: "Axis is a decentralized platform where AI agents actively manage ETF-like vaults on Solana. You can invest in curated strategies or create your own."
  },
  {
    q: "How does the AI work?",
    a: "Our AI agents analyze on-chain data, market volatility, and social sentiment to rebalance portfolios automatically 24/7, maximizing yield while managing risk."
  },
  {
    q: "Is it non-custodial?",
    a: "Yes. You retain full ownership of your assets. The protocol only has permission to swap tokens within the vault according to the strategy parameters."
  },
  {
    q: "What are the fees?",
    a: "We charge a minimal management fee (0.95% annualized) to cover automation costs and reward strategy creators. There are no lock-up periods."
  }
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="h-screen w-full snap-start relative flex flex-col items-center justify-start pt-24 px-6 border-t border-white/5 overflow-hidden">
      
      {/* Header */}
      <div className="w-full text-center mb-12 relative z-10">
        <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl font-serif text-white mb-2"
        >
            Questions?
        </motion.h2>
        <motion.p 
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ delay: 0.3 }}
             className="text-neutral-500 text-xs tracking-widest uppercase"
        >
            Everything you need to know
        </motion.p>
      </div>

      {/* Accordion Container */}
      <div className="w-full max-w-md z-10">
        {QA_ITEMS.map((item, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border-b border-white/10"
          >
            <button 
              onClick={() => toggle(index)}
              className="w-full py-6 flex items-center justify-between text-left group"
            >
              <span className={`text-sm font-medium tracking-wide transition-colors ${openIndex === index ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
                {item.q}
              </span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={16} className={openIndex === index ? 'text-white' : 'text-neutral-600'} />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 text-xs text-neutral-500 leading-relaxed font-light">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Background Decor */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Footer Links (Nomadz style) */}
      <div className="mt-auto pb-10 flex gap-6 text-[10px] text-neutral-600 uppercase tracking-widest z-10">
        <a href="#" className="hover:text-white transition-colors">Terms</a>
        <a href="#" className="hover:text-white transition-colors">Privacy</a>
        <a href="#" className="hover:text-white transition-colors">Twitter</a>
      </div>

    </section>
  );
};

// --- Section 1.5: How it Works (Steps) ---
const STEPS = [
  {
    id: "01",
    title: "Connect Wallet",
    desc: "Link your Solana wallet to create your investor profile.",
    action: "GET STARTED",
    // 抽象的なビジュアル (CSSで表現)
    visual: (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900 rounded-xl border border-white/5 overflow-hidden relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#9945FF,transparent_70%)] opacity-20" />
         <Wallet className="w-12 h-12 text-white relative z-10" strokeWidth={1} />
      </div>
    )
  },
  {
    id: "02",
    title: "Choose OR Create",
    desc: "Swipe to find top vaults or chat with AI to build your own.",
    action: "EXPLORE VAULTS",
    visual: (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900 rounded-xl border border-white/5 overflow-hidden relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#14F195,transparent_70%)] opacity-20" />
         <div className="flex gap-2 relative z-10">
            <div className="w-8 h-10 border border-white/20 rounded-md bg-black" />
            <div className="w-8 h-10 border border-[#14F195] rounded-md bg-black scale-110 shadow-[0_0_15px_rgba(20,241,149,0.3)]" />
            <div className="w-8 h-10 border border-white/20 rounded-md bg-black" />
         </div>
      </div>
    )
  },
  {
    id: "03",
    title: "Earn Returns",
    desc: "Let AI agents manage rebalancing while you earn rewards.",
    action: "VIEW DASHBOARD",
    visual: (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900 rounded-xl border border-white/5 overflow-hidden relative">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#FFFFFF,transparent_70%)] opacity-10" />
         <div className="flex flex-col items-center gap-1 relative z-10">
            <span className="text-2xl font-bold text-[#14F195]">+24.5%</span>
            <span className="text-[10px] text-neutral-500 tracking-widest uppercase">APY</span>
         </div>
      </div>
    )
  }
];

const StepsSection = () => {
  return (
    <section className="min-h-screen w-full snap-start relative flex flex-col items-center justify-center px-6 border-t border-white/5 py-20 md:py-0">
      
      {/* Title */}
      <div className="text-center mb-12">
        <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-5xl font-serif text-white mb-4 tracking-tight"
        >
            SIMPLE STEPS TO<br/>BUILD WEALTH
        </motion.h2>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl h-auto md:h-[60vh]">
        {STEPS.map((step, i) => (
            <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="group relative flex flex-col bg-[#09090b] border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-colors overflow-hidden"
            >
                {/* Number */}
                <span className="text-6xl font-serif text-white/5 font-bold absolute top-4 right-6 select-none group-hover:text-white/10 transition-colors">
                    {step.id}
                </span>

                <div className="relative z-10 flex flex-col h-full">
                    {/* Visual Area */}
                    <div className="flex-1 mb-6">
                        {step.visual}
                    </div>

                    {/* Text Content */}
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold text-white tracking-wide">{step.title}</h3>
                        <p className="text-sm text-neutral-400 leading-relaxed max-w-[90%]">
                            {step.desc}
                        </p>
                    </div>

                    {/* Button-like visual */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-white bg-white/5 px-4 py-2 rounded-full uppercase group-hover:bg-white group-hover:text-black transition-all">
                            {step.action}
                        </div>
                    </div>
                </div>
            </motion.div>
        ))}
      </div>
    </section>
  );
};

// ------------------------------------------------------------------
// Main Layout 
// ------------------------------------------------------------------
export default function LandingPage() {
  const { isRegistered } = useAxisStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return <div className="min-h-screen bg-black" />;

  return (
    // ★ 常にこのプロバイダーが一番外側にある状態にする
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <WalletContextProvider>
        
        {/* 条件分岐をここで行う */}
        {isRegistered ? (
          // ログイン後: アプリ画面 (Providerの内側なのでウォレット情報は維持される)
          <AppLayout>
            <ExplorePage />
          </AppLayout>
        ) : (
          // ログイン前: ランディングページ
          <main className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth text-white no-scrollbar">
            
            <header className="fixed top-0 left-0 w-full z-40 px-6 py-6 flex justify-between items-center mix-blend-difference pointer-events-none">
                <span className="text-xl font-serif font-bold tracking-tighter text-white">Axis.</span>
                <div className="px-3 py-1 rounded-full border border-white/20 text-[10px] tracking-widest uppercase bg-black/50 backdrop-blur-md pointer-events-auto text-white">Beta</div>
            </header>

            <HeroSection onOpenAuth={() => setIsAuthOpen(true)} />
            <StepsSection />
            <SwipeSection />
            <ChatSection />
            <FaqSection />
            
            {/* AuthModalもProviderの内側にあるため、useWalletModal等が正常に動く */}
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
          </main>
        )}

        {/* Toasterも共通で配置 */}
        <Toaster position="top-center" theme="dark" />
        
      </WalletContextProvider>
    </GoogleOAuthProvider>
  );
}