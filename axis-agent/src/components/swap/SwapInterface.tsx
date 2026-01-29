/**
 * Swap Interface - Titan Style x Kagemusha Theme
 * High-fidelity UI based on Titan DEX, optimized for Jupiter API integration.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDown, Settings, History, RefreshCcw, ArrowRightLeft, 
  ChevronDown, ChevronRight, Wallet, Zap, Clock 
} from 'lucide-react';
import { useWallet } from '../../hooks/useWallet'; // パスは環境に合わせて調整してください

// --- Mock Data & Types ---
interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  price: number;
}

const MOCK_TOKENS: Token[] = [
  { symbol: 'SOL', name: 'Solana', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', balance: 12.5, price: 145.20 },
  { symbol: 'USDC', name: 'USD Coin', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', balance: 4500.00, price: 1.00 },
  { symbol: 'JUP', name: 'Jupiter', icon: 'https://static.jup.ag/jup/icon.png', balance: 0, price: 1.25 },
];

const MOCK_HISTORY = [
  { id: 1, type: 'Swap', from: 'SOL', to: 'USDC', fromAmt: 0.5, toAmt: 72.5, time: '2 mins ago', status: 'Success' },
  { id: 2, type: 'Swap', from: 'USDC', to: 'JUP', fromAmt: 100, toAmt: 80, time: '1 hour ago', status: 'Success' },
];

export const SwapInterface = () => {
  const { isConnected } = useWallet();
  const [mode, setMode] = useState<'INSTANT' | 'LIMIT'>('INSTANT');
  const [fromToken, setFromToken] = useState<Token>(MOCK_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(MOCK_TOKENS[1]);
  const [amount, setAmount] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // Helper: Switch Tokens
  const handleSwitch = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Helper: Format USD
  const getUsdValue = (val: string, price: number) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '$0.00';
    return `$${(num * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="w-full min-h-screen bg-[#030303] flex flex-col items-center pt-6 px-4 pb-32">
      
      {/* Background Atmosphere */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-orange-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[480px] relative z-10 space-y-4">
        
        {/* 1. Header & Tabs */}
        <div className="flex justify-between items-center mb-2 px-1">
          <div className="flex items-center gap-1 bg-[#111] p-1 rounded-full border border-white/5">
             <button 
                onClick={() => setMode('INSTANT')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${mode === 'INSTANT' ? 'bg-[#222] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
             >
                <Zap className="w-3.5 h-3.5" />
                Instant
             </button>
             <button 
                onClick={() => setMode('LIMIT')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${mode === 'LIMIT' ? 'bg-[#222] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
             >
                <Clock className="w-3.5 h-3.5" />
                Limit <span className="text-[9px] bg-orange-500 text-black px-1 rounded ml-1">Beta</span>
             </button>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                <RefreshCcw className="w-4 h-4" />
            </button>
            <button className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Swap Card Container */}
        <div className="bg-[#09090b] border border-white/5 rounded-[32px] p-2 shadow-2xl relative">
          
          {/* A. Sell Card (Input) */}
          <div className="bg-[#111113] rounded-[24px] p-5 space-y-4 hover:bg-[#131315] transition-colors group relative">
            <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-white/40 group-focus-within:text-orange-500 transition-colors">Sell</span>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setAmount((fromToken.balance / 2).toString())}
                        className="text-[10px] font-bold bg-[#1a1a1a] text-white/60 px-2 py-1 rounded border border-white/5 hover:border-orange-500/50 hover:text-orange-500 transition-all"
                    >
                        50%
                    </button>
                    <button 
                        onClick={() => setAmount(fromToken.balance.toString())}
                        className="text-[10px] font-bold bg-[#1a1a1a] text-orange-500/80 px-2 py-1 rounded border border-white/5 hover:border-orange-500/50 hover:text-orange-500 transition-all"
                    >
                        Max
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                    <input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-transparent text-4xl font-medium text-white placeholder-white/10 outline-none"
                    />
                    <span className="text-xs text-white/30 font-mono">
                        ≈ {getUsdValue(amount, fromToken.price)}
                    </span>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <button className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222] pl-1 pr-3 py-1.5 rounded-full border border-white/5 transition-all shadow-lg group/token">
                        <img src={fromToken.icon} alt={fromToken.symbol} className="w-7 h-7 rounded-full" />
                        <span className="font-bold text-lg text-white">{fromToken.symbol}</span>
                        <ChevronDown className="w-4 h-4 text-white/40 group-hover/token:text-white transition-colors" />
                    </button>
                    <div className="text-xs text-white/30">
                        Balance: <span className="text-white/60">{fromToken.balance}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Switch Button (Absolute Center) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <motion.button 
                whileHover={{ rotate: 180, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSwitch}
                className="w-10 h-10 bg-[#09090b] border-[3px] border-[#09090b] rounded-xl flex items-center justify-center text-white/60 hover:text-orange-500 shadow-xl"
            >
                <div className="w-full h-full bg-[#1a1a1a] rounded-lg flex items-center justify-center border border-white/5">
                    <ArrowDown className="w-5 h-5" />
                </div>
            </motion.button>
          </div>

          {/* Spacer for Switch Button */}
          <div className="h-1 bg-transparent" />

          {/* B. Buy Card (Output) */}
          <div className="bg-[#111113] rounded-[24px] p-5 space-y-4 hover:bg-[#131315] transition-colors">
             <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-white/40">Buy</span>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                    <input
                        type="number"
                        placeholder="0"
                        readOnly
                        value={amount ? (parseFloat(amount) * (fromToken.price / toToken.price)).toFixed(4) : ''}
                        className="w-full bg-transparent text-4xl font-medium text-white/50 placeholder-white/10 outline-none cursor-default"
                    />
                     <span className="text-xs text-white/30 font-mono">
                        ≈ {getUsdValue(amount, fromToken.price)}
                    </span>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    <button className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#222] pl-1 pr-3 py-1.5 rounded-full border border-white/5 transition-all shadow-lg group/token">
                        <img src={toToken.icon} alt={toToken.symbol} className="w-7 h-7 rounded-full" />
                        <span className="font-bold text-lg text-white">{toToken.symbol}</span>
                        <ChevronDown className="w-4 h-4 text-white/40 group-hover/token:text-white transition-colors" />
                    </button>
                    <div className="text-xs text-white/30">
                        Balance: <span className="text-white/60">{toToken.balance}</span>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* 3. Rate Info */}
        {amount && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex justify-between px-4 text-xs font-medium text-white/40"
            >
                <span>Rate</span>
                <div className="flex items-center gap-1">
                    <span>1 {fromToken.symbol} ≈ {(fromToken.price / toToken.price).toFixed(4)} {toToken.symbol}</span>
                    <RefreshCcw className="w-3 h-3" />
                </div>
            </motion.div>
        )}

        {/* 4. Main Action Button */}
        <button
            disabled={!amount}
            className={`
                w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-lg
                ${amount 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-black hover:shadow-orange-500/20 active:scale-98' 
                    : 'bg-[#1a1a1a] text-white/20 cursor-not-allowed'
                }
            `}
        >
            {isConnected 
                ? (amount ? 'Swap' : 'Enter an amount') 
                : 'Connect Wallet'
            }
        </button>

        {/* 5. Swap History (Titan Style Accordion) */}
        <div className="mt-8">
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-4 px-2"
            >
                <History className="w-4 h-4" />
                <span className="font-bold text-sm">Swap History</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
                {showHistory && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                    >
                        {MOCK_HISTORY.map((tx) => (
                            <div key={tx.id} className="bg-[#09090b] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Coins Visual */}
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center border border-white/10 z-10">
                                            <img src={MOCK_TOKENS.find(t => t.symbol === tx.from)?.icon} className="w-5 h-5 rounded-full" />
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center border border-white/10 -ml-3 z-0">
                                             <img src={MOCK_TOKENS.find(t => t.symbol === tx.to)?.icon} className="w-5 h-5 rounded-full" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                                            <span>Swap {tx.from}</span>
                                            <ArrowRightLeft className="w-3 h-3 text-white/30" />
                                            <span>{tx.to}</span>
                                        </div>
                                        <div className="text-[10px] text-white/40">{tx.time}</div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-400">+{tx.toAmt} {tx.to}</div>
                                    <div className="text-[10px] text-white/30">-{tx.fromAmt} {tx.from}</div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

      </div>
    </div>
  );
};