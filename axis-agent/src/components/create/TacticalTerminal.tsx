/**
 * Tactical Terminal - "Your Strategy, Your ETF"
 * Simplified: Tabs now act as direct navigation. Presets removed.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, ArrowRight, Bot, LayoutGrid, Sparkles 
} from 'lucide-react';

interface TacticalTerminalProps {
  onAnalyze: (prompt: string) => void;
  onSelectPreset: (strategyId: string) => void; // もう使いませんが型互換のために残します
  onCreateManual: () => void; // これを呼び出すと即座にマニュアル画面へ行きます
  isLoading?: boolean;
}

export const TacticalTerminal = ({ 
  onAnalyze, 
  onCreateManual, 
  isLoading 
}: TacticalTerminalProps) => {
  const [aiPrompt, setAiPrompt] = useState('');

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim() && !isLoading) {
      onAnalyze(aiPrompt);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center pt-8 px-2 relative overflow-visible">
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[400px] bg-orange-600/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
            <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-2xl"
            >
                Your Strategy,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
                  Your ETF
                </span>
            </motion.h1>
            <p className="text-white/40 text-sm font-medium">
              Create an on-chain index fund in seconds.
            </p>
        </div>

        {/* Navigation Switcher (Tabs) */}
        <div className="flex justify-center">
            <div className="relative flex p-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                
                {/* Tab 1: AI (Active View) */}
                <button
                    className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-all duration-300"
                >
                    <motion.div
                        layoutId="active-tab-bg"
                        className="absolute inset-0 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_2px_10px_rgba(249,115,22,0.4)]"
                    />
                    <span className="relative z-10 flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        AI Architect
                    </span>
                </button>

                {/* Tab 2: Manual (Action Trigger) */}
                <button
                    onClick={onCreateManual}
                    className="relative z-10 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white/40 hover:text-white transition-all duration-300 hover:bg-white/5"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        Manual Builder
                    </span>
                </button>

            </div>
        </div>

        {/* Content Area (AI Interface Only) */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ type: "spring", bounce: 0 }}
            className="space-y-8"
        >
            {/* Console Input */}
            <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                
                <form 
                    onSubmit={handleAiSubmit}
                    className="relative flex items-center bg-[#080808] border border-white/10 group-focus-within:border-orange-500/50 rounded-full p-2 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,1)]"
                >
                    <div className="pl-5 pr-3 text-orange-500">
                        {isLoading ? <Sparkles className="w-5 h-5 animate-pulse" /> : <Bot className="w-5 h-5" />}
                    </div>
                    
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={isLoading}
                        placeholder="Describe your vision..."
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-white/30 text-base font-medium py-4"
                    />
                    
                    <motion.button 
                        type="submit"
                        disabled={!aiPrompt.trim() || isLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-3 bg-white/10 hover:bg-orange-500 hover:text-black text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all mr-1"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </form>
            </div>

            {/* AI Suggestions (Replacing Presets) */}
            <div className="space-y-4">
                <div className="text-center text-[10px] font-bold text-white/20 tracking-widest uppercase">
                    Quick Start Ideas
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                    {[
                        "🦁 High Beta Memes", 
                        "💰 Stable Yield Farm", 
                        "🚀 Solana DeFi Index", 
                        "🎮 GameFi Metaverse",
                        "💎 Blue Chip Weighted",
                        "🌐 L1 Infrastructure"
                    ].map((suggestion, i) => (
                        <motion.button
                            key={suggestion}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (i * 0.05) }}
                            whileHover={{ scale: 1.05, borderColor: "rgba(249,115,22,0.4)", backgroundColor: "rgba(255,255,255,0.05)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setAiPrompt(suggestion)}
                            className="px-4 py-2.5 rounded-full bg-[#111] border border-white/10 text-xs text-white/70 font-medium transition-all shadow-lg"
                        >
                            {suggestion}
                        </motion.button>
                    ))}
                </div>
            </div>
            
        </motion.div>

      </div>
    </div>
  );
};