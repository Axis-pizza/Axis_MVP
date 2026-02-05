import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Wallet, Activity, ExternalLink } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { RichChart } from './RichChart';
import { api } from '../../services/api';
import { KagemushaService } from '../../services/kagemusha'; 
import { useToast } from '../../context/ToastContext';

interface StrategyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: any;
}

export const StrategyDetailModal = ({ isOpen, onClose, strategy }: StrategyDetailModalProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && strategy?.id) {
      api.getStrategyChart(strategy.id, '7d', 'line').then(res => {
        if (res.success) setChartData(res.data);
      });
    }
  }, [isOpen, strategy]);

  if (!strategy) return null;

  const handleDeposit = async () => {
    if (!wallet.publicKey) return showToast("Connect wallet first", "error");
    if (!amount) return;

    setLoading(true);
    try {
      await KagemushaService.depositSol(
          connection, 
          wallet, 
          new PublicKey(strategy.address || strategy.id),
          parseFloat(amount)
      );
      
      showToast("Deposit Successful!", "success");
      onClose();
    } catch (e: any) {
      console.error(e);
      showToast("Deposit Failed", "error");
    } finally {
      setLoading(false);
    }
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
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" 
            />

            <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#1C1917] border border-white/10 p-6 text-left align-middle shadow-xl pointer-events-auto"
                    >
                        <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-serif font-bold text-white mb-1">
                            {strategy.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-[#78716C]">
                                <span className="px-2 py-0.5 bg-white/5 rounded text-xs font-bold tracking-wider">
                                    {strategy.type || 'STRATEGY'}
                                </span>
                                <span>•</span>
                                <a 
                                    href={`https://solscan.io/account/${strategy.address || strategy.id}?cluster=devnet`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1 hover:text-[#D97706]"
                                >
                                    View on Solscan <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        </div>

                        <div className="h-64 bg-black/20 rounded-xl mb-6 p-4 border border-white/5">
                            <RichChart data={chartData} isPositive={(strategy.pnl_percent || 0) >= 0} />
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-[#78716C] mb-1">
                                <Activity className="w-3 h-3" /> APY (Est.)
                            </div>
                            <p className="text-xl font-bold text-[#D97706]">
                                {((strategy.roi || 0) * 12).toFixed(1)}%
                            </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-[#78716C] mb-1">
                                <TrendingUp className="w-3 h-3" /> 24h Change
                            </div>
                            <p className={`text-xl font-bold ${(strategy.roi || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(strategy.roi || 0).toFixed(2)}%
                            </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-[#78716C] mb-1">
                                <Wallet className="w-3 h-3" /> TVL
                            </div>
                            <p className="text-xl font-bold text-white">
                                {strategy.tvl ? strategy.tvl.toLocaleString() : '0'} SOL
                            </p>
                        </div>
                        </div>

                        <div className="bg-[#0C0A09] p-4 rounded-xl border border-white/5">
                        <label className="text-xs text-[#78716C] font-bold uppercase mb-2 block">Deposit Amount (SOL)</label>
                        <div className="flex gap-3">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                className="flex-1 bg-[#1C1917] border border-white/10 rounded-lg px-4 py-3 text-white font-bold outline-none focus:border-[#D97706]"
                            />
                            <button 
                                onClick={handleDeposit}
                                disabled={loading || !amount}
                                className="px-8 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Sending...' : 'Invest'}
                            </button>
                        </div>
                        </div>

                    </motion.div>
                </div>
            </div>
        </>
      )}
    </AnimatePresence>
  );
};