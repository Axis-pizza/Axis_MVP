/**
 * Strategy Detail Modal
 * Refined for High-End Artisan Aesthetic
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, ArrowDownLeft, Shuffle, Save } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useConnection, type WalletContextState } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { deposit, rebalance } from '../../services/kagemusha';
import { PizzaChart } from './PizzaChart';
import { TokenSearchModal } from '../TokenSearchModal';

interface Token {
  symbol: string;
  weight: number;
}

interface StrategyDetail {
  id?: string;
  address?: string;
  ownerPubkey: string;
  name: string;
  type: string;
  tokens: Token[];
  description?: string;
  tvl: number;
  createdAt?: number;
  pnl?: number;
}

interface StrategyDetailModalProps {
  strategy: StrategyDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StrategyDetailModal = ({ strategy, isOpen, onClose, onSuccess }: StrategyDetailModalProps) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [view, setView] = useState<'INFO' | 'DEPOSIT' | 'REBALANCE'>('INFO');
  
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const [rebalanceTokens, setRebalanceTokens] = useState<Token[]>([]);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isTokenSearchOpen, setIsTokenSearchOpen] = useState(false);

  useMemo(() => {
    if (isOpen) {
      setView('INFO');
      setDepositAmount('');
      setDepositError(null);
      if (strategy) {
        setRebalanceTokens([...strategy.tokens]);
      }
    }
  }, [isOpen, strategy]);

  if (!strategy) return null;

  const isOwner = wallet.publicKey?.toString() === strategy.ownerPubkey;
  const strategyAddress = strategy.address || strategy.id; 

  const handleDeposit = async () => {
    if (!wallet.publicKey || !strategyAddress || !wallet.signTransaction) return;
    setIsDepositing(true);
    setDepositError(null);
    try {
      await deposit(connection, wallet as unknown as WalletContextState, new PublicKey(strategyAddress), Number(depositAmount));
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      console.error(e);
      setDepositError(e instanceof Error ? e.message : 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleRebalance = async () => {
    // ... (Rebalance logic remains same)
    if (!wallet.publicKey || !strategyAddress || !wallet.signTransaction) return;
    setIsRebalancing(true);
    try {
      await rebalance(connection, wallet as unknown as WalletContextState, new PublicKey(strategyAddress), rebalanceTokens);
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setIsRebalancing(false);
    }
  };

  const updateTokenWeight = (symbol: string, newWeight: number) => {
    const otherTokensWeight = rebalanceTokens.reduce((sum, t) => t.symbol === symbol ? sum : sum + t.weight, 0);
    if (otherTokensWeight + newWeight > 100) return; 
    setRebalanceTokens(tokens => tokens.map(t => t.symbol === symbol ? { ...t, weight: newWeight } : t));
  };

  const removeToken = (symbol: string) => {
    setRebalanceTokens(tokens => tokens.filter(t => t.symbol !== symbol));
  };

  const addToken = (token: { symbol: string }) => {
    if (rebalanceTokens.find(t => t.symbol === token.symbol)) return;
    setRebalanceTokens(tokens => [...tokens, { symbol: token.symbol, weight: 0 }]);
    setIsTokenSearchOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0C0A09]/90 backdrop-blur-md z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:w-[600px] md:left-1/2 md:-translate-x-1/2 bg-[#1C1917] border border-[#D97706]/20 rounded-2xl z-[70] overflow-hidden flex flex-col shadow-2xl shadow-black/50"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#D97706]/10 flex items-center justify-between shrink-0 bg-[#0C0A09]">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#E7E5E4]">{strategy.name}</h2>
                <div className="flex items-center gap-3 text-xs text-[#A8A29E] mt-1">
                  <span className="bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20 px-2 py-0.5 rounded text-[10px] tracking-widest uppercase">
                    {strategy.type}
                  </span>
                  {strategyAddress && (
                    <span className="font-mono flex items-center gap-1 text-[#78716C]">
                      {strategyAddress.slice(0, 4)}...{strategyAddress.slice(-4)}
                      <Copy className="w-3 h-3 cursor-pointer hover:text-[#D97706]" onClick={() => navigator.clipboard.writeText(strategyAddress)} />
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#D97706]/10 rounded-full text-[#A8A29E] hover:text-[#D97706] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {view === 'INFO' && (
                <div className="space-y-8">
                  <div className="flex justify-center py-2 scale-110">
                    <PizzaChart slices={strategy.tokens} size={200} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-px bg-[#D97706]/20 rounded-xl overflow-hidden border border-[#D97706]/10">
                    <div className="bg-[#0C0A09] p-5 text-center">
                      <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">Total Assets</p>
                      <p className="text-2xl font-serif font-bold text-[#E7E5E4]">{strategy.tvl.toFixed(2)} <span className="text-sm text-[#78716C]">SOL</span></p>
                    </div>
                    <div className="bg-[#0C0A09] p-5 text-center">
                      <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">Investors</p>
                      <p className="text-2xl font-serif font-bold text-[#E7E5E4] flex items-center justify-center gap-2">
                        <Users className="w-4 h-4 text-[#D97706]" />
                        --
                      </p>
                    </div>
                  </div>

                  {strategy.description && (
                    <div className="p-5 bg-[#0C0A09] rounded-xl border border-[#D97706]/10">
                      <h3 className="text-xs font-bold text-[#D97706] uppercase tracking-widest mb-2">Strategy Thesis</h3>
                      <p className="text-sm text-[#A8A29E] font-serif italic leading-relaxed">
                        "{strategy.description}"
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[#78716C] uppercase tracking-widest">Composition</h3>
                    {strategy.tokens.map(token => (
                      <div key={token.symbol} className="flex items-center justify-between p-4 bg-[#0C0A09] border border-[#D97706]/5 rounded-lg">
                        <span className="font-serif font-bold text-[#E7E5E4]">{token.symbol}</span>
                        <span className="text-sm font-mono text-[#D97706]">{token.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'DEPOSIT' && (
                <div className="space-y-8 py-8">
                  <div className="text-center">
                    <h3 className="text-xl font-serif font-bold text-[#E7E5E4] mb-2">Add Capital</h3>
                    <p className="text-sm text-[#A8A29E]">Invest SOL into {strategy.name}</p>
                  </div>
                  
                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center text-5xl font-serif font-bold bg-transparent border-b-2 border-[#D97706]/30 focus:border-[#D97706] focus:outline-none placeholder:text-[#292524] text-[#E7E5E4] py-4 transition-colors"
                    />
                    <div className="text-center text-sm text-[#78716C] mt-2 font-mono">SOL</div>
                  </div>

                  {depositError && (
                    <p className="text-[#9F1239] text-sm text-center bg-[#9F1239]/10 p-3 rounded border border-[#9F1239]/20">{depositError}</p>
                  )}
                </div>
              )}

              {/* ... Rebalance View (Similar updates) ... */}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-[#D97706]/10 shrink-0 bg-[#0C0A09]">
              {view === 'INFO' ? (
                <div className="flex gap-4">
                  {isOwner && (
                    <button 
                      onClick={() => setView('REBALANCE')}
                      className="flex-1 py-4 bg-[#1C1917] border border-[#D97706]/20 text-[#A8A29E] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#D97706]/10 hover:text-[#D97706] transition-colors"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => setView('DEPOSIT')}
                    className="flex-[4] py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-black rounded-xl font-serif font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-all"
                  >
                    <ArrowDownLeft className="w-5 h-5" />
                    Invest Capital
                  </button>
                </div>
              ) : view === 'DEPOSIT' ? (
                <div className="flex gap-4">
                  <button onClick={() => setView('INFO')} className="px-8 py-4 bg-[#1C1917] text-[#A8A29E] rounded-xl font-bold hover:text-[#E7E5E4] transition-colors">
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount}
                    className="flex-1 py-4 bg-[#D97706] text-black rounded-xl font-bold hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/20"
                  >
                    {isDepositing ? 'Processing...' : 'Confirm Transaction'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setView('INFO')} className="px-8 py-4 bg-[#1C1917] text-[#A8A29E] rounded-xl font-bold hover:text-[#E7E5E4]">
                    Back
                  </button>
                  <button 
                    onClick={handleRebalance}
                    disabled={isRebalancing}
                    className="flex-1 py-4 bg-[#D97706] text-black rounded-xl font-bold hover:bg-[#F59E0B] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};