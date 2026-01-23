import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PizzaChart } from '../../common/PizzaChart';
import { ToppingSearchModal } from './ToppingSearchModal';
import type { TokenInfo } from '../../../types';

interface SelectedToken extends TokenInfo {
  weight: number;
}


interface TokenConfiguratorProps {
  onBack: () => void;
  onNext: (tokens: SelectedToken[]) => void;
}

export const TokenConfigurator = ({ onBack, onNext }: TokenConfiguratorProps) => {
  const [selectedTokens, setSelectedTokens] = useState<SelectedToken[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalWeight = useMemo(() => selectedTokens.reduce((sum, t) => sum + t.weight, 0), [selectedTokens]);
  const isValid = totalWeight === 100 && selectedTokens.length >= 1;

  const updateWeight = (address: string, newWeight: number) => {
    setSelectedTokens(prev => prev.map(t => t.address === address ? { ...t, weight: newWeight } : t));
  };

  const removeToken = (address: string) => {
    if (selectedTokens.length <= 1) return;
    setSelectedTokens(prev => prev.filter(t => t.address !== address));
  };

  const addToken = (token: TokenInfo) => {
      // 既にリストにある場合は何もしない（アラートを出しても良い）
      if (selectedTokens.some(t => t.address === token.address)) {
        
        return;
      }
    setSelectedTokens(prev => [...prev, { ...token, weight: 0, decimals: 9 }]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-serif font-bold text-[#E7E5E4]">Select Ingredients</h2>
        <p className="text-[#A8A29E] text-sm">Add custom tokens and adjust their allocation. Total must be 100%.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Left: Visualization (Fixed Position) */}
        <div className="w-full md:w-1/3 flex flex-col items-center">
           <div className="sticky top-24 w-full flex flex-col items-center">
              {/* Pizza Chart - Scale調整とマージン確保 */}
              <div className="relative mb-8">
                 <PizzaChart slices={selectedTokens} size={240} showLabels={false} />
                 {/* Center Label (Optional) */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-mono text-white/20">AXIS</span>
                 </div>
              </div>
              
              {/* Status Indicator */}
              <div className={`w-full max-w-[240px] text-center p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                isValid 
                  ? 'bg-green-500/5 border-green-500/30 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                  : 'bg-red-500/5 border-red-500/30 text-red-500'
              }`}>
                <div className="text-4xl font-serif font-bold mb-1 tracking-tight">{totalWeight}%</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {isValid ? 'PERFECT' : 'ADJUST'}
                </div>
              </div>
           </div>
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-2/3 space-y-4">
           {selectedTokens.map((token) => (
             <motion.div layout key={token.address} className="bg-[#1C1917] p-5 rounded-xl border border-[#D97706]/10 group hover:border-[#D97706]/30 transition-all">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-[#0C0A09] flex items-center justify-center border border-[#D97706]/20 overflow-hidden shadow-lg">
                     {token.logoURI ? (
                       <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
                     ) : (
                       <span className="text-xs">{token.symbol[0]}</span>
                     )}
                   </div>
                   <div>
                     <span className="font-bold text-[#E7E5E4] block text-lg leading-none mb-1">{token.symbol}</span>
                     <span className="text-xs text-[#78716C] font-mono">{token.name}</span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   <div className={`px-3 py-1.5 rounded-lg border font-mono text-sm font-bold min-w-[60px] text-center ${
                     token.weight === 0 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#0C0A09] border-[#D97706]/20 text-[#D97706]'
                   }`}>
                     {token.weight}%
                   </div>
                   <button 
                     onClick={() => removeToken(token.address)} 
                     className="p-2 text-[#57534E] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                     disabled={selectedTokens.length <= 1}
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>
               
               <input 
                 type="range" 
                 min="0" 
                 max="100" 
                 value={token.weight} 
                 onChange={(e) => updateWeight(token.address, parseInt(e.target.value))} 
                 className="w-full h-1.5 bg-[#292524] rounded-lg appearance-none cursor-pointer accent-[#D97706] hover:accent-[#F59E0B]" 
               />
             </motion.div>
           ))}

           <button 
             onClick={() => setIsModalOpen(true)} 
             className="w-full py-5 border-2 border-dashed border-[#D97706]/20 rounded-xl text-[#78716C] hover:text-[#D97706] hover:border-[#D97706]/40 hover:bg-[#D97706]/5 flex items-center justify-center gap-2 font-bold text-sm transition-all group"
           >
             <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center group-hover:scale-110 transition-transform">
               <Plus className="w-3 h-3" />
             </div>
             Add Custom Asset
           </button>
        </div>
      </div>

      <div className="flex gap-3 pt-8 border-t border-[#D97706]/10 mt-8">
        <button onClick={onBack} className="px-6 py-4 bg-[#1C1917] rounded-xl font-bold text-[#78716C] hover:text-[#E7E5E4]">Back</button>
        <button onClick={() => onNext(selectedTokens)} disabled={!isValid} className="flex-1 py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-[#0C0A09] font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] transition-all">Continue to Settings</button>
      </div>

      <ToppingSearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelect={addToken}
        selectedIds={selectedTokens.map(t => t.address)}
      />
    </div>
  );
};