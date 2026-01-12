/**
 * Discover View - ETF Rankings & Exploration
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Users, Crown, ChevronRight, Flame } from 'lucide-react';
import { api } from '../../services/api';
import type { Vault } from '../../types';

interface DiscoverViewProps {
  onSelectVault?: (vault: Vault) => void;
}

export const DiscoverView = ({ onSelectVault }: DiscoverViewProps) => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'trending' | 'new' | 'top'>('all');

  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const res = await api.getVaults();
        if (Array.isArray(res)) {
          // Transform and add mock data for demo
          const enriched: Vault[] = res.map((v: any, i: number) => ({
            id: v.id,
            name: v.name || `Strategy ${i + 1}`,
            symbol: v.symbol || `ETF${i}`,
            creator: v.creator || 'anonymous',
            tvl: v.tvl || Math.random() * 1000000,
            apy: v.management_fee * 10 || Math.random() * 50,
            performance7d: (Math.random() - 0.3) * 20,
            performance30d: (Math.random() - 0.2) * 40,
            composition: v.composition || [],
            holders: Math.floor(Math.random() * 500) + 10,
            rank: i + 1,
          }));
          setVaults(enriched);
        }
      } catch (e) {
        console.error('Failed to fetch vaults:', e);
        // Demo data
        setVaults([
          { id: '1', name: 'DeFi Alpha', symbol: 'DEFI', creator: 'whale.sol', tvl: 850000, apy: 42, performance7d: 12.5, performance30d: 35, composition: [], holders: 234, rank: 1 },
          { id: '2', name: 'Meme Lords', symbol: 'MEME', creator: 'degen.sol', tvl: 520000, apy: 125, performance7d: -8.2, performance30d: 180, composition: [], holders: 567, rank: 2 },
          { id: '3', name: 'Blue Chip SOL', symbol: 'BLUE', creator: 'inst.sol', tvl: 1200000, apy: 18, performance7d: 5.2, performance30d: 15, composition: [], holders: 892, rank: 3 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchVaults();
  }, []);

  const filteredVaults = vaults
    .filter(v => v.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (filter === 'trending') return (b.performance7d || 0) - (a.performance7d || 0);
      if (filter === 'new') return (b.id > a.id ? 1 : -1);
      if (filter === 'top') return (b.tvl || 0) - (a.tvl || 0);
      return 0;
    });

  const formatTVL = (tvl: number) => {
    if (tvl >= 1000000) return `$${(tvl / 1000000).toFixed(1)}M`;
    if (tvl >= 1000) return `$${(tvl / 1000).toFixed(0)}K`;
    return `$${tvl.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Discover</h1>
        <p className="text-white/50 text-sm">Explore top-performing ETFs on Solana</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ETFs..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All', icon: null },
          { key: 'trending', label: 'Trending', icon: Flame },
          { key: 'top', label: 'Top TVL', icon: Crown },
          { key: 'new', label: 'New', icon: null },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
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

      {/* Vault List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredVaults.map((vault, i) => (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectVault?.(vault)}
                className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/[0.05] cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    vault.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    vault.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                    vault.rank === 3 ? 'bg-orange-600/20 text-orange-400' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {vault.rank}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold truncate">{vault.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/50">{vault.symbol}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {vault.holders}
                      </span>
                      <span>TVL {formatTVL(vault.tvl)}</span>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="text-right">
                    <div className={`flex items-center gap-1 font-bold ${
                      vault.performance7d >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {vault.performance7d >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {vault.performance7d >= 0 ? '+' : ''}{vault.performance7d.toFixed(1)}%
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5">7d</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {filteredVaults.length === 0 && !loading && (
        <div className="text-center py-12 text-white/40">
          No ETFs found matching your search
        </div>
      )}
    </div>
  );
};
