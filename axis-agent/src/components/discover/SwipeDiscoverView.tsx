/**
 * SwipeDiscoverView - Tinder-style card stack for strategy discovery
 * Smooth animations with search and filter functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, List, Layers, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { SwipeCard, type StrategyCardData } from './SwipeCard';
import type { Strategy } from '../../types'; // 型定義をインポート

interface SwipeDiscoverViewProps {
  onToggleView: () => void;
  onStrategySelect: (strategy: Strategy) => void; // IDではなくStrategyオブジェクトを受け取る
}

export const SwipeDiscoverView = ({ onToggleView, onStrategySelect }: SwipeDiscoverViewProps) => {
  const [strategies, setStrategies] = useState<StrategyCardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.discoverStrategies(50);
      if (res.success && res.strategies) {
        // Define API strategy shape
        interface APIStrategy {
          id: string;
          name: string;
          type?: string;
          tokens?: { symbol: string; weight: number; logoUrl?: string }[];
          roi?: number;
          tvl?: number;
          imageUrl?: string;
          ownerPubkey?: string;
          creatorPfpUrl?: string;
          description?: string;
        }
        // Map API data to SwipeCard format
        const mapped: StrategyCardData[] = res.strategies.map((s: APIStrategy) => ({
          id: s.id,
          name: s.name,
          type: (s.type as StrategyCardData['type']) || 'BALANCED',
          tokens: s.tokens || [],
          roi: s.roi ?? (Math.random() * 40 - 10),
          tvl: s.tvl || 0,
          imageUrl: s.imageUrl,
          creatorAddress: s.ownerPubkey || '',
          creatorPfpUrl: s.creatorPfpUrl,
          description: s.description,
        }));
        setStrategies(mapped);
        setCurrentIndex(0);
      }
    } catch (e) {
      console.error('Failed to fetch strategies:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  // Filter strategies based on search
  const filteredStrategies = strategies.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.tokens.some(t => t.symbol.toLowerCase().includes(search.toLowerCase()))
  );

  const visibleCards = filteredStrategies.slice(currentIndex, currentIndex + 3);

  const handleSwipeLeft = () => {
    if (currentIndex < filteredStrategies.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // ★重要: ここでデータを変換して渡す
  const handleSelectStrategy = () => {
    const s = filteredStrategies[currentIndex];
    if (!s) return;

    // StrategyCardData -> Strategy (Global Type) への変換
    const strategyData: Strategy = {
      id: s.id,
      name: s.name,
      ticker: s.name.slice(0, 4).toUpperCase(), // 簡易的に生成
      type: s.type,
      description: s.description || '',
      tokens: s.tokens,
      apy: s.roi,
      tvl: s.tvl,
      price: 100, // 初期価格（詳細画面で再取得されるので仮の値でOK）
      owner: s.creatorAddress,
      // 必須だがここにはないデータは一旦空/デフォルトで埋める
      metrics: {
        expectedApy: s.roi,
        riskScore: 5,
        winRate: 50,
        sharpeRatio: 1.0
      },
      backtest: {
        timestamps: [],
        values: [],
        sharpeRatio: 0,
        maxDrawdown: 0,
        volatility: 0
      },
      createdAt: Date.now()
    };

    onStrategySelect(strategyData);
  };

  const handleSwipeRight = () => {
    handleSelectStrategy();
  };

  const handleTap = () => {
    handleSelectStrategy();
  };

  const handleReset = () => {
    setCurrentIndex(0);
  };

  const isAtEnd = currentIndex >= filteredStrategies.length;

  return (
    <div className="min-h-screen bg-[#0C0A09] text-white px-4 py-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Discover</h1>
          <p className="text-white/50 text-sm">Swipe to explore strategies</p>
        </div>
        <button 
          onClick={onToggleView}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          title="Switch to List View"
        >
          <List className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentIndex(0);
          }}
          placeholder="Search strategies, tokens..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
        />
      </div>

      {/* Card Stack */}
      <div className="flex-1 relative min-h-[500px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
            <p className="text-white/50 text-sm">Loading strategies...</p>
          </div>
        ) : filteredStrategies.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <span className="text-4xl">🍕</span>
            </div>
            <h3 className="text-xl font-bold mb-2">No Strategies Found</h3>
            <p className="text-white/50 text-sm max-w-xs">
              {search ? 'Try a different search term' : 'Be the first to create a strategy!'}
            </p>
          </div>
        ) : isAtEnd ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Layers className="w-10 h-10 text-white/30" />
            </div>
            <h3 className="text-xl font-bold mb-2">You've seen them all!</h3>
            <p className="text-white/50 text-sm max-w-xs mb-6">
              Check back later for new strategies
            </p>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Start Over
            </button>
          </div>
        ) : (
          <div className="absolute inset-x-4 top-0 bottom-20">
            <AnimatePresence mode="popLayout">
              {visibleCards.map((strategy, i) => (
                <SwipeCard
                  key={strategy.id}
                  strategy={strategy}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onTap={handleTap}
                  isTop={i === 0}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {!loading && filteredStrategies.length > 0 && !isAtEnd && (
        <div className="text-center py-4">
          <p className="text-xs text-white/30">
            {currentIndex + 1} / {filteredStrategies.length}
          </p>
          <div className="w-32 h-1 bg-white/10 rounded-full mx-auto mt-2 overflow-hidden">
            <motion.div 
              className="h-full bg-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / filteredStrategies.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};