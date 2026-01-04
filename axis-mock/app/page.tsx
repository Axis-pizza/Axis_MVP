"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAxisStore } from "@/app/store/useAxisStore";
import { useRouter } from "next/navigation";
import { ExplorePage } from "@/components/pages/ExplorePage";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import {
  Loader2,
  Sparkles,
  ChevronDown,
  X,
  Heart,
  Send,
  Wallet,
  ArrowRight,
  BrainCircuit,
  Zap,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import HeroManyBuilders from "@/components/visuals/HeroManyBuilders";
import {InviteGateModal} from "@/components/layout/InviteGateModal";
import { motion, AnimatePresence } from "framer-motion";

const GOOGLE_CLIENT_ID = "862680354-qf4s464d0msju7rtra43dpbdfgl2e44b.apps.googleusercontent.com";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://axis-api.yusukekikuta-05.workers.dev";

const WalletContextProvider = ({ children }: { children: React.ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const AuthModal = ({ isOpen, onClose, inviteCode }: { isOpen: boolean; onClose: () => void; inviteCode?: string }) => {
  const { login } = useAxisStore();
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const LOGOS = {
    solana: "https://solana.com/src/img/branding/solanaLogoMark.svg",
    google: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
    x: "https://upload.wikimedia.org/wikipedia/commons/5/53/X_logo_2023_original.svg",
  };

  const callBackendLogin = async (payload: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/social-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, inviteCode }), 
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
            className="relative w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="mb-8 space-y-3 text-center">
              <h2 className="text-2xl leading-none font-bold tracking-tight text-white">
                CREATE YOUR
                <br />
                OWN ETF.
              </h2>
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleSolanaAuth}
                disabled={isLoading}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border-0 bg-white text-sm font-bold tracking-wide text-black transition-transform hover:bg-neutral-200 active:scale-95"
              >
                <img src={LOGOS.solana} alt="Solana" className="h-6 w-6 object-contain" />
                {connected ? "Sign in with wallet" : "Login with Solana"}
              </Button>

              <Button
                onClick={() => loginToGoogle()}
                disabled={isLoading}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-[#1c1c1c] text-sm font-medium tracking-wide text-white transition-transform hover:bg-[#2a2a2a] active:scale-95"
              >
                <img src={LOGOS.google} alt="Google" className="h-5 w-5 object-contain" />
                Continue with Google
              </Button>

              <Button
                onClick={handleTwitterAuth}
                disabled={isLoading}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-[#1c1c1c] text-sm font-medium tracking-wide text-white transition-transform hover:bg-[#2a2a2a] active:scale-95"
              >
                <img src={LOGOS.x} alt="X" className="h-4 w-4 object-contain invert" />
                Continue with X
              </Button>
            </div>
            {isLoading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px]">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#14F195]" />
                <p className="animate-pulse font-mono text-xs text-neutral-400">{statusText}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 修正箇所: HeroSection
// ==========================================
const HeroSection = ({ onOpenAuth }: { onOpenAuth: () => void }) => {
  return (
    <section className="relative flex h-screen w-full snap-start flex-col items-center overflow-hidden px-6 pt-32 pb-20">
      <div className="absolute inset-0 from-neutral-900/50" />
      
      {/* 修正: HeroManyBuilders を背景レイヤー (z-0) に配置し、
        pointer-events-none を付与してクリックを透過させる 
      */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <HeroManyBuilders />
      </div>

      <div className="relative z-20 pointer-events-auto mx-auto flex h-full w-full max-w-lg flex-col items-center justify-start text-center md:justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-10 mb-12 space-y-6 md:mt-0"
        >
          <h1 className="text-7xl leading-[1.1] font-bold tracking-tight text-white md:text-6xl">
            Your Strategy.
            <br />
            <span className="text-neutral-500">Your ETF.</span>
          </h1>
          <p className="px-8 text-xs leading-relaxed font-medium tracking-widest text-neutral-400 uppercase md:text-sm">
            Create Your 
            <br className="hidden md:block" /> on-chain index Funds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="group relative w-full cursor-pointer"
          onClick={onOpenAuth}
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#14F195] to-cyan-500 opacity-30 blur transition duration-500 group-hover:opacity-60" />

          <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#09090b] p-1 shadow-2xl transition-colors group-hover:bg-[#111]">
            
            <div className="pr-3 pl-4 text-[#14F195]">
              <Sparkles size={20} fill="currentColor" className="text-[#14F195]/20" />
            </div>

            <div className="relative flex h-14 flex-1 flex-col justify-center px-2">
              <span className="text-[10px] font-bold tracking-wider text-[#14F195] uppercase">
                Start Building
              </span>
              <div className="flex items-center gap-1 text-sm font-bold text-white">
                Create Your ETF
                <span className="ml-1 block h-4 w-0.5 animate-pulse bg-[#14F195]" />
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center border-l border-white/5 text-neutral-400 transition-colors group-hover:text-white">
              <ArrowRight size={20} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const CARDS = [
  {
    id: 1,
    title: "Solana High Yield",
    apy: "+24.5%",
    desc: "Automated rebalancing strategy focusing on LSTs.",
    image:
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop",
    tags: ["LST", "DeFi"],
  },
  {
    id: 2,
    title: "Meme Supercycle",
    apy: "+140.2%",
    desc: "High-risk, high-reward index tracking memes.",
    image:
      "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1000&auto=format&fit=crop",
    tags: ["Meme", "Aggr"],
  },
  {
    id: 3,
    title: "RWA Blue Chip",
    apy: "+8.2%",
    desc: "Stable yield generated from Real World Assets.",
    image:
      "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1000&auto=format&fit=crop",
    tags: ["Stable", "RWA"],
  },
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
    <section className="relative flex h-screen w-full snap-start flex-col items-center justify-center overflow-hidden border-t border-white/5 px-6">
      <div className="pointer-events-none absolute top-20 left-0 z-10 w-full text-center">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-2 font-serif text-4xl text-white"
        >
          Discover ETF
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs tracking-widest text-neutral-500 uppercase"
        >
          Swipe to Invest
        </motion.p>
      </div>
      <div className="relative flex h-[460px] w-full max-w-[340px] items-center justify-center perspective-[1000px]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            if (index > 2) return null;
            const isFront = index === 0;
            return (
              <motion.div
                key={card.id}
                layoutId={`card-${card.id}`}
                initial={false}
                animate={{
                  scale: 1 - index * 0.05,
                  y: index * 20,
                  zIndex: 30 - index,
                  opacity: 1 - index * 0.2,
                  x: isFront ? [0, 0, 150] : 0,
                  rotate: isFront ? [0, 0, 15] : 0,
                }}
                transition={{
                  duration: isFront ? 4 : 0.5,
                  times: isFront ? [0, 0.7, 1] : undefined,
                  ease: "easeInOut",
                }}
                className="absolute top-0 flex h-full w-full origin-bottom flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#111] shadow-2xl"
              >
                <div className="relative h-[60%]">
                  <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/20 to-transparent" />
                  <div className="absolute bottom-2 left-5 w-full pr-10">
                    <h3 className="font-serif text-2xl leading-tight text-white drop-shadow-lg">
                      {card.title}
                    </h3>
                    <p className="font-mono text-lg font-bold text-[#14F195] drop-shadow-md">
                      {card.apy} <span className="text-xs font-normal text-white/60">APY</span>
                    </p>
                  </div>
                </div>
                <div className="flex h-[40%] flex-col justify-between bg-[#111] p-6">
                  <p className="line-clamp-3 text-xs leading-relaxed text-neutral-400">
                    {card.desc}
                  </p>
                  <div className="mt-auto flex justify-center gap-6 pt-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 text-neutral-500">
                      <X size={20} />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
                      <Heart size={20} fill="currentColor" />
                    </div>
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

const ThreeDCard = () => {
  return (
    <div className="flex items-center justify-center perspective-[1000px] py-10">
      <motion.div
        animate={{
          rotateY: [0, 360],
        }}
        transition={{
          duration: 20, // ランディングページ用にゆっくり回転させます
          ease: "linear",
          repeat: Infinity,
        }}
        whileHover={{
          scale: 1.05,
        }}
        className="relative h-[420px] w-72 rounded-3xl"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* --- FRONT SIDE --- */}
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Background & Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

          {/* Moving Glare */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1,
            }}
            className="absolute inset-0 skew-x-12 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
          />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col items-center justify-between p-8 py-10">
            <div className="flex flex-col items-center">
              {/* Logo Placeholder */}
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/10 bg-black p-1 shadow-xl">
                <span className="text-4xl font-bold text-[#14F195]">A</span>
              </div>

              <h3 className="text-center font-serif text-2xl font-bold leading-tight text-white drop-shadow-md">
                Axis High Yield
              </h3>
              
              {/* Badge-like element */}
              <div className="mt-3 rounded-md border border-[#14F195]/50 bg-[#14F195]/10 px-3 py-1 text-xs font-bold text-[#14F195]">
                AXIS
              </div>
            </div>

            {/* Stats Box */}
            <div className="w-full space-y-3 rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex justify-between border-b border-white/10 pb-2 text-xs">
                <span className="text-neutral-500">Structure</span>
                <span className="font-mono text-white">Tokenized Index</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2 text-xs">
                <span className="text-neutral-500">Engine</span>
                <span className="flex items-center gap-1 font-bold text-[#14F195]">
                  <Zap size={10} /> Jito MEV
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Network</span>
                <span className="flex items-center gap-1 text-white">Solana</span>
              </div>
            </div>

            <div className="mt-2 font-mono text-[9px] tracking-widest text-neutral-600">
              AXIS PROTOCOL • VERIFIED
            </div>
          </div>

          {/* Border Glow */}
          <div className="absolute inset-0 z-20 rounded-3xl border border-[#14F195]/30" />
        </div>

        {/* --- BACK SIDE --- */}
        <div
          className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#050505] shadow-xl"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* Back Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <BrainCircuit size={150} className="text-white" />
          </div>

          <div className="relative z-10 text-center">
            <div className="mb-2 font-serif text-3xl font-bold text-white">Axis.</div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-[#14F195]">
              QUANTUM VAULT
            </div>
          </div>

          {/* Back Glare */}
          <motion.div
            animate={{ x: ["200%", "-100%"] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 1,
            }}
            className="absolute inset-0 -skew-x-12 bg-gradient-to-tr from-transparent via-white/10 to-transparent"
          />
          <div className="absolute inset-0 rounded-3xl border border-white/5" />
        </div>
      </motion.div>
    </div>
  );
};

const ChatSection = () => {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center border-t border-white/5  px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#14F195]/5 via-[#09090b] to-[#09090b]" />
      
      <div className="relative z-10 mb-12 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 font-serif text-3xl text-white md:text-5xl"
        >
          DEPLOY STRATEGIES
          <br />
          AS TOKENS.
        </motion.h2>
        <motion.p
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
           className="text-xs uppercase tracking-widest text-neutral-500"
        >
          One Click Deployment · Auto-Rebalancing · Liquid
        </motion.p>
      </div>

      <div className="relative z-10">
        <ThreeDCard />
      </div>
    </section>
  );
};

const QA_ITEMS = [
  {
    q: "What is Axis Protocol?",
    a: "Axis is a decentralized platform where AI agents actively manage ETF-like vaults on Solana. You can invest in curated strategies or create your own.",
  },
  {
    q: "How does the AI work?",
    a: "Our AI agents analyze on-chain data, market volatility, and social sentiment to rebalance portfolios automatically 24/7, maximizing yield while managing risk.",
  },
  {
    q: "Is it non-custodial?",
    a: "Yes. You retain full ownership of your assets. The protocol only has permission to swap tokens within the vault according to the strategy parameters.",
  },
  {
    q: "What are the fees?",
    a: "We charge a minimal management fee (0.95% annualized) to cover automation costs and reward strategy creators. There are no lock-up periods.",
  },
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative flex h-screen w-full snap-start flex-col items-center justify-start overflow-hidden border-t border-white/5 px-6 pt-24">
      <div className="relative z-10 mb-12 w-full text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-2 font-serif text-3xl text-white"
        >
          Questions?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs tracking-widest text-neutral-500 uppercase"
        >
          Everything you need to know
        </motion.p>
      </div>

      <div className="z-10 w-full max-w-md">
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
              className="group flex w-full items-center justify-between py-6 text-left"
            >
              <span
                className={`text-sm font-medium tracking-wide transition-colors ${openIndex === index ? "text-white" : "text-neutral-400 group-hover:text-white"}`}
              >
                {item.q}
              </span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown
                  size={16}
                  className={openIndex === index ? "text-white" : "text-neutral-600"}
                />
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
                  <p className="pb-6 text-xs leading-relaxed font-light text-neutral-500">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-white/5 blur-[100px]" />

      <div className="z-10 mt-auto flex gap-6 pb-10 text-[10px] tracking-widest text-neutral-600 uppercase">
        <a href="#" className="transition-colors hover:text-white">
          Terms
        </a>
        <a href="#" className="transition-colors hover:text-white">
          Privacy
        </a>
        <a href="#" className="transition-colors hover:text-white">
          Twitter
        </a>
      </div>
    </section>
  );
};

const STEPS = [
  {
    id: "01",
    title: "Connect Wallet",
    desc: "Link your Solana wallet to create your investor profile.",
    action: "GET STARTED",

    visual: (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-neutral-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#9945FF,transparent_70%)] opacity-20" />
        <Wallet className="relative z-10 h-12 w-12 text-white" strokeWidth={1} />
      </div>
    ),
  },
  {
    id: "02",
    title: "Choose OR Create",
    desc: "Swipe to find top vaults or chat with AI to build your own.",
    action: "EXPLORE VAULTS",
    visual: (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-neutral-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#14F195,transparent_70%)] opacity-20" />
        <div className="relative z-10 flex gap-2">
          <div className="h-10 w-8 rounded-md border border-white/20 bg-black" />
          <div className="h-10 w-8 scale-110 rounded-md border border-[#14F195] bg-black shadow-[0_0_15px_rgba(20,241,149,0.3)]" />
          <div className="h-10 w-8 rounded-md border border-white/20 bg-black" />
        </div>
      </div>
    ),
  },
  {
    id: "03",
    title: "Earn Returns",
    desc: "Let AI agents manage rebalancing while you earn rewards.",
    action: "VIEW DASHBOARD",
    visual: (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-neutral-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#FFFFFF,transparent_70%)] opacity-10" />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-[#14F195]">+24.5%</span>
          <span className="text-[10px] tracking-widest text-neutral-500 uppercase">APY</span>
        </div>
      </div>
    ),
  },
];

const StepsSection = () => {
  return (
    <section className="relative flex min-h-screen w-full snap-start flex-col items-center justify-center border-t border-white/5 px-6 py-20 md:py-0">
      <div className="mb-12 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 font-serif text-3xl tracking-tight text-white md:text-5xl"
        >
          SIMPLE STEPS TO
          <br />
          BUILD WEALTH
        </motion.h2>
      </div>

      <div className="grid h-auto w-full max-w-5xl grid-cols-1 gap-4 md:h-[60vh] md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2, duration: 0.6 }}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-6 transition-colors hover:border-white/20"
          >
            <span className="absolute top-4 right-6 font-serif text-6xl font-bold text-white/5 transition-colors select-none group-hover:text-white/10">
              {step.id}
            </span>

            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-6 flex-1">{step.visual}</div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold tracking-wide text-white">{step.title}</h3>
                <p className="max-w-[90%] text-sm leading-relaxed text-neutral-400">{step.desc}</p>
              </div>

              <div className="mt-6 border-t border-white/5 pt-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[10px] font-bold tracking-widest text-white uppercase transition-all group-hover:bg-white group-hover:text-black">
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

export default function LandingPage() {
  const { isRegistered } = useAxisStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState<string | undefined>(undefined);
const router = useRouter();
  

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isRegistered) {
      router.push("/pages");
    }
  }, [isMounted, isRegistered, router]);

  if (!isMounted || isRegistered) return <div className="min-h-screen bg-black" />;

  const handleStart = () => {
    if (isRegistered) {
     
      setIsAuthOpen(true);
    } else {
     
      setIsGateOpen(true);
    }
  };

 
  const handleGateVerified = (code: string) => {
    setVerifiedCode(code);
    setIsGateOpen(false);
    
    setTimeout(() => setIsAuthOpen(true), 300);
  };

  if (!isMounted) return <div className="min-h-screen " />;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <WalletContextProvider>
        {isRegistered ? (
          <AppLayout>
            <ExplorePage />
          </AppLayout>
        ) : (
          <main className="min-h-screen w-full text-white selection:bg-[#14F195] selection:text-black">
            <header className="pointer-events-none fixed top-0 left-0 z-40 flex w-full items-center justify-between px-6 py-6 mix-blend-difference">
              <span className="font-serif text-xl font-bold tracking-tighter text-white">
                Axis.
              </span>
            </header>

            <HeroSection onOpenAuth={handleStart} />
            <StepsSection />
            <SwipeSection />
            <ChatSection />
            <FaqSection />
            <InviteGateModal 
                isOpen={isGateOpen} 
                onClose={() => setIsGateOpen(false)} 
                onVerified={handleGateVerified} 
            />
            <AuthModal 
                isOpen={isAuthOpen} 
                onClose={() => setIsAuthOpen(false)} 
                inviteCode={verifiedCode}
            />
          </main>
        )}

        <Toaster position="top-center" theme="dark" />
      </WalletContextProvider>
    </GoogleOAuthProvider>
  );
}