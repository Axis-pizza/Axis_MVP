import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
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
                onPress={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" 
            />

            <View className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
                <View className="flex min-h-full items-center justify-center p-4 text-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#1C1917] border border-white/10 p-6 text-left align-middle shadow-xl pointer-events-auto"
                    >
                        <View className="flex justify-between items-start mb-6">
                        <View>
                            <h3 className="text-2xl font-serif font-bold text-white mb-1">
                            {strategy.name}
                            </h3>
                            <View className="flex items-center gap-2 text-sm text-[#78716C]">
                                <Text className="px-2 py-0.5 bg-white/5 rounded text-xs font-bold tracking-wider">
                                    {strategy.type || 'STRATEGY'}
                                </Text>
                                <Text>•</Text>
                                <a 
                                    href={`https://solscan.io/account/${strategy.address || strategy.id}?cluster=devnet`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1 hover:text-[#D97706]"
                                >
                                    View on Solscan <ExternalLink className="w-3 h-3" />
                                </a>
                            </View>
                        </View>
                        <button onPress={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                        </View>

                        <View className="h-64 bg-black/20 rounded-xl mb-6 p-4 border border-white/5">
                            <RichChart data={chartData} isPositive={(strategy.pnl_percent || 0) >= 0} />
                        </View>

                        <View className="grid grid-cols-3 gap-4 mb-6">
                        <View className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <View className="flex items-center gap-2 text-xs text-[#78716C] mb-1">
                                <Activity className="w-3 h-3" /> APY (Est.)
                            </View>
                            <Text className="text-xl font-bold text-[#D97706]">
                                {((strategy.roi || 0) * 12).toFixed(1)}%
                            </Text>
                        </View>
                        <View className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <View className="flex items-center gap-2 text-xs text-[#78716C] mb-1">
                                <TrendingUp className="w-3 h-3" /> 24h Change
                            </View>
                            <Text className={`text-xl font-bold ${(strategy.roi || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(strategy.roi || 0).toFixed(2)}%
                            </Text>
                        </View>
                        <View className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <View className="flex items-center gap-2 text-xs text-[#78716C] mb-1">
                                <Wallet className="w-3 h-3" /> TVL
                            </View>
                            <Text className="text-xl font-bold text-white">
                                {strategy.tvl ? strategy.tvl.toLocaleString() : '0'} SOL
                            </Text>
                        </View>
                        </View>

                        <View className="bg-[#0C0A09] p-4 rounded-xl border border-white/5">
                        <label className="text-xs text-[#78716C] font-bold uppercase mb-2 block">Deposit Amount (SOL)</label>
                        <View className="flex gap-3">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                className="flex-1 bg-[#1C1917] border border-white/10 rounded-lg px-4 py-3 text-white font-bold outline-none focus:border-[#D97706]"
                            />
                            <button 
                                onPress={handleDeposit}
                                disabled={loading || !amount}
                                className="px-8 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Sending...' : 'Invest'}
                            </button>
                        </View>
                        </View>

                    </motion.div>
                </View>
            </View>
        </>
      )}
    </AnimatePresence>
  );
};