/**
 * StrategyDashboard - View and manage deployed strategies
 * Shows TVL, positions, and allows rebalancing
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Settings, RefreshCw, 
  Wallet, Clock, Shield, Zap, Target, Activity,
  Plus, Loader2
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PizzaChart } from '../common/PizzaChart';

interface TokenAllocation {
  symbol: string;
  weight: number;
}

interface Strategy {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: TokenAllocation[];
  tvl: number;
  pnl: number;
  pnlPercent: number;
  isActive: boolean;
  lastRebalance: Date | null;
}

interface StrategyDashboardProps {
  strategies: Strategy[];
  onSelectStrategy: (strategy: Strategy) => void;
  onDeposit: (strategy: Strategy) => void;
  onRebalance: (strategy: Strategy) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export const StrategyDashboard = ({
  strategies,
  onSelectStrategy,
  onDeposit,
  onRebalance,
  onCreateNew,
  isLoading = false,
}: StrategyDashboardProps) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number>(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return;
      try {
        const bal = await connection.getBalance(publicKey);
        setSolBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error('Failed to fetch balance:', e);
      }
    };
    fetchBalance();
  }, [publicKey, connection]);

  const totalTvl = strategies.reduce((sum, s) => sum + s.tvl, 0);
  const totalPnl = strategies.reduce((sum, s) => sum + s.pnl, 0);

  const typeColors = {
    AGGRESSIVE: 'from-orange-500 to-red-500',
    BALANCED: 'from-blue-500 to-purple-500',
    CONSERVATIVE: 'from-emerald-500 to-teal-500',
  };

  const typeIcons = {
    AGGRESSIVE: <Zap className="w-4 h-4" />,
    BALANCED: <Target className="w-4 h-4" />,
    CONSERVATIVE: <Shield className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Strategy Dashboard</h2>
          <p className="text-xs text-white/50">Manage your deployed vaults</p>
        </div>
        <button
          onClick={onCreateNew}
          className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-xs text-white/50 mb-1">Total Value Locked</p>
          <p className="text-2xl font-bold">{totalTvl.toFixed(2)} SOL</p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-xs text-white/50 mb-1">Total P&L</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </p>
            {totalPnl >= 0 ? 
              <TrendingUp className="w-4 h-4 text-emerald-400" /> : 
              <TrendingDown className="w-4 h-4 text-red-400" />
            }
          </div>
        </div>
      </div>

      {/* Wallet Balance */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-white/50" />
          <span className="text-sm text-white/50">Available</span>
        </div>
        <span className="font-mono font-bold">{solBalance.toFixed(4)} SOL</span>
      </div>

      {/* Strategy List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70 mb-2">Your Strategies</h3>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/30" />
          </div>
        ) : strategies.length === 0 ? (
          <EmptyState onCreateNew={onCreateNew} />
        ) : (
          <AnimatePresence>
            {strategies.map((strategy, index) => (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <StrategyCard
                  strategy={strategy}
                  typeColors={typeColors}
                  typeIcons={typeIcons}
                  onSelect={() => onSelectStrategy(strategy)}
                  onDeposit={() => onDeposit(strategy)}
                  onRebalance={() => onRebalance(strategy)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// Strategy Card Component
const StrategyCard = ({
  strategy,
  typeColors,
  typeIcons,
  onSelect,
  onDeposit,
  onRebalance,
}: {
  strategy: Strategy;
  typeColors: Record<string, string>;
  typeIcons: Record<string, React.ReactNode>;
  onSelect: () => void;
  onDeposit: () => void;
  onRebalance: () => void;
}) => {

  return (
    <div 
      className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/[0.07] transition-colors"
    >
      {/* Main Content */}
      <div className="flex items-center gap-4" onClick={onSelect}>
        {/* Pizza Chart */}
        <div className="shrink-0">
          <PizzaChart slices={strategy.tokens} size={60} showLabels={false} animated={false} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold truncate">{strategy.name}</h4>
            <span className={`px-2 py-0.5 rounded text-xs bg-gradient-to-r ${typeColors[strategy.type]} text-white`}>
              {typeIcons[strategy.type]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/50">TVL: <span className="text-white">{strategy.tvl.toFixed(2)} SOL</span></span>
            <span className={strategy.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {strategy.pnlPercent >= 0 ? '+' : ''}{strategy.pnlPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="shrink-0 text-right">
          {strategy.isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
              <Activity className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 text-white/50 rounded text-xs">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
        <button
          onClick={onDeposit}
          className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Deposit
        </button>
        <button
          onClick={onRebalance}
          className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Rebalance
        </button>
        <button
          onClick={onSelect}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Last Rebalance */}
      {strategy.lastRebalance && (
        <div className="mt-2 flex items-center gap-1 text-xs text-white/40">
          <Clock className="w-3 h-3" />
          Last rebalance: {strategy.lastRebalance.toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ onCreateNew }: { onCreateNew: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Target className="w-10 h-10 text-white/30" />
      </div>
      <h3 className="text-lg font-bold mb-2">No Strategies Yet</h3>
      <p className="text-sm text-white/50 mb-6 max-w-xs">
        Create your first AI-powered investment strategy and start building your portfolio.
      </p>
      <button
        onClick={onCreateNew}
        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-black flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create Strategy
      </button>
    </motion.div>
  );
};

export default StrategyDashboard;
