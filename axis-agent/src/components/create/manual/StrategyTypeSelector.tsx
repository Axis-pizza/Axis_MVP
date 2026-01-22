import { PieChart, TrendingUp, Lock } from 'lucide-react';

interface StrategyTypeSelectorProps {
  onSelect: (type: 'FIXED_WEIGHT' | 'MARKET_CAP') => void;
}

export const StrategyTypeSelector = ({ onSelect }: StrategyTypeSelectorProps) => {
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center px-2">
        <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2 md:mb-3 text-[#E7E5E4]">
          Choose Strategy Style
        </h2>
        <p className="text-[#A8A29E] text-sm max-w-md mx-auto leading-relaxed">
          Define the core logic for your ETF portfolio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Fixed Weight Strategy */}
        <button
          onClick={() => onSelect('FIXED_WEIGHT')}
          className="relative p-5 md:p-6 bg-[#1C1917] border border-[#D97706]/20 rounded-2xl text-left hover:border-[#D97706] hover:bg-[#D97706]/5 active:scale-[0.98] transition-all group overflow-hidden"
        >
          {/* Background Decorative Icon */}
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Lock className="w-20 h-20 md:w-24 md:h-24 text-[#D97706]" />
          </div>
          
          <div className="w-12 h-12 md:w-14 md:h-14 bg-[#D97706]/10 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#D97706]/20 border border-[#D97706]/10 transition-colors">
            <PieChart className="w-6 h-6 md:w-7 md:h-7 text-[#D97706]" />
          </div>
          
          <h3 className="text-lg md:text-xl font-serif font-bold mb-2 text-[#E7E5E4]">Fixed Weight</h3>
          <p className="text-sm text-[#A8A29E] mb-2 md:mb-4 leading-relaxed">
            Maintain a specific allocation (e.g., 60% SOL, 40% USDC). Automatically rebalances to buy low and sell high.
          </p>
        </button>

        {/* Market Cap Strategy */}
        <button
          onClick={() => onSelect('MARKET_CAP')}
          className="relative p-5 md:p-6 bg-[#1C1917] border border-[#D97706]/20 rounded-2xl text-left hover:border-[#D97706] hover:bg-[#D97706]/5 active:scale-[0.98] transition-all group overflow-hidden"
        >
          {/* Background Decorative Icon */}
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-20 h-20 md:w-24 md:h-24 text-blue-500" />
          </div>

          <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-blue-500/20 border border-blue-500/10 transition-colors">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
          </div>
          
          <h3 className="text-lg md:text-xl font-serif font-bold mb-2 text-[#E7E5E4]">Market Cap Weighted</h3>
          <p className="text-sm text-[#A8A29E] mb-2 md:mb-4 leading-relaxed">
            Dynamic index that tracks market leaders. Allocation adjusts based on the circulating market cap.
          </p>
        </button>
      </div>
    </div>
  );
};