import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Rocket, Sparkles, RefreshCw, Type, FileText, Fingerprint,
} from 'lucide-react';
import type { StrategyConfig } from './types';

interface IdentityStepProps {
  visible: boolean;
  config: StrategyConfig;
  setConfig: React.Dispatch<React.SetStateAction<StrategyConfig>>;
  focusedField: 'ticker' | 'name' | 'desc' | null;
  setFocusedField: (f: 'ticker' | 'name' | 'desc' | null) => void;
  portfolioCount: number;
  connected: boolean;
  onBack: () => void;
  onDeploy: () => void;
  onGenerateRandomTicker: () => void;
}

export const IdentityStep = ({
  visible,
  config,
  setConfig,
  focusedField,
  setFocusedField,
  portfolioCount,
  connected,
  onBack,
  onDeploy,
  onGenerateRandomTicker,
}: IdentityStepProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-40 bg-black flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 safe-area-top">
          <button
            onClick={onBack}
            className="w-11 h-11 bg-white/5 rounded-full flex items-center justify-center active:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-semibold text-base">Strategy Identity</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-900/20 border border-amber-800/20 text-amber-600 text-sm font-medium uppercase tracking-wider mb-3"
              >
                <Fingerprint size={14} /> Identity
              </motion.div>
              <h2
                className="text-2xl text-white"
                style={{ fontFamily: '"Times New Roman", serif' }}
              >
                Name Your Strategy
              </h2>
            </div>

            {/* Ticker */}
            <div
              onClick={() => setFocusedField('ticker')}
              className={`rounded-3xl border p-5 transition-all ${
                focusedField === 'ticker' ? 'border-amber-700/50 bg-[#141414]' : 'border-white/5 bg-[#0c0c0c]'
              }`}
            >
              <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${focusedField === 'ticker' ? 'text-amber-600' : 'text-white/30'}`}>
                <Sparkles size={14} /> Ticker
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-4xl ${focusedField === 'ticker' ? 'text-amber-600' : 'text-white/20'}`}
                  style={{ fontFamily: '"Times New Roman", serif' }}
                >
                  $
                </span>
                <input
                  type="text"
                  maxLength={5}
                  value={config.ticker}
                  onFocus={() => setFocusedField('ticker')}
                  onChange={(e) => setConfig(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  placeholder="MEME"
                  className="flex-1 bg-transparent text-4xl tracking-widest placeholder:text-white/10 focus:outline-none uppercase text-white"
                  style={{ fontFamily: '"Times New Roman", serif' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerateRandomTicker(); }}
                  className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/30 active:text-white active:bg-white/10"
                >
                  <RefreshCw size={22} />
                </button>
              </div>
            </div>

            {/* Name */}
            <div
              onClick={() => setFocusedField('name')}
              className={`rounded-3xl border p-5 transition-all ${
                focusedField === 'name' ? 'border-amber-700/50 bg-[#141414]' : 'border-white/5 bg-[#0c0c0c]'
              }`}
            >
              <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${focusedField === 'name' ? 'text-amber-600' : 'text-white/30'}`}>
                <Type size={14} /> Name
              </div>
              <input
                type="text"
                maxLength={30}
                value={config.name}
                onFocus={() => setFocusedField('name')}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Alpha Fund"
                className="w-full bg-transparent text-xl placeholder:text-white/10 focus:outline-none text-white py-2"
              />
            </div>

            {/* Description */}
            <div
              onClick={() => setFocusedField('desc')}
              className={`rounded-3xl border p-5 transition-all ${
                focusedField === 'desc' ? 'border-amber-700/50 bg-[#141414]' : 'border-white/5 bg-[#0c0c0c]'
              }`}
            >
              <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${focusedField === 'desc' ? 'text-amber-600' : 'text-white/30'}`}>
                <FileText size={14} /> Description
              </div>
              <textarea
                rows={4}
                value={config.description}
                onFocus={() => setFocusedField('desc')}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Investment thesis..."
                className="w-full bg-transparent text-base text-white/90 placeholder:text-white/10 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-amber-950/20 p-5 rounded-2xl border border-amber-900/20">
                <div className="text-xs text-amber-700/50 uppercase font-medium">Fee</div>
                <div
                  className="text-2xl text-amber-500 mt-1"
                  style={{ fontFamily: '"Times New Roman", serif' }}
                >
                  0.5%
                </div>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-amber-950/20 p-5 rounded-2xl border border-amber-900/20">
                <div className="text-xs text-amber-700/50 uppercase font-medium">Assets</div>
                <div
                  className="text-2xl text-white mt-1"
                  style={{ fontFamily: '"Times New Roman", serif' }}
                >
                  {portfolioCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deploy Button */}
        <div className="p-5 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent safe-area-bottom">
          <button
            onClick={onDeploy}
            disabled={!config.ticker || !config.name}
            className={`w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.98] ${
              (!config.ticker || !config.name)
                ? 'bg-[#222] text-white/20 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-black'
            }`}
          >
            {connected ? <>Deploy <Rocket size={24} /></> : "Connect Wallet"}
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
