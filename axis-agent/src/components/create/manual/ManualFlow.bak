import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Trash2, Lock, Unlock, 
  RotateCcw, PieChart as PieIcon, Save, RefreshCw,
  AlertCircle, Settings, Info
} from 'lucide-react';
import { JupiterService, type JupiterToken } from '../../../services/jupiter';
import { PizzaChart } from '../../common/PizzaChart'; 
import { BacktestChart } from '../../common/BacktestChart';

// ★重要: 親コンポーネントと共有する型定義 (ManualFlowから移植)
export interface ManualData {
  tokens: { symbol: string; weight: number; mint: string }[];
  name: string;
  description: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
}

interface AssetItem {
  token: JupiterToken;
  weight: number;
  locked: boolean;
  price?: number;
}

interface ManualDashboardProps {
  onDeploySuccess: (data: ManualData) => void; // ★名前をManualFlowに合わせる
}

export const ManualDashboard = ({ onDeploySuccess }: ManualDashboardProps) => {
  // State
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]);
  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Strategy Meta Data
  const [strategyName, setStrategyName] = useState('My Alpha Strategy');
  const [strategyType, setStrategyType] = useState<'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE'>('BALANCED');
  const [description, setDescription] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);

  // 初期化
  useEffect(() => {
    const init = async () => {
      const list = await JupiterService.getStrictList();
      setAllTokens(list);
      setIsLoading(false);
    };
    init();
  }, []);

  // 合計計算
  const totalWeight = useMemo(() => 
    portfolio.reduce((sum, item) => sum + item.weight, 0), 
  [portfolio]);

  // --- Actions ---
  
  const addToken = (token: JupiterToken) => {
    if (portfolio.some(p => p.token.address === token.address)) return;
    const remaining = 100 - totalWeight;
    setPortfolio([...portfolio, { token, weight: remaining > 0 ? remaining : 0, locked: false }]);
  };

  const removeToken = (address: string) => {
    setPortfolio(portfolio.filter(p => p.token.address !== address));
  };

  const updateWeight = (address: string, newWeight: number) => {
    setPortfolio(prev => prev.map(p => 
      p.token.address === address 
        ? { ...p, weight: Math.min(100, Math.max(0, newWeight)) } 
        : p
    ));
  };

  const toggleLock = (address: string) => {
    setPortfolio(prev => prev.map(p => 
      p.token.address === address ? { ...p, locked: !p.locked } : p
    ));
  };

  const autoBalance = () => {
    const lockedItems = portfolio.filter(p => p.locked);
    const unlockedItems = portfolio.filter(p => !p.locked);
    if (unlockedItems.length === 0) return;

    const lockedWeight = lockedItems.reduce((sum, p) => sum + p.weight, 0);
    const targetWeight = 100 - lockedWeight;
    if (targetWeight < 0) return;

    const perItem = Math.floor(targetWeight / unlockedItems.length);
    const remainder = targetWeight % unlockedItems.length;

    setPortfolio(prev => prev.map(p => {
      if (p.locked) return p;
      const isFirst = unlockedItems[0].token.address === p.token.address;
      return { ...p, weight: perItem + (isFirst ? remainder : 0) };
    }));
  };

  // ★重要: 親コンポーネントへのデータ送信（Integration）
  const handleDeploy = () => {
    const manualData: ManualData = {
      tokens: portfolio.map(p => ({
        symbol: p.token.symbol,
        weight: p.weight,
        mint: p.token.address
      })),
      name: strategyName,
      description: description || `Custom ${strategyType.toLowerCase()} strategy with ${portfolio.length} assets`,
      type: strategyType
    };
    
    onDeploySuccess(manualData);
  };

  // 検索フィルター
  const filteredTokens = useMemo(() => {
    if (!searchQuery) return allTokens.slice(0, 15);
    const lower = searchQuery.toLowerCase();
    return allTokens.filter(t => 
      t.symbol.toLowerCase().includes(lower) || 
      t.name.toLowerCase().includes(lower) ||
      t.address === searchQuery
    ).slice(0, 50);
  }, [allTokens, searchQuery]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4 text-white">
      
      {/* LEFT: Library (30%) - 変更なし */}
      <div className="w-full lg:w-[30%] bg-[#111] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* ... (検索・リスト部分は以前と同じ) ... */}
        <div className="p-4 border-b border-white/10 bg-[#161616]">
          <h3 className="text-xs font-bold text-white/50 mb-2 uppercase tracking-wider">Asset Library</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search Symbol or Mint"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
           {/* リスト描画 */}
           {filteredTokens.map(token => (
             <button
                key={token.address}
                onClick={() => addToken(token)}
                disabled={portfolio.some(p => p.token.address === token.address)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-left group"
              >
                <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{token.symbol}</div>
                  <div className="text-xs text-white/40 truncate">{token.name}</div>
                </div>
                <Plus className="w-4 h-4 text-white/20 group-hover:text-orange-500" />
              </button>
           ))}
        </div>
      </div>

      {/* CENTER: Builder (40%) - 戦略設定を追加 */}
      <div className="w-full lg:w-[40%] bg-[#111] rounded-2xl border border-white/10 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#161616] flex items-center justify-between z-10">
           {/* ... (Total Weight表示など) ... */}
           <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-white/50">Strategy Builder</span>
           </div>
           <div className={`font-mono font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-orange-400'}`}>
             {totalWeight}%
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-48"> 
           {/* ポートフォリオが空の場合 */}
           {portfolio.length === 0 && (
             <div className="text-center text-white/20 py-10">Select tokens to start</div>
           )}
           {/* アイテム描画 (スライダー等) - 以前と同じロジック */}
           {portfolio.map(item => (
             <div key={item.token.address} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <img src={item.token.logoURI} className="w-6 h-6 rounded-full" />
                   <span className="font-bold">{item.token.symbol}</span>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => toggleLock(item.token.address)} className="p-1 text-white/20 hover:text-white">
                     {item.locked ? <Lock size={14} /> : <Unlock size={14} />}
                   </button>
                   <button onClick={() => removeToken(item.token.address)} className="p-1 text-white/20 hover:text-red-400">
                     <Trash2 size={14} />
                   </button>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <input 
                   type="range" min="0" max="100" 
                   value={item.weight} 
                   onChange={e => updateWeight(item.token.address, Number(e.target.value))}
                   disabled={item.locked}
                   className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                 />
                 <span className="w-10 text-right font-mono text-sm">{item.weight}%</span>
               </div>
             </div>
           ))}
        </div>

        {/* Footer Settings Area (統合のキモ) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#161616]/95 backdrop-blur-sm z-20 space-y-3">
          
          {/* Strategy Details Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Name</label>
              <input 
                type="text" 
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 block mb-1">Risk Profile</label>
              <select 
                value={strategyType}
                onChange={(e: any) => setStrategyType(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="AGGRESSIVE">Aggressive (High Risk)</option>
                <option value="BALANCED">Balanced</option>
                <option value="CONSERVATIVE">Conservative</option>
              </select>
            </div>
          </div>

          <button
            disabled={totalWeight !== 100 || portfolio.length < 2}
            onClick={handleDeploy}
            className="w-full py-3 bg-white text-black font-bold rounded-xl disabled:opacity-50 hover:bg-orange-400 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Deploy Strategy
          </button>
        </div>
      </div>

      {/* RIGHT: Simulation (30%) */}
      <div className="w-full lg:w-[30%] flex flex-col gap-4">
        {/* 円グラフ */}
        <div className="bg-[#111] rounded-2xl border border-white/10 p-6 flex justify-center">
          <PizzaChart 
            slices={portfolio.map(p => ({ symbol: p.token.symbol, weight: p.weight, color: '#F97316' }))} 
            size={160} showLabels={false} 
          />
        </div>
        {/* バックテスト */}
        <div className="bg-[#111] rounded-2xl border border-white/10 p-4 flex-1">
          <h3 className="text-xs font-bold text-white/50 mb-4 uppercase">Simulation</h3>
          <BacktestChart data={[]} height={120} />
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-[10px] text-blue-300">
              This dashboard uses Mainnet data for simulation. Actual deployment will occur on Devnet with mock pricing.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};