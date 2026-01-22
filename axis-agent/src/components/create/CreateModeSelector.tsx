import { motion } from 'framer-motion';
import { Sparkles, PenTool } from 'lucide-react';

interface CreateModeSelectorProps {
  mode: 'AI' | 'MANUAL';
  onChange: (mode: 'AI' | 'MANUAL') => void;
}

export const CreateModeSelector = ({ mode, onChange }: CreateModeSelectorProps) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="bg-[#1C1917] p-1 rounded-2xl border border-[#D97706]/20 flex relative">
        <motion.div
          className="absolute top-1 bottom-1 w-1/2 bg-[#D97706] rounded-xl shadow-lg shadow-orange-900/20"
          initial={false}
          animate={{ x: mode === 'AI' ? 0 : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <button
          onClick={() => onChange('AI')}
          className={`relative z-10 px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors ${
            mode === 'AI' ? 'text-[#0C0A09]' : 'text-[#78716C] hover:text-[#E7E5E4]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Chef
        </button>
        <button
          onClick={() => onChange('MANUAL')}
          className={`relative z-10 px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-sm transition-colors ${
            mode === 'MANUAL' ? 'text-[#0C0A09]' : 'text-[#78716C] hover:text-[#E7E5E4]'
          }`}
        >
          <PenTool className="w-4 h-4" />
          Manual
        </button>
      </div>
    </div>
  );
};