
import { motion } from 'framer-motion';
import { useTacticalStore } from '../store/useTacticalStore';
import { Sparkles, Target, Zap, Shield, TrendingUp } from 'lucide-react';

const TAGS = [
  { id: 'sol-eco', label: 'Solana Ecosystem', icon: Zap },
  { id: 'aggressive', label: 'Aggressive Growth', icon: TrendingUp },
  { id: 'no-vc', label: 'Exclude VC Coins', icon: Shield },
  { id: 'meme', label: 'Meme Supercycle', icon: Sparkles },
  { id: 'defi', label: 'Bluechip DeFi', icon: Target },
];

export const DirectiveView = ({ onAnalyze }: { onAnalyze: () => void }) => {
  const { directive, setDirective, selectedTags, toggleTag } = useTacticalStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-md mx-auto relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-center mb-12"
        >
             <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-200">
                KAGEMUSHA
             </h1>
             <p className="text-xs uppercase tracking-[0.3em] text-white/40">Tactical Strategy Engine</p>
        </motion.div>

        {/* Input Module */}
        <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.1 }}
             className="w-full mb-8 relative group"
        >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl opacity-30 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>
            <div className="relative bg-[#0a0a0a] rounded-xl border border-white/10 p-1 flex items-center">
                <input 
                    type="text" 
                    value={directive}
                    onChange={(e) => setDirective(e.target.value)}
                    placeholder="Enter strategic directive..."
                    className="w-full bg-transparent border-none outline-none px-4 py-3 text-white placeholder-white/30 text-lg font-mono"
                />
            </div>
        </motion.div>

        {/* Tags Grid */}
        <div className="grid grid-cols-1 gap-3 w-full mb-12">
            {TAGS.map((tag, i) => {
                const isSelected = selectedTags.includes(tag.id);
                const Icon = tag.icon;
                return (
                    <motion.button
                        key={tag.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.05) }}
                        onClick={() => toggleTag(tag.id)}
                        className={`
                            relative flex items-center justify-between p-4 rounded-lg border transition-all duration-300
                            ${isSelected 
                                ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-400' : 'text-white/30'}`} />
                            <span className="font-medium tracking-wide text-sm">{tag.label}</span>
                        </div>
                        <div className={`
                            w-2 h-2 rounded-full transition-all duration-300
                            ${isSelected ? 'bg-orange-400 shadow-[0_0_8px_#f97316]' : 'bg-white/10'}
                        `} />
                    </motion.button>
                )
            })}
        </div>

        {/* Action Button */}
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAnalyze}
            disabled={!directive && selectedTags.length === 0}
            className={`
                w-full py-4 rounded-xl font-bold tracking-widest text-sm uppercase transition-all
                ${(directive || selectedTags.length > 0)
                    ? 'bg-white text-black hover:bg-orange-400 hover:text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}
            `}
        >
            Initialize Tactical Scan
        </motion.button>
    </div>
  );
};
