import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ★追加: useWalletをインポート
import { useWallet } from '../../hooks/useWallet';
import { 
  Search, TrendingUp, Users, Crown, ChevronRight, Flame, Loader2, Plus, 
  Target, Shield, Zap, GitFork, Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { PizzaChart } from '../common/PizzaChart';
import { StrategyDetailModal } from '../common/StrategyDetailModal';

export interface Strategy {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: { symbol: string; weight: number }[];
  description?: string;
}

interface DiscoveredStrategy extends Strategy {
  ownerPubkey: string;
  tvl: number;
  createdAt: number;
}

interface ListDiscoverViewProps {
  onToggleView: () => void;
  onStrategySelect: (strategy: Strategy) => void;
}

export const ListDiscoverView = ({ onToggleView, onStrategySelect }: ListDiscoverViewProps) => {
  const { publicKey } = useWallet();
  const [strategies, setStrategies] = useState<DiscoveredStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<DiscoveredStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'trending' | 'new' | 'top'>('all');

  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      try {
        const [publicRes, myRes] = await Promise.all([
          api.discoverStrategies(50).catch(() => ({ strategies: [] })),
          publicKey ? api.getUserStrategies(publicKey.toBase58()).catch(() => ({ strategies: [] })) : Promise.resolve({ strategies: [] })
        ]);

        let rawList: any[] = [];
        if (publicRes && Array.isArray(publicRes.strategies)) {
          rawList = [...rawList, ...publicRes.strategies];
        }

        const myRawStrategies = (myRes.strategies || myRes || []);
        if (Array.isArray(myRawStrategies)) {
          rawList = [...rawList, ...myRawStrategies];
        }

        const normalizedList: DiscoveredStrategy[] = rawList.map((item: any) => {
          const rawTokens = item.tokens || item.composition || [];
          const normalizedTokens = Array.isArray(rawTokens) 
            ? rawTokens.map((t: any) => ({ symbol: t.symbol, weight: Number(t.weight) }))
            : [];

          const ownerAddr = item.ownerPubkey || item.owner_pubkey || item.creator || 'Unknown';
          return {
            id: item.id || item.signature || `temp-${Math.random()}`,
            name: item.name || 'Untitled Strategy',
            description: item.description || '',
            type: item.type || 'BALANCED',
            tokens: normalizedTokens,
            ownerPubkey: ownerAddr,
            address: item.address || ownerAddr,
            owner: ownerAddr,
            tvl: Number(item.tvl || item.initialInvestment || 0),
            createdAt: item.createdAt ? Number(item.createdAt) : Date.now() / 1000
          };
        });

        const uniqueMap = new Map();
        normalizedList.forEach(item => {
          uniqueMap.set(item.id, item);
        });
        const finalStrategies = Array.from(uniqueMap.values()) as DiscoveredStrategy[];

        setStrategies(finalStrategies);

      } catch {
        setStrategies([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStrategies();
  }, [publicKey]);

  // ... (以下、元のコードと同じ)
  
  const filteredStrategies = strategies
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
    )
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

  const formatTVL = (tvl: number) => {
    if (!tvl) return '0 USDC';
    if (tvl >= 1000) return `${(tvl / 1000).toFixed(1)}K USDC`;
    return `${tvl.toFixed(2)} USDC`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const typeIcons = {
    AGGRESSIVE: Zap,
    BALANCED: Target,
    CONSERVATIVE: Shield,
  };

  const typeColors = {
    AGGRESSIVE: 'from-orange-500 to-red-500',
    BALANCED: 'from-blue-500 to-purple-500',
    CONSERVATIVE: 'from-emerald-500 to-teal-500',
  };

  const handleSelect = (e: React.MouseEvent, strategy: DiscoveredStrategy) => {
    e.stopPropagation(); 
    onStrategySelect(strategy);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Discover</h1>
          <p className="text-white/50 text-sm">Explore community-created strategy pizzas</p>
        </div>
        <button 
          onClick={onToggleView}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white"
          title="Switch to Swipe View"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search strategies..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {[
          { key: 'all', label: 'All', icon: null },
          { key: 'trending', label: 'Hot', icon: Flame },
          { key: 'top', label: 'Top TVL', icon: Crown },
          { key: 'new', label: 'New', icon: Plus },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
          <p className="text-white/50 text-sm">Loading strategies...</p>
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredStrategies.map((strategy, i) => {
              const TypeIcon = typeIcons[strategy.type] || Target;
              const isMine = publicKey && strategy.ownerPubkey === publicKey.toBase58();

              return (
                <motion.div
                  key={strategy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedStrategy(strategy)}
                  className={`relative p-4 bg-white/[0.03] border rounded-2xl cursor-pointer transition-all group overflow-hidden ${
                    isMine ? 'border-orange-500/30 bg-orange-500/[0.05]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="shrink-0">
                      <PizzaChart slices={strategy.tokens} size={56} showLabels={false} animated={false} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold truncate text-white">{strategy.name}</h3>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r ${typeColors[strategy.type]} text-white flex items-center gap-1`}>
                          <TypeIcon className="w-3 h-3" />
                        </span>
                        {isMine && <span className="text-[10px] bg-orange-500 text-white px-1.5 rounded font-bold">YOU</span>}
                      </div>
                      
                      {strategy.description && (
                        <p className="text-xs text-white/50 truncate mb-1.5">{strategy.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {strategy.ownerPubkey ? `${strategy.ownerPubkey.slice(0, 4)}...` : 'Unknown'}
                        </span>
                        <span>{formatDate(strategy.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1 font-bold text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {formatTVL(strategy.tvl)}
                        </div>
                        <p className="text-[10px] text-white/30 mt-0.5">TVL</p>
                      </div>

                      <button
                        onClick={(e) => handleSelect(e, strategy)}
                        className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20 z-10"
                        title="Fork Strategy"
                      >
                        <GitFork className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {strategy.tokens.slice(0, 5).map((token) => (
                      <span 
                        key={token.symbol}
                        className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[10px] text-white/60 font-mono"
                      >
                        {token.symbol} {token.weight}%
                      </span>
                    ))}
                    {strategy.tokens.length > 5 && (
                      <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/40">
                        +{strategy.tokens.length - 5}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {filteredStrategies.length === 0 && !loading && strategies.length > 0 && (
        <div className="text-center py-12 text-white/40">
          No strategies found matching "{search}"
        </div>
      )}

      <StrategyDetailModal
        isOpen={!!selectedStrategy}
        strategy={selectedStrategy ? {
          ...selectedStrategy,
          address: selectedStrategy.id, 
          pnl: 0 
        } : null}
        onClose={() => setSelectedStrategy(null)}
      />
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
      Be the first to create a strategy pizza! Your creation will appear here for the community to discover.
    </p>
    <div className="text-xs text-white/30 px-3 py-1 rounded-full border border-white/10">
      Create → Discover → Grow 🚀
    </div>
  </motion.div>
);