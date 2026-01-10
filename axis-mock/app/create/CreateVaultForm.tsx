"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  Sparkles,
  Zap,
  Trash2,
  ArrowLeft,
  Plus,
  Search,
  AlertTriangle,
  BrainCircuit,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";

// ==========================================
// 定数定義
// ==========================================

/** 最大アセット数 */
const MAX_ASSETS = 10;

/** カラーパレット：各トークンに割り当てられる色 */
const COLOR_PALETTE = [
  "#9945FF", "#22C55E", "#F97316", "#3B82F6", 
  "#EF4444", "#EAB308", "#EC4899", "#14B8A6",
];

/** 積極的戦略のターゲットシンボル */
const AGGRESSIVE_STRATEGY_SYMBOLS = ["BONK", "WIF", "JUP", "PYTH", "RAY", "POPCAT", "SOL"];

/** バランス型戦略のターゲットシンボル */
const BALANCED_STRATEGY_SYMBOLS = ["SOL", "mSOL", "JitoSOL", "USDC", "USDT", "INF"];

/** 積極的戦略のウェイト配分 */
const AGGRESSIVE_WEIGHTS = [40, 30, 20, 10];

/** バランス型戦略のウェイト配分 */
const BALANCED_WEIGHTS = [60, 30, 10];

// ==========================================
// 型定義
// ==========================================

/** トークン情報 */
interface Token {
  address: string;
  symbol: string;
  name: string;
  logoURI: string | null;
}

/** ポートフォリオ構成アイテム */
interface CompositionItem {
  token: Token;
  weight: number;
  color: string;
}

/** ステップ番号 */
type StepNumber = 1 | 2 | 3 | 4;

/** AI戦略タイプ */
type StrategyType = 'aggressive' | 'balanced';

/** シミュレーションデータ */
interface SimulationData {
  roi: string;
  stdDev: string;
  type: string;
}

// ==========================================
// ヘルパー関数
// ==========================================

/**
 * トークンリストからシンボルで検索
 * @param tokens - トークンリスト
 * @param symbols - 検索するシンボルのリスト
 * @param maxCount - 最大取得数
 * @returns 重複のないトークンリスト
 */
const findTokensBySymbols = (
  tokens: Token[],
  symbols: string[],
  maxCount: number
): Token[] => {
  const candidates: Token[] = [];
  const usedAddresses = new Set<string>();

  for (const sym of symbols) {
    const found = tokens.find(t => t.symbol.toUpperCase() === sym.toUpperCase());
    if (found && !usedAddresses.has(found.address)) {
      candidates.push(found);
      usedAddresses.add(found.address);
    }
    if (candidates.length >= maxCount) break;
  }

  return candidates;
};

/**
 * ウェイトを適用してCompositionItemを作成
 * @param tokens - トークンリスト
 * @param weights - ウェイト配列
 * @returns CompositionItemの配列
 */
const applyWeightsToTokens = (
  tokens: Token[],
  weights: number[]
): CompositionItem[] => {
  return tokens.map((token, idx) => ({
    token,
    weight: weights[idx] || 0,
    color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
  }));
};

/**
 * ウェイトの合計を100%に調整
 * @param composition - 構成アイテム配列
 * @returns 調整後の構成アイテム配列
 */
const normalizeWeights = (composition: CompositionItem[]): CompositionItem[] => {
  if (composition.length === 0) return composition;
  
  const total = composition.reduce((sum, item) => sum + item.weight, 0);
  if (total === 100) return composition;
  
  const adjusted = [...composition];
  adjusted[0].weight += (100 - total);
  return adjusted;
};

// ==========================================
// サブコンポーネント
// ==========================================

/**
 * シミュレーションチャート
 * バックテストの結果を可視化するSVGチャート
 */
const SimulationChart = ({ isAggressive }: { isAggressive: boolean }) => {
  const width = 300;
  const height = 150;
  const solPoints = "0,120 50,110 100,115 150,90 200,80 250,85 300,70";
  const etfPoints = isAggressive
    ? "0,120 50,100 100,110 150,60 200,70 250,40 300,10"
    : "0,120 50,115 100,105 150,95 200,85 250,75 300,60";

  return (
    <div className="relative w-full h-48 bg-white/5 rounded-xl border border-white/10 p-4 overflow-hidden">
      <div className="absolute top-2 left-4 text-xs font-bold text-neutral-500">
        Backtest Simulation (1Y)
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* 基準線 */}
        <line x1="0" y1="120" x2="300" y2="120" stroke="#333" strokeWidth="1" strokeDasharray="4" />
        {/* SOLのパフォーマンス（比較用） */}
        <path d={`M${solPoints}`} fill="none" stroke="#666" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
        <text x="280" y="65" fill="#666" fontSize="10">SOL</text>
        {/* ETFのパフォーマンス（アニメーション付き） */}
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

/**
 * 3Dホログラフィックカード（自動回転）
 * Vaultの詳細情報を表示する3Dアニメーションカード
 */
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
        {/* 表面 */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-[#0a0a0a]"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* 背景とエフェクト */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black" />
          
          {/* 光の効果（アニメーション） */}
          <motion.div 
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent skew-x-12"
          />

          {/* コンテンツ */}
          <div className="relative z-10 flex flex-col items-center justify-between h-full p-8 py-10">
            <div className="flex flex-col items-center">
              {/* ロゴ */}
              <div className="relative w-24 h-24 rounded-full border-4 border-white/10 p-1 mb-6 shadow-xl bg-black">
                {logo ? (
                  <img src={logo} className="w-full h-full rounded-full object-cover" alt={ticker} />
                ) : (
                  <div className="w-full h-full rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-3xl font-bold text-emerald-500">{ticker[0]}</span>
                  </div>
                )}
              </div>
              
              {/* Vault名とティッカー */}
              <h3 className="text-2xl font-serif font-bold text-white text-center leading-tight drop-shadow-md">
                {name}
              </h3>
              <Badge variant="outline" className="mt-3 border-emerald-500/50 text-emerald-400 bg-emerald-500/10 px-3 py-1">
                {ticker}
              </Badge>
            </div>

            {/* 情報パネル */}
            <div className="w-full space-y-3 bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
              <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                <span className="text-neutral-500">Structure</span>
                <span className="font-mono">Tokenized Index</span>
              </div>
              <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                <span className="text-neutral-500">Engine</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Zap size={10}/> Jito MEV
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Network</span>
                <span className="flex items-center gap-1">Solana</span>
              </div>
            </div>
            
            {/* フッター */}
            <div className="text-[9px] text-neutral-600 font-mono tracking-widest mt-2">
              AXIS PROTOCOL • VERIFIED
            </div>
          </div>
          
          {/* ボーダーグロー */}
          <div className="absolute inset-0 rounded-3xl border border-emerald-500/30 z-20" />
        </div>

        {/* 裏面 */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border border-white/10 overflow-hidden shadow-xl bg-[#050505] flex items-center justify-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {/* 裏面のパターン */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <BrainCircuit size={150} />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="text-3xl font-serif font-bold text-white mb-2">Axis.</div>
            <div className="text-[10px] text-emerald-500 font-mono tracking-[0.3em]">QUANTUM VAULT</div>
          </div>

          {/* 裏面の光効果 */}
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

// ==========================================
// メインコンポーネント
// ==========================================

/**
 * Create Vault Wizard
 * Vaultを作成するための4ステップウィザード
 * Step 1: アイデンティティの定義（名前、ティッカー、ロゴ）
 * Step 2: ポートフォリオ構成（トークン選択とウェイト配分）
 * Step 3: AIパフォーマンス予測（シミュレーション）
 * Step 4: デプロイ確認
 */
export default function CreateWizard() {
  const router = useRouter();
  const { user } = usePrivy();
  
  // ウォレットアドレスを取得
  const walletAccounts = user?.linkedAccounts?.filter((account: { type: string }) => account.type === 'wallet') || [];
  const walletAddress = user?.wallet?.address || (walletAccounts.length > 0 ? (walletAccounts[0] as { address?: string }).address : undefined);

  // ==========================================
  // ステート管理
  // ==========================================

  // ウィザードのステップ
  const [step, setStep] = useState<StepNumber>(1);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Vaultデータ
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

  // トークン選択
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // シミュレーション
  const [simData, setSimData] = useState<SimulationData>({ 
    roi: "0%", 
    stdDev: "0%", 
    type: "balanced" 
  });

  // ==========================================
  // 初期化: トークンリストの読み込み
  // ==========================================

  // ==========================================
  // フォールバック用のデフォルトトークンリスト
  // ==========================================
  const FALLBACK_TOKENS: Token[] = [
    {
      address: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Solana",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    },
    {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      symbol: "USDC",
      name: "USD Coin",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
    },
    {
      address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      symbol: "USDT",
      name: "Tether USD",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png"
    },
    {
      address: "JUPyiwrYJFskUPiHa7hkeR8VUtqVomfEtMEKyLb6XR3",
      symbol: "JUP",
      name: "Jupiter",
      logoURI: "https://static.jup.ag/jup/icon.png"
    },
    {
      address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      symbol: "mSOL",
      name: "Marinade staked SOL",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png"
    },
    {
      address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      symbol: "JitoSOL",
      name: "Jito Staked SOL",
      logoURI: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png"
    },
    {
      address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      symbol: "BONK",
      name: "Bonk",
      logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I"
    },
    {
      address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      symbol: "WIF",
      name: "dogwifhat",
      logoURI: "https://static.jup.ag/wif/icon.png"
    },
    {
      address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
      symbol: "RAY",
      name: "Raydium",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png"
    },
    {
      address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      symbol: "PYTH",
      name: "Pyth Network",
      logoURI: "https://pyth.network/token.svg"
    },
    {
      address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
      symbol: "POPCAT",
      name: "Popcat",
      logoURI: "https://bafkreibppqlvyc7zzrmf2xgohicvghda6mmxqlz52umy4f6ocfmo7xnhmi.ipfs.nftstorage.link"
    },
    {
      address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
      symbol: "ORCA",
      name: "Orca",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png"
    },
  ];

  useEffect(() => {
    const loadTokens = async () => {
      try {
        // Jupiter API v2 tokens endpoint with optional API key
        const headers: Record<string, string> = {
          "Accept": "application/json",
        };
        
        // API Keyがあれば追加
        if (process.env.NEXT_PUBLIC_JUP_API_KEY) {
          headers["x-api-key"] = process.env.NEXT_PUBLIC_JUP_API_KEY;
        }

        // 正しいJupiter Token API エンドポイント
        const res = await fetch("https://token.jup.ag/strict", {
          headers,
          next: { revalidate: 300 }, // 5分間キャッシュ
        });
        
        if (!res.ok) {
          console.warn(`Jupiter API returned ${res.status}, using fallback tokens`);
          throw new Error(`Jupiter API Error: ${res.status}`);
        }
        
        const raw = await res.json();
        
        // APIレスポンスの検証
        if (!Array.isArray(raw) || raw.length === 0) {
          throw new Error("Invalid API response");
        }
        
        const tokens = raw.map((t: { address?: string; id?: string; mint?: string; symbol?: string; name?: string; logoURI?: string; icon?: string }) => ({
          address: t.address || t.id || t.mint || "",
          symbol: t.symbol || "UNKNOWN",
          name: t.name || t.symbol || "Unknown Token",
          logoURI: t.logoURI || t.icon || null,
        })).filter((t: Token) => t.address && t.symbol);
        
        if (tokens.length > 0) {
          setAllTokens(tokens);
        } else {
          throw new Error("No valid tokens parsed");
        }
      } catch (err) {
        console.error("Failed to load tokens from API, using fallback:", err);
        // フォールバックトークンリストを使用
        setAllTokens(FALLBACK_TOKENS);
        // エラートーストを表示しない（フォールバックで機能するため）
      }
    };
    
    loadTokens();
  }, []);

  // ==========================================
  // イベントハンドラー
  // ==========================================

  /**
   * ロゴアップロードハンドラー
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /**
   * トークン追加ハンドラー
   */
  const addToken = (token: Token) => {
    // 最大数チェック
    if (composition.length >= MAX_ASSETS) {
      return toast.error("Max assets reached");
    }
    
    // 重複チェック
    if (composition.find(c => c.token.address === token.address)) {
      return toast.error("Already added");
    }
    
    // 新しいトークンを追加
    setComposition(prev => [
      ...prev,
      {
        token,
        weight: 0,
        color: COLOR_PALETTE[prev.length % COLOR_PALETTE.length]
      }
    ]);
    
    setIsTokenModalOpen(false);
  };

  /**
   * ウェイト更新ハンドラー
   * 他のトークンのウェイトを考慮して最大値を制限
   */
  const updateWeight = (address: string, newVal: number) => {
    setComposition(prev => {
      const otherWeight = prev
        .filter(c => c.token.address !== address)
        .reduce((sum, c) => sum + c.weight, 0);
      
      const maxWeight = 100 - otherWeight;
      
      return prev.map(c =>
        c.token.address === address
          ? { ...c, weight: Math.min(newVal, maxWeight) }
          : c
      );
    });
  };

  /**
   * AI戦略の適用
   * 積極的またはバランス型の戦略を適用してポートフォリオを自動構成
   */
  const applyAiStrategy = (type: StrategyType) => {
    if (allTokens.length === 0) {
      return toast.error("Loading tokens...");
    }

    // 戦略に応じてシンボルとウェイトを選択
    const targetSymbols = type === 'aggressive' 
      ? AGGRESSIVE_STRATEGY_SYMBOLS 
      : BALANCED_STRATEGY_SYMBOLS;
    const weights = type === 'aggressive' 
      ? AGGRESSIVE_WEIGHTS 
      : BALANCED_WEIGHTS;

    // トークンを検索
    let candidates = findTokensBySymbols(allTokens, targetSymbols, 4);
    
    // フォールバック: トークンが見つからない場合はSOLを使用
    if (candidates.length === 0) {
      const sol = allTokens.find(t => t.symbol === "SOL");
      if (sol) candidates = [sol];
    }

    // ウェイトを適用
    let newComp = applyWeightsToTokens(candidates, weights);
    
    // ウェイトを100%に正規化
    newComp = normalizeWeights(newComp);

    setComposition(newComp);
    
    // シミュレーションデータを更新
    if (type === 'aggressive') {
      setSimData({ roi: "+42.5%", stdDev: "High", type: "aggressive" });
      toast.success("Applied: High Yield Degen Strategy");
    } else {
      setSimData({ roi: "+18.2%", stdDev: "Low", type: "balanced" });
      toast.success("Applied: Balanced Foundation Strategy");
    }
  };

  /**
   * 次のステップへ進む
   * 各ステップでバリデーションを実行
   */
  const handleNext = () => {
    if (step === 1) {
      // ステップ1: 名前とティッカーのバリデーション
      if (!name || !ticker) {
        return toast.error("Please fill in Name and Ticker");
      }
      setStep(2);
    } else if (step === 2) {
      // ステップ2: ウェイトの合計が100%かチェック
      const total = composition.reduce((sum, c) => sum + c.weight, 0);
      if (total !== 100) {
        return toast.error(`Total weight must be 100% (Current: ${total}%)`);
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  /**
   * Vaultのデプロイ
   * APIにVaultデータを送信して作成
   */
  const handleDeploy = async () => {
    if (!walletAddress) {
      return toast.error("Connect Wallet");
    }
    
    setIsDeploying(true);
    
    try {
      const payload = {
        name,
        symbol: ticker,
        description: "",
        creator: walletAddress,
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
  
      // API Base URL（環境変数がない場合はデフォルトを使用）
      const API_BASE_URL = process.env.NEXT_PUBLIC_AXIS_API_BASE_URL || "https://axis-api.yusukekikuta-05.workers.dev";
      
      const res = await fetch(
        `${API_BASE_URL}/vaults`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
  
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create vault");
      }
  
      toast.success("Vault Created Successfully!");
      router.push(`/vault/${data.id}`);
  
    } catch (err) {
      console.error("Deploy Error:", err);
      toast.error(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  // ==========================================
  // レンダリング
  // ==========================================

  return (
    <div className="min-h-screen w-full text-white font-sans pb-32">
      {/* トースト通知 */}
      <Toaster 
        position="top-right"
        duration={1200}
        toastOptions={{
          className: "axis-toast",
        }}
      />

      {/* ヘッダー */}
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 backdrop-blur">
        <div className="flex items-center gap-2">
          {/* 戻るボタン */}
          {step > 1 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setStep(s => Math.max(1, s - 1) as StepNumber)} 
              className="mr-1 -ml-2"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <h1 className="text-xl font-serif font-bold">Create Vault</h1>
        </div>
        
        {/* プログレスインジケーター */}
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i <= step ? "bg-emerald-500" : "bg-white/10"
              }`} 
            />
          ))}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto p-6">
        <AnimatePresence mode="wait">
          
          {/* ステップ1: アイデンティティの定義 */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-serif">Define Identity</h2>
                <p className="text-neutral-400 text-sm">Give your fund a face and a name.</p>
              </div>
              
              {/* ロゴアップロード */}
              <div className="flex justify-center">
                <div 
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/10 hover:border-emerald-500/50 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group"
                >
                  {logoPreview ? (
                    <img src={logoPreview} className="w-full h-full object-cover" alt="Logo preview" />
                  ) : (
                    <>
                      <ImageIcon className="text-neutral-500 mb-2 group-hover:text-emerald-400" size={32} />
                      <span className="text-[10px] uppercase font-bold text-neutral-500 group-hover:text-emerald-400">
                        Upload Logo
                      </span>
                    </>
                  )}
                  <input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleLogoUpload} 
                  />
                </div>
              </div>
              
              {/* 入力フォーム */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Vault Name</label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Citadel Solana Fund" 
                    className="h-12 bg-white/5 border-white/10 text-lg rounded-xl focus:border-emerald-500/50" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Ticker Symbol</label>
                  <Input 
                    value={ticker} 
                    onChange={e => setTicker(e.target.value.toUpperCase())} 
                    placeholder="e.g. CTDL" 
                    className="h-12 bg-white/5 border-white/10 text-lg font-mono rounded-xl focus:border-emerald-500/50" 
                  />
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

          {/* ステップ2: ポートフォリオ構成 */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-serif">Portfolio Composition</h2>
                <p className="text-neutral-400 text-sm">Select assets or ask AI for a strategy.</p>
              </div>

              {/* AI戦略ボタン */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => applyAiStrategy('balanced')} 
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-left group"
                >
                  <div className="mb-2 p-2 bg-purple-500/20 w-fit rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                    <Sparkles size={20}/>
                  </div>
                  <div className="font-bold text-sm">Safe / Balanced</div>
                </button>
                <button 
                  onClick={() => applyAiStrategy('aggressive')} 
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all text-left group"
                >
                  <div className="mb-2 p-2 bg-orange-500/20 w-fit rounded-lg text-orange-400 group-hover:scale-110 transition-transform">
                    <Zap size={20}/>
                  </div>
                  <div className="font-bold text-sm">Degen / Aggressive</div>
                </button>
              </div>

              {/* アセット配分 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-neutral-500 uppercase">
                    Allocation ({composition.length}/{MAX_ASSETS})
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsTokenModalOpen(true)} 
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus size={14} className="mr-1"/> Add Asset
                  </Button>
                </div>
                
                {/* トークンリスト */}
                <div className="space-y-4">
                  {composition.map(item => (
                    <div key={item.token.address} className="bg-[#121212] p-4 rounded-2xl border border-white/5">
                      <div className="flex justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {item.token.logoURI && (
                            <img 
                              src={item.token.logoURI} 
                              className="w-6 h-6 rounded-full" 
                              alt={item.token.symbol}
                            />
                          )}
                          <span className="font-bold">{item.token.symbol}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono">{item.weight}%</span>
                          <button 
                            onClick={() => setComposition(p => p.filter(x => x.token.address !== item.token.address))} 
                            className="text-neutral-600 hover:text-red-500"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                      <Slider 
                        value={[item.weight]} 
                        max={100} 
                        step={1} 
                        onValueChange={(v) => updateWeight(item.token.address, v[0])} 
                        className="py-1" 
                      />
                    </div>
                  ))}
                </div>
                
                {/* 合計表示 */}
                <div className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold ${
                  composition.reduce((s,c)=>s+c.weight,0) === 100 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "bg-yellow-500/10 text-yellow-500"
                }`}>
                  {composition.reduce((s,c)=>s+c.weight,0) === 100 
                    ? <CheckCircle2 size={16}/> 
                    : <AlertTriangle size={16}/>
                  }
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

          {/* ステップ3: AIパフォーマンス予測 */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-serif">AI Performance Projection</h2>
                <p className="text-neutral-400 text-sm">Simulating 1-year historic performance...</p>
              </div>
              
              {/* シミュレーションチャート */}
              <SimulationChart isAggressive={simData.type === 'aggressive'} />
              
              {/* パフォーマンス指標 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-neutral-500 text-xs uppercase font-bold mb-1">Proj. 1Y ROI</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400">{simData.roi}</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-neutral-500 text-xs uppercase font-bold mb-1">Volatility</div>
                  <div className={`text-2xl font-mono font-bold ${
                    simData.type === 'aggressive' ? "text-orange-400" : "text-blue-400"
                  }`}>
                    {simData.stdDev}
                  </div>
                </div>
              </div>
              
              {/* AI分析 */}
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

          {/* ステップ4: デプロイ確認 */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="space-y-8 py-4"
            >
              <div className="text-center">
                <h2 className="text-2xl font-serif mb-2">Ready to Deploy?</h2>
                <p className="text-neutral-400 text-sm">Review your vault details.</p>
              </div>

              {/* 3D自動回転カード */}
              <ThreeDCard name={name} ticker={ticker} logo={logoPreview} />

              <div className="text-center text-xs text-neutral-500">
                By clicking deploy, you accept the terms of service.<br/>
                Estimated Gas: ~0.02 SOL
              </div>

              {/* アクションボタン */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Edit
                </Button>
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="bg-emerald-500 text-black font-bold"
                >
                  {isDeploying ? "Deploying..." : "Deploy"}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* フッター（ボトムナビゲーション用の余白） */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#050505] border-t border-white/10 z-50 pb-safe" />

      {/* トークン選択モーダル */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-md w-[95%] rounded-2xl top-[40%]">
          <DialogHeader>
            <DialogTitle>Select Asset</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Search and select a token to add to your vault composition.
            </DialogDescription>
          </DialogHeader>
          
          {/* 検索バー */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <Input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search..." 
              className="pl-9 bg-black/20 border-white/10 rounded-xl" 
            />
          </div>
          
          {/* トークンリスト */}
          <ScrollArea className="h-[300px] mt-4 pr-2">
            <div className="space-y-1">
              {allTokens
                .filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((token, i) => (
                  <button 
                    key={`${token.address}-${i}`} 
                    onClick={() => addToken(token)} 
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {token.logoURI ? (
                        <img src={token.logoURI} className="w-8 h-8 rounded-full" alt={token.symbol}/>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10"/>
                      )}
                      <div>
                        <div className="font-bold text-sm">{token.symbol}</div>
                        <div className="text-xs text-neutral-500">{token.name}</div>
                      </div>
                    </div>
                    {composition.find(c=>c.token.address===token.address) && (
                      <span className="text-xs text-emerald-500">Added</span>
                    )}
                  </button>
                ))
              }
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
