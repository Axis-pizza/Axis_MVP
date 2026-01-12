
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Plus, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Token } from '../store/useTacticalStore';

// Mock comprehensive token list - in real app, fetch from Jupiter API
const JUP_STRICT_LIST = [
    { symbol: 'SOL', name: 'Solana', type: 'L1', price: 145.20 },
    { symbol: 'USDC', name: 'USD Coin', type: 'Stable', price: 1.00 },
    { symbol: 'JUP', name: 'Jupiter', type: 'DeFi', price: 1.20 },
    { symbol: 'WIF', name: 'dogwifhat', type: 'Meme', price: 2.50 },
    { symbol: 'BONK', name: 'Bonk', type: 'Meme', price: 0.00002 },
    { symbol: 'JTO', name: 'Jito', type: 'DeFi', price: 3.40 },
    { symbol: 'RAY', name: 'Raydium', type: 'DeFi', price: 1.80 },
    { symbol: 'PYTH', name: 'Pyth Network', type: 'Oracle', price: 0.40 },
    { symbol: 'RENDER', name: 'Render', type: 'DePIN', price: 7.80 },
    { symbol: 'HNT', name: 'Helium', type: 'DePIN', price: 5.20 },
    { symbol: 'IO', name: 'io.net', type: 'DePIN', price: 3.50 },
    { symbol: 'KMNO', name: 'Kamino', type: 'DeFi', price: 0.15 },
    { symbol: 'DRIFT', name: 'Drift', type: 'DeFi', price: 0.85 },
    { symbol: 'CLOUD', name: 'Cloud Chat', type: 'AI', price: 0.50 },
    { symbol: 'SEND', name: 'Blink', type: 'Social', price: 0.05 },
    { symbol: 'ETH', name: 'Ether (Portal)', type: 'L1', price: 3000.00 },
    { symbol: 'WETH', name: 'Wrapped Ether', type: 'L1', price: 3000.00 },
];

interface TokenSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (token: Token) => void;
    currentStrategyType?: 'SNIPER' | 'FORTRESS' | 'WAVE';
}

export const TokenSearchModal = ({ isOpen, onClose, onAdd, currentStrategyType }: TokenSearchModalProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTokens = useMemo(() => {
        return JUP_STRICT_LIST.filter(t => 
            t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const getAiReason = (token: any) => {
        if (!currentStrategyType) return null;
        if (currentStrategyType === 'SNIPER' && token.type === 'Meme') return "High Alpha Potential";
        if (currentStrategyType === 'FORTRESS' && token.type === 'Stable') return "Stability Anchor";
        if (currentStrategyType === 'WAVE' && token.type === 'DeFi') return "Yield Generator";
        return null;
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
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        className="fixed bottom-0 left-0 w-full h-[85vh] bg-[#121212] rounded-t-3xl border-t border-white/10 z-[70] flex flex-col shadow-2xl safe-area-bottom"
                    >
                        {/* Handle for drag (visual only for now) */}
                        <div className="w-full flex justify-center pt-3 pb-1">
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        {/* Search Header */}
                        <div className="p-6 pb-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                <input 
                                    type="text" 
                                    placeholder="Search ingredients (e.g. SOL, JUP)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/30 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-lg"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Suggestions / List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-12">
                            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">
                                {searchTerm ? 'Search Results' : 'Recommended Ingredients'}
                            </h3>
                            
                            <div className="grid gap-3">
                                {filteredTokens.map((token, i) => {
                                    const aiReason = getAiReason(token);
                                    return (
                                        <motion.button
                                            key={token.symbol}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => {
                                                onAdd({ symbol: token.symbol, weight: 10, value: token.price });
                                                onClose();
                                            }}
                                            className="flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-white/5 hover:bg-[#222] active:scale-[0.98] transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-sm text-white/60 group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-colors">
                                                    {token.symbol[0]}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white">{token.symbol}</span>
                                                        <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{token.type}</span>
                                                    </div>
                                                    <span className="text-xs text-white/40">{token.name}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="bg-white/5 p-1 rounded-full group-hover:bg-orange-500 group-hover:text-black transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                                {aiReason && (
                                                    <div className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        {aiReason}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
