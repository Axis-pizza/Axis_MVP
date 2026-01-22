import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Clock, ArrowLeftRight, Percent, Upload, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../../../services/api'; // 画像アップロードAPIがある場合

interface StrategySettingsProps {
  onBack: () => void;
  onNext: (params: any, info: any) => void;
}

export const StrategySettings = ({ onBack, onNext }: StrategySettingsProps) => {
  // --- Existing States ---
  const [swapFee, setSwapFee] = useState(0.3);
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [triggerType, setTriggerType] = useState<'DEVIATION' | 'TIME'>('DEVIATION');
  const [deviationThreshold, setDeviationThreshold] = useState(5);
  const [timeInterval, setTimeInterval] = useState(24);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');

  // --- New: Image Upload State ---
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setImageFile(file);

    // Upload to API (Optional: 即時アップロードする場合)
    // setIsUploading(true);
    // try {
    //   const res = await api.uploadImage(file);
    //   if (res.success) setImagePreview(res.url);
    // } catch (e) { ... } finally { setIsUploading(false); }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-serif font-bold mb-2 text-[#E7E5E4]">Cooking Settings</h2>
        <p className="text-[#A8A29E] text-sm">Fine-tune fees, automation, and branding.</p>
      </div>

      <div className="space-y-6">
        
        {/* --- Branding Section (Name, Ticker, Logo) --- */}
        <div className="p-6 bg-[#1C1917] rounded-2xl border border-[#D97706]/10">
          <h3 className="text-sm font-bold text-[#78716C] uppercase tracking-wider mb-4">Identity</h3>
          
          <div className="flex gap-6 items-start">
            {/* Logo Upload */}
            <div className="shrink-0">
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleImageSelect} 
                 className="hidden" 
                 accept="image/*"
               />
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${
                   imagePreview 
                     ? 'border-[#D97706] bg-black' 
                     : 'border-[#D97706]/30 hover:border-[#D97706] hover:bg-[#D97706]/5'
                 }`}
               >
                 {imagePreview ? (
                   <>
                     <img src={imagePreview} alt="Logo" className="w-full h-full object-cover" />
                     {/* Hover Overlay to Remove */}
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <button onClick={clearImage} className="p-1 bg-red-500/20 text-red-500 rounded-full">
                         <X className="w-5 h-5" />
                       </button>
                     </div>
                   </>
                 ) : (
                   <>
                     <ImageIcon className="w-6 h-6 text-[#78716C] mb-1 group-hover:text-[#D97706]" />
                     <span className="text-[10px] text-[#78716C] font-bold">Upload</span>
                   </>
                 )}
               </div>
            </div>

            {/* Name & Ticker Inputs */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-[#78716C] mb-1 block">Strategy Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Solana Blue Chip Index"
                  className="w-full p-3 bg-[#0C0A09] border border-[#D97706]/20 rounded-xl text-sm focus:outline-none focus:border-[#D97706] text-[#E7E5E4] placeholder-[#57534E]"
                />
              </div>
              <div>
                <label className="text-xs text-[#78716C] mb-1 block">Ticker Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. SBCI"
                  maxLength={5}
                  className="w-full p-3 bg-[#0C0A09] border border-[#D97706]/20 rounded-xl text-sm focus:outline-none focus:border-[#D97706] font-mono uppercase text-[#E7E5E4] placeholder-[#57534E]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- Swap Fee (Existing) --- */}
        <div className="p-5 bg-[#1C1917] rounded-2xl border border-[#D97706]/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2 text-[#E7E5E4]">
              <Percent className="w-4 h-4 text-[#D97706]" /> Swap Fee
            </h3>
            <span className="text-[#D97706] font-mono">{swapFee}%</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="2.0"  // ★修正: 5.0 -> 2.0 (これでも高い方ですが許容範囲)
            step="0.01"
            value={swapFee}
            onChange={(e) => setSwapFee(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#292524] rounded-lg appearance-none cursor-pointer accent-[#D97706]"
          />
          <div className="flex justify-between mt-2 text-[10px] text-[#78716C]">
            <span>Stable (0.05%)</span>
            <span>Standard (0.3%)</span>
            <span>Exotic (1.0%+)</span>
          </div>
        </div>

        {/* --- Automation & Rebalancing (Existing) --- */}
        <div className="p-5 bg-[#1C1917] rounded-2xl border border-[#D97706]/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-[#E7E5E4]">
                <RefreshCw className="w-4 h-4 text-[#D97706]" /> Auto-Rebalance
              </h3>
              <p className="text-xs text-[#78716C]">Trigger trades to maintain target weights.</p>
            </div>
            <button
              onClick={() => setAutomationEnabled(!automationEnabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                automationEnabled ? 'bg-[#D97706]' : 'bg-[#292524]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                automationEnabled ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <AnimatePresence>
            {automationEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4"
              >
                {/* Trigger Type Selection */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#0C0A09] rounded-xl border border-[#D97706]/10">
                  <button
                    onClick={() => setTriggerType('DEVIATION')}
                    className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                      triggerType === 'DEVIATION' ? 'bg-[#D97706]/20 text-[#D97706]' : 'text-[#78716C]'
                    }`}
                  >
                    Weight Deviation
                  </button>
                  <button
                    onClick={() => setTriggerType('TIME')}
                    className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                      triggerType === 'TIME' ? 'bg-[#D97706]/20 text-[#D97706]' : 'text-[#78716C]'
                    }`}
                  >
                    Time Interval
                  </button>
                </div>

                {/* Logic Details */}
                <div className="p-4 bg-[#0C0A09] rounded-xl border border-dashed border-[#D97706]/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {triggerType === 'DEVIATION' ? <ArrowLeftRight className="w-5 h-5 text-[#D97706]" /> : <Clock className="w-5 h-5 text-[#D97706]" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#E7E5E4] mb-1">Execute logic when:</p>
                      
                      {triggerType === 'DEVIATION' ? (
                        <>
                          <p className="text-xs text-[#78716C] mb-3">
                            Any asset's weight drifts by more than <span className="text-[#D97706] font-bold">{deviationThreshold}%</span> from target.
                          </p>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={deviationThreshold}
                            onChange={(e) => setDeviationThreshold(parseInt(e.target.value))}
                            className="w-full h-1 bg-[#292524] rounded-lg accent-[#D97706]"
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-[#78716C] mb-3">
                            At least <span className="text-[#D97706] font-bold">{timeInterval} hours</span> have passed since last rebalance.
                          </p>
                          <div className="flex gap-2">
                            {[12, 24, 48, 168].map(h => (
                              <button
                                key={h}
                                onClick={() => setTimeInterval(h)}
                                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                                  timeInterval === h ? 'border-[#D97706] text-[#D97706]' : 'border-[#292524] text-[#78716C]'
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-[#D97706]/10 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-4 bg-[#1C1917] rounded-xl font-bold text-[#78716C] hover:text-[#E7E5E4] transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onNext(
            { swapFee, automationEnabled, triggerType, deviationThreshold, timeInterval }, 
            { name, symbol, imageFile, imagePreview } // imageFileとPreviewを渡す
          )}
          disabled={!name || !symbol}
          className="flex-1 py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-[#0C0A09] font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          Review & Deploy
        </button>
      </div>
    </div>
  );
};