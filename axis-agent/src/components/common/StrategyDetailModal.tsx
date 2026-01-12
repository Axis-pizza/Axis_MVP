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
  address?: string; // On-chain address
  ownerPubkey: string;
  name: string;
  type: string;
  tokens: Token[];
  description?: string;
  tvl: number;
  createdAt?: number;
  pnl?: number; // Optional PnL percent
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
  
  // Deposit State
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Rebalance State
  const [rebalanceTokens, setRebalanceTokens] = useState<Token[]>([]);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isTokenSearchOpen, setIsTokenSearchOpen] = useState(false);

  // Reset view on open
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
  // Use strategy.address if available, otherwise assume it's not deployed or we need to derive it
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
    // Check total weight cap
    const otherTokensWeight = rebalanceTokens.reduce((sum, t) => t.symbol === symbol ? sum : sum + t.weight, 0);
    if (otherTokensWeight + newWeight > 100) return; 
    
    setRebalanceTokens(tokens => tokens.map(t => 
      t.symbol === symbol ? { ...t, weight: newWeight } : t
    ));
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:w-[600px] md:left-1/2 md:-translate-x-1/2 bg-[#121212] border border-white/10 rounded-3xl z-[70] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold">{strategy.name}</h2>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                    {strategy.type}
                  </span>
                  {strategyAddress && (
                    <span className="font-mono flex items-center gap-1">
                      {strategyAddress.slice(0, 4)}...{strategyAddress.slice(-4)}
                      <Copy className="w-3 h-3 cursor-pointer" onClick={() => navigator.clipboard.writeText(strategyAddress)} />
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {view === 'INFO' && (
                <div className="space-y-6">
                  <div className="flex justify-center py-4">
                    <PizzaChart slices={strategy.tokens} size={180} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-xs text-white/50">Total Value Locked</p>
                      <p className="text-xl font-bold flex items-center gap-1">
                        {strategy.tvl.toFixed(2)} <span className="text-sm font-normal text-white/50">SOL</span>
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-xs text-white/50">Holders</p>
                      <p className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-4 h-4 text-white/50" />
                        --
                      </p>
                    </div>
                  </div>

                  {strategy.description && (
                    <div className="p-4 bg-white/5 rounded-2xl">
                      <h3 className="text-sm font-bold mb-2">Strategy Thesis</h3>
                      <p className="text-sm text-white/70 leading-relaxed">
                        {strategy.description}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white/50">Composition</h3>
                    {strategy.tokens.map(token => (
                      <div key={token.symbol} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <span className="font-mono font-bold">{token.symbol}</span>
                        <span className="text-sm">{token.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'DEPOSIT' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-bold">Deposit SOL</h3>
                    <p className="text-sm text-white/50">Invest in {strategy.name}</p>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center text-4xl font-bold bg-transparent border-none focus:outline-none placeholder:text-white/10 py-8"
                    />
                    <div className="text-center text-sm text-white/50">SOL</div>
                  </div>

                  {depositError && (
                    <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{depositError}</p>
                  )}
                </div>
              )}

              {view === 'REBALANCE' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold">Adjust Composition</h3>
                    <button 
                      onClick={() => setIsTokenSearchOpen(true)}
                      className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-500/30"
                    >
                      + Add Token
                    </button>
                  </div>

                  <div className="space-y-3">
                    {rebalanceTokens.map(token => (
                      <div key={token.symbol} className="p-3 bg-white/5 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{token.symbol}</span>
                          <button onClick={() => removeToken(token.symbol)} className="text-white/30 hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={token.weight} 
                            onChange={(e) => updateTokenWeight(token.symbol, parseInt(e.target.value))}
                            className="flex-1 accent-orange-500"
                          />
                          <span className="w-12 text-right text-sm font-mono">{token.weight}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 rounded-xl text-xs text-blue-300">
                    Total Weight: {rebalanceTokens.reduce((s, t) => s + t.weight, 0)}%
                  </div>

                  <TokenSearchModal 
                    isOpen={isTokenSearchOpen} 
                    onClose={() => setIsTokenSearchOpen(false)} 
                    onAdd={addToken}
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 shrink-0 bg-[#121212]">
              {view === 'INFO' ? (
                <div className="flex gap-3">
                  {isOwner && (
                    <button 
                      onClick={() => setView('REBALANCE')}
                      className="flex-1 py-3 bg-white/10 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                    >
                      <Shuffle className="w-4 h-4" />
                      Rebalance
                    </button>
                  )}
                  <button 
                    onClick={() => setView('DEPOSIT')}
                    className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <ArrowDownLeft className="w-5 h-5" />
                    Deposit / Invest
                  </button>
                </div>
              ) : view === 'DEPOSIT' ? (
                <div className="flex gap-3">
                  <button onClick={() => setView('INFO')} className="px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">
                    Back
                  </button>
                  <button 
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount}
                    className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-bold hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {isDepositing ? 'Confirming...' : 'Confirm Deposit'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setView('INFO')} className="px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10">
                    Cancel
                  </button>
                  <button 
                    onClick={handleRebalance}
                    disabled={isRebalancing}
                    className="flex-1 py-3 bg-orange-500 text-black rounded-xl font-bold hover:bg-orange-400 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isRebalancing ? 'Updating...' : 'Save Composition'}
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
