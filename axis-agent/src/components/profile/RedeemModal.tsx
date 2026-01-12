import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDown, Loader2, AlertCircle } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { withdraw } from '../../services/kagemusha';

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyAddress: string;
  strategyName: string;
  maxShares: number; // For demo, we might mock this or fetch user position
  onSuccess: () => void;
}

export const RedeemModal = ({ 
  isOpen, 
  onClose, 
  strategyAddress, 
  strategyName,
  maxShares = 100, // Default mock value if not provided
  onSuccess 
}: RedeemModalProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      await withdraw(
        connection,
        wallet,
        new PublicKey(strategyAddress),
        Number(amount)
      );
      
      onSuccess();
      onClose();
    } catch (e: unknown) {
      console.error('Redeem failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to redeem shares');
    } finally {
      setIsLoading(false);
    }
  };

  const setPercentage = (pct: number) => {
    setAmount((maxShares * pct).toFixed(4));
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-[#121212] border border-white/10 rounded-3xl p-6 z-[70] shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Redeem Shares</h3>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50">Strategy</span>
                <span className="text-sm font-bold">{strategyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Available Shares</span>
                <span className="text-sm font-mono text-emerald-400">{maxShares.toFixed(4)}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Amount to Redeem</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 font-mono text-lg outline-none focus:border-orange-500/50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">
                    SHARES
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setPercentage(pct)}
                    className="flex-1 py-2 bg-white/5 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
                  >
                    {pct * 100}%
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleRedeem}
              disabled={isLoading || !amount || Number(amount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <ArrowDown className="w-5 h-5" />
                  Confirm Redemption
                </>
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
