import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../hooks/useWallet';
import { Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { JupiterService } from '../../services/jupiter';
import { DexScreenerService } from '../../services/dexscreener';
import { SwipeCardBody, type StrategyCardData } from './SwipeCard';

export interface Strategy {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: { symbol: string; weight: number }[];
  description?: string;
}

interface DiscoveredToken {
  symbol: string;
  weight: number;
  address?: string;
  logoURI?: string | null;
  currentPrice?: number;
  change24h?: number;
}

interface DiscoveredStrategy {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: DiscoveredToken[];
  description?: string;
  ownerPubkey: string;
  tvl: number;
  createdAt: number;
  roi: number;
  creatorPfpUrl?: string | null;
  mintAddress?: string;
  vaultAddress?: string;
}

interface ListDiscoverViewProps {
  onToggleView?: () => void;
  onStrategySelect: (strategy: Strategy) => void;
}

const toCardData = (s: DiscoveredStrategy): StrategyCardData => ({
  id: s.id,
  name: s.name,
  ticker: undefined,
  type: s.type,
  tokens: s.tokens.map((t) => ({
    symbol: t.symbol,
    weight: t.weight,
    address: t.address,
    logoURI: t.logoURI ?? null,
    currentPrice: t.currentPrice ?? 0,
    change24h: t.change24h ?? 0,
  })),
  roi: s.roi,
  tvl: s.tvl,
  creatorAddress: s.ownerPubkey,
  creatorPfpUrl: s.creatorPfpUrl ?? null,
  description: s.description,
  createdAt: s.createdAt,
  mintAddress: s.mintAddress,
  vaultAddress: s.vaultAddress,
});

export const ListDiscoverView = ({ onStrategySelect }: ListDiscoverViewProps) => {
  const { publicKey } = useWallet();

  const [rawStrategies, setRawStrategies] = useState<any[]>([]);
  const [tokenDataMap, setTokenDataMap] = useState<
    Record<string, { price: number; change24h: number; logoURI?: string }>
  >({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter] = useState<'all' | 'trending' | 'new' | 'top'>('top');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [publicRes, myRes, tokensRes] = await Promise.all([
          api.discoverStrategies(50).catch(() => ({ strategies: [] })),
          publicKey
            ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] }))
            : Promise.resolve({ strategies: [] }),
          api.getTokens().catch(() => ({ tokens: [] })),
        ]);

        // バックエンドトークン情報を初期マップに
        const initialMap: Record<
          string,
          { price: number; change24h: number; logoURI?: string; symbol: string }
        > = {};
        (tokensRes.tokens || []).forEach((t: any) => {
          if (t.mint) {
            initialMap[t.mint] = {
              symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
              price: t.price || 0,
              change24h: t.change24h || 0,
              logoURI: t.logoURI,
            };
          }
        });

        // ストラテジーをマージ・重複除去
        const myStrats = myRes.strategies || myRes || [];
        const combined = [...(Array.isArray(myStrats) ? myStrats : []), ...(publicRes.strategies || [])];
        const uniqueMap = new Map<string, any>();
        combined.forEach((item: any) => {
          const key = item.id || item.address;
          if (key && !uniqueMap.has(key)) uniqueMap.set(key, item);
        });
        const uniqueStrategies = Array.from(uniqueMap.values());
        setRawStrategies(uniqueStrategies);

        // 全 mint を収集
        const allMints = new Set<string>(Object.keys(initialMap));
        uniqueStrategies.forEach((s: any) => {
          let tokens = s.tokens || s.composition || [];
          if (typeof tokens === 'string') {
            try { tokens = JSON.parse(tokens); } catch { tokens = []; }
          }
          tokens.forEach((t: any) => {
            if (t.mint) {
              allMints.add(t.mint);
              if (!initialMap[t.mint]) {
                initialMap[t.mint] = {
                  symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
                  price: 0,
                  change24h: 0,
                  logoURI: t.logoURI,
                };
              }
            }
          });
        });

        // Jupiter + DexScreener で価格を補完
        const mintArray = Array.from(allMints);
        if (mintArray.length > 0) {
          const [jupPrices, dexData] = await Promise.all([
            JupiterService.getPrices(mintArray).catch(() => ({})) as Promise<Record<string, number>>,
            DexScreenerService.getMarketData(mintArray).catch(() => ({})) as Promise<
              Record<string, { price: number; change24h: number }>
            >,
          ]);
          mintArray.forEach((mint) => {
            const cur = initialMap[mint];
            if (!cur) return;
            initialMap[mint] = {
              ...cur,
              price: jupPrices[mint] || dexData[mint]?.price || cur.price,
              change24h: dexData[mint]?.change24h || cur.change24h,
            };
          });
        }
        setTokenDataMap(initialMap);

        // クリエイタープロフィールを取得
        const creators = new Set<string>();
        uniqueStrategies.forEach((s: any) => {
          if (s.ownerPubkey) creators.add(s.ownerPubkey);
          if (s.creator) creators.add(s.creator);
        });
        if (creators.size > 0) {
          const userResults = await Promise.all(
            Array.from(creators).map((pubkey) =>
              api
                .getUser(pubkey)
                .then((res) => (res.success ? res.user : null))
                .catch(() => null)
            )
          );
          const newUserMap: Record<string, any> = {};
          userResults.forEach((user) => {
            if (user?.pubkey) newUserMap[user.pubkey] = user;
          });
          setUserMap(newUserMap);
        }
      } catch {
        setRawStrategies([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [publicKey]);

  // rawStrategies + tokenDataMap + userMap からエンリッチされたストラテジーを生成
  const strategies = useMemo<DiscoveredStrategy[]>(() => {
    return rawStrategies.map((s: any) => {
      let tokens = s.tokens || s.composition || [];
      if (typeof tokens === 'string') {
        try { tokens = JSON.parse(tokens); } catch { tokens = []; }
      }

      const enrichedTokens: DiscoveredToken[] = tokens.map((t: any) => {
        const td = t.mint ? tokenDataMap[t.mint] : null;
        return {
          symbol: t.symbol?.toUpperCase() || 'UNKNOWN',
          weight: Number(t.weight) || 0,
          address: t.mint || undefined,
          logoURI: t.logoURI || td?.logoURI || null,
          currentPrice: td?.price ?? 0,
          change24h: td?.change24h ?? 0,
        };
      });

      let weightedSum = 0;
      let totalWeight = 0;
      enrichedTokens.forEach((t) => {
        const w = t.weight || 0;
        weightedSum += (t.change24h || 0) * w;
        totalWeight += w;
      });

      const ownerPubkey = s.ownerPubkey || s.creator || 'Unknown';
      const userProfile = userMap[ownerPubkey];

      return {
        id: s.id || s.address || `temp-${Math.random()}`,
        name: s.name || 'Untitled Strategy',
        description: s.description || userProfile?.bio || '',
        type: (s.type || 'BALANCED') as DiscoveredStrategy['type'],
        tokens: enrichedTokens,
        ownerPubkey,
        tvl: Number(s.tvl || 0),
        createdAt: s.createdAt ? Number(s.createdAt) : Date.now() / 1000,
        roi: totalWeight > 0 ? weightedSum / totalWeight : 0,
        creatorPfpUrl: userProfile?.avatar_url ? api.getProxyUrl(userProfile.avatar_url) : null,
        mintAddress: s.mintAddress || undefined,
        vaultAddress: s.vaultAddress || undefined,
      };
    });
  }, [rawStrategies, tokenDataMap, userMap]);

  const filteredStrategies = strategies
    .slice()
    .sort((a, b) => {
      if (publicKey) {
        const isMineA = a.ownerPubkey === publicKey.toBase58();
        const isMineB = b.ownerPubkey === publicKey.toBase58();
        if (isMineA && !isMineB) return -1;
        if (!isMineA && isMineB) return 1;
      }
      if (filter === 'new') return b.createdAt - a.createdAt;
      if (filter === 'top') return (b.tvl || 0) - (a.tvl || 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#030303] text-white px-4 py-6 pb-24">
      <div className="mb-6 pt-12">
        <h1 className="text-2xl font-bold mb-1">Discover</h1>
        <p className="text-white/50 text-sm">Explore community-created strategy pizzas</p>
      </div>


      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
          <p className="text-white/50 text-sm">Loading strategies...</p>
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredStrategies.map((strategy, i) => (
                <motion.div
                  key={strategy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="h-[380px] cursor-pointer"
                  onClick={() => onStrategySelect(strategy)}
                >
                  <SwipeCardBody strategy={toCardData(strategy)} compact />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredStrategies.length === 0 && (
            <div className="text-center py-12 text-white/40">No strategies found.</div>
          )}
        </>
      )}
    </div>
  );
};

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
      <span className="text-4xl">🍕</span>
    </div>
    <h3 className="text-xl font-bold mb-2">No Strategies Yet</h3>
    <p className="text-white/50 text-sm max-w-xs mb-8 leading-relaxed">
      Be the first to create a strategy pizza! Your creation will appear here for the community to
      discover.
    </p>
    <div className="text-xs text-white/30 px-3 py-1 rounded-full border border-white/10">
      Create → Discover → Grow 🚀
    </div>
  </motion.div>
);
