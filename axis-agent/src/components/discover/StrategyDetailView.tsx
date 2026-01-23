import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowLeft, Copy, Star, Download, ExternalLink,
  TrendingUp, TrendingDown, Layers, Info, Check, X, 
  Activity, Sparkles, ChevronRight, PieChart
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RichChart } from '../common/RichChart'; // ★作成したRichChartをインポート
import { api } from '../../services/api';
import { deposit, getStrategyInfo } from '../../services/kagemusha';
import type { Strategy } from '../../types';

// --- Types ---

interface StrategyDetailViewProps {
  initialData: Strategy;
  onBack: () => void;
}

type Timeframe = '1D' | '1W' | '1M' | 'ALL';
type AssetType = 'SOL' | 'USDC';

// --- Components ---

// 1. InvestSheet (以前のコードを内包してエラーを防ぎます)
interface InvestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: Strategy;
  balance: number;
}

const InvestSheet = ({ isOpen, onClose, strategy, balance }: InvestSheetProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState('0');
  const [asset, setAsset] = useState<AssetType>('SOL');
  const [status, setStatus] = useState<'IDLE' | 'SIGNING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const handleNum = (num: string) => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    if (amount === '0' && num !== '.') setAmount(num);
    else if (amount.includes('.') && num === '.') return;
    else if (amount.length < 10) setAmount(prev => prev + num);
  };
  
  const handleBackspace = () => {
    if (status !== 'IDLE' && status !== 'ERROR') return;
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const executeDeposit = async () => {
    if (!strategy || !wallet.publicKey) return;
    setStatus('SIGNING');
    try {
      if (asset === 'USDC') {
        alert("USDC deposits are currently in beta. Switched to SOL.");
        setAsset('SOL');
        setStatus('IDLE');
        return;
      }
      
      await deposit(connection, wallet, new PublicKey(strategy.id), parseFloat(amount));
      setStatus('SUCCESS');
      
      setTimeout(() => { 
        onClose(); 
        setStatus('IDLE'); 
        setAmount('0'); 
      }, 2000);
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1C1917] border-t border-[#D97706]/20 rounded-t-3xl z-50 overflow-hidden flex flex-col safe-area-bottom"
          >
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-12 h-1.5 bg-[#57534E] rounded-full" />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-serif font-bold text-xl text-[#E7E5E4]">Buy {strategy.ticker || strategy.name}</h3>
                 <div className="bg-[#0C0A09] rounded-lg p-1 flex items-center border border-[#D97706]/20">
                    {(['SOL', 'USDC'] as AssetType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setAsset(t)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          asset === t ? 'bg-[#D97706] text-[#0C0A09]' : 'text-[#78716C]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="text-center py-4 mb-4">
                 <div className="flex items-baseline justify-center gap-2">
                   <span className="text-5xl font-serif font-bold text-[#E7E5E4]">{amount}</span>
                   <span className="text-xl text-[#D97706] font-bold">{asset}</span>
                 </div>
                 <p className="text-xs text-[#78716C] mt-2 font-serif">
                   Balance: {balance.toFixed(4)} {asset}
                 </p>
              </div>

              <div className="flex gap-3 mb-6">
                 {[0.5, 1, 5].map(val => (
                   <button 
                     key={val} 
                     onClick={() => setAmount(val.toString())}
                     className="flex-1 py-2 bg-[#292524] rounded-lg text-xs font-bold text-[#D97706] border border-[#D97706]/10 active:scale-95 transition-transform"
                   >
                     {val} {asset}
                   </button>
                 ))}
                 <button 
                   onClick={() => setAmount((balance * 0.95).toFixed(4))}
                   className="flex-1 py-2 bg-[#D97706]/10 rounded-lg text-xs font-bold text-[#D97706] border border-[#D97706]/30 active:scale-95 transition-transform"
                 >
                   Max
                 </button>
              </div>

              <div className="grid grid-cols-3 gap-px bg-[#292524] rounded-xl overflow-hidden border border-[#D97706]/10 mb-6 shadow-2xl">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'del'].map((key) => (
                  <button
                    key={key}
                    onClick={() => key === 'del' ? handleBackspace() : handleNum(key.toString())}
                    className="bg-[#1C1917] h-16 text-xl font-medium text-[#E7E5E4] active:bg-[#292524] flex items-center justify-center transition-colors"
                    disabled={status !== 'IDLE' && status !== 'ERROR'}
                  >
                    {key === 'del' ? <ArrowLeft className="w-5 h-5" /> : key}
                  </button>
                ))}
              </div>

              <button 
                onClick={executeDeposit}
                disabled={status !== 'IDLE' && status !== 'ERROR' || parseFloat(amount) <= 0}
                className={`w-full py-4 rounded-xl font-serif font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  status === 'SUCCESS' 
                    ? 'bg-green-500 text-white' 
                    : status === 'ERROR' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gradient-to-r from-[#D97706] to-[#B45309] text-[#0C0A09] hover:scale-[1.01]'
                }`}
              >
                {status === 'IDLE' && 'Confirm Investment'}
                {status === 'SIGNING' && <><Sparkles className="w-4 h-4 animate-spin" /> Signing...</>}
                {status === 'CONFIRMING' && <><Activity className="w-4 h-4 animate-pulse" /> Confirming...</>}
                {status === 'SUCCESS' && <><Check className="w-5 h-5" /> Done!</>}
                {status === 'ERROR' && <><X className="w-5 h-5" /> Failed</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};


// 2. Main View
export const StrategyDetailView = ({ initialData, onBack }: StrategyDetailViewProps) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  // --- State ---
  const [strategy, setStrategy] = useState(initialData);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line'); // Line/Candle切り替え
  const [timeframe, setTimeframe] = useState('7d');
  
  const [tokensInfo, setTokensInfo] = useState<any[]>([]); // ロゴ付きトークン情報
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isInvestOpen, setIsInvestOpen] = useState(false);
  const [balance, setBalance] = useState(0);

  const handleShareToX = () => {
    const text = `Check out ${strategy.name} ($${strategy.ticker}) on Axis! 🚀`;
    const url = window.location.href; // 現在のURL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  // --- Computed ---
  // チャートデータから「現在価格」と「変動率」を計算
  const latestValue = useMemo(() => {
    if (!chartData.length) return strategy.price || 100;
    const last = chartData[chartData.length - 1];
    // Candleの場合はclose, Lineの場合はvalue
    return typeof last.close === 'number' ? last.close : last.value;
  }, [chartData, strategy.price]);

  const changePct = useMemo(() => {
    if (chartData.length < 2) return 0;
    const start = typeof chartData[0].close === 'number' ? chartData[0].open : chartData[0].value;
    return ((latestValue - start) / start) * 100;
  }, [chartData, latestValue]);

  const isPositive = changePct >= 0;

  // --- Effects ---

  // 1. Initial Data Load (Balance, Watchlist, Tokens)
  useEffect(() => {
    const init = async () => {
      // Balance
      if (wallet.publicKey) {
        try {
          const bal = await connection.getBalance(wallet.publicKey);
          setBalance(bal / LAMPORTS_PER_SOL);
          
          // Watchlist Status from DB
          const wRes = await api.checkWatchlist(strategy.id, wallet.publicKey.toBase58());
          setIsWatchlisted(wRes.isWatchlisted);
        } catch (e) { console.error("Init Error", e); }
      }

      // Token Logos (Holdings)
      try {
        // バックエンドのキャッシュから全トークン情報を取得
        const tokenRes = await api.getTokens();
        if (tokenRes.success) {
          // 戦略の構成トークンとマージ
          const enriched = strategy.tokens.map((t: any) => {
            const meta = tokenRes.tokens.find((m: any) => m.symbol === t.symbol.toUpperCase());
            return { 
              ...t, 
              logoURI: meta?.logoURI, 
              name: meta?.name || t.symbol 
            };
          });
          setTokensInfo(enriched);
        } else {
            setTokensInfo(strategy.tokens); // フォールバック
        }
      } catch (e) {
          setTokensInfo(strategy.tokens);
      }
    };
    init();
  }, [strategy.id, wallet.publicKey]);

  // 2. Chart Data Load (Reloads on timeframe/type change)
  useEffect(() => {
    const loadChart = async () => {
      console.log(`📊 Fetching Chart: ${timeframe} / ${chartType}`);
      try {
        const res = await api.getStrategyChart(strategy.id, timeframe, chartType);
        if (res.success && res.data) {
          setChartData(res.data);
        }
      } catch (e) {
        console.error("Chart Fetch Error", e);
      }
    };
    loadChart();
  }, [strategy.id, timeframe, chartType]);

  // --- Actions ---

  const handleToggleWatchlist = async () => {
    if (!wallet.publicKey) return;
    // Optimistic Update
    setIsWatchlisted(!isWatchlisted);
    try {
      const res = await api.toggleWatchlist(strategy.id, wallet.publicKey.toBase58());
      if (!res.success) setIsWatchlisted(!isWatchlisted); // Revert on fail
    } catch {
      setIsWatchlisted(!isWatchlisted);
    }
  };

  const handleCopyCA = () => {
    navigator.clipboard.writeText(strategy.id);
    // TODO: Show Toast
  };

  return (
    <div className="min-h-screen bg-black text-[#E7E5E4] pb-32 font-sans selection:bg-[#D97706]/30">
      
      {/* 1. Navbar (Sticky) */}
      <motion.div 
        className="fixed top-0 inset-x-0 h-14 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-between px-4 border-b border-white/5 safe-area-top"
      >
        <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <motion.div style={{ opacity: headerOpacity }} className="font-bold font-serif text-sm tracking-wider text-center">
          {strategy.ticker || 'STRATEGY'}
          <div className={`text-[10px] ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
             ${latestValue.toFixed(2)}
          </div>
        </motion.div>

        <div className="flex gap-1">
          <button onClick={handleToggleWatchlist} className="p-2 text-white/70 hover:text-yellow-400 transition-colors">
            <Star className={`w-5 h-5 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </button>
          <button 
            onClick={handleShareToX}
            className="p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Share on X"
          >
            {/* X (Twitter) Logo SVG */}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </button>
        </div>
      </motion.div>

      <div className="pt-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* 2. Header Section (Jupiter Style) */}
        <div className="mb-6">
           <div className="flex items-center gap-2 mb-1">
             <h1 className="text-3xl font-bold tracking-tight font-serif">{strategy.name}</h1>
           </div>
           
           <div className="flex items-baseline gap-3">
             <span className="text-4xl font-serif font-bold tracking-tighter text-white">
               ${latestValue.toFixed(2)}
             </span>
             <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
               {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
               {Math.abs(changePct).toFixed(2)}%
             </div>
           </div>

           {/* Address Copy Pill */}
           <button 
             onClick={handleCopyCA}
             className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#1C1917] hover:bg-[#292524] rounded-full border border-white/10 active:scale-95 transition-all w-fit group"
           >
             <span className="text-[10px] text-[#78716C] font-serif group-hover:text-white transition-colors">CA:</span>
             <span className="text-xs font-serif text-[#A8A29E] group-hover:text-white transition-colors">
                {strategy.id.slice(0, 4)}...{strategy.id.slice(-4)}
             </span>
             <Copy className="w-3 h-3 text-[#57534E] group-hover:text-white transition-colors" />
           </button>
        </div>

        {/* 3. Rich Chart Section */}
        <div className="mb-8 -mx-4 relative">
          {/* Chart Component */}
          <RichChart 
            data={chartData} 
            type={chartType} 
            isPositive={isPositive} 
            onTypeChange={setChartType} 
          />
          
          {/* Timeframe Selector */}
          <div className="flex justify-between px-6 mt-4 border-b border-white/5 pb-4">
            {['1D', '1W', '1M', 'ALL'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf === '1W' ? '7d' : tf === 'ALL' ? '30d' : tf.toLowerCase())}
                className={`text-[10px] font-bold py-1 px-4 rounded-full transition-all border ${
                  (timeframe === '7d' && tf === '1W') || timeframe === tf.toLowerCase() 
                    ? 'bg-[#E7E5E4] text-black border-[#E7E5E4]' 
                    : 'text-[#78716C] border-transparent hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
           <div className="p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col justify-between h-24">
             <div className="flex items-center gap-2 text-[#78716C]">
               <Layers className="w-3 h-3" />
               <span className="text-[10px] uppercase font-bold tracking-wider">TVL</span>
             </div>
             <p className="text-xl font-serif font-bold text-white">
                {typeof strategy.tvl === 'number' ? strategy.tvl.toFixed(2) : '0.00'} <span className="text-sm text-[#57534E]">SOL</span>
             </p>
           </div>

           {/* ★ここを修正: ROI (動的表示) */}
           <div className="p-4 bg-[#1C1917] rounded-2xl border border-white/5 flex flex-col justify-between h-24">
             <div className="flex items-center gap-2 text-[#78716C]">
               <Activity className="w-3 h-3" />
               {/* 文言を APY (Proj.) から ROI に変更 */}
               <span className="text-[10px] uppercase font-bold tracking-wider">ROI</span>
             </div>
             {/* changePct (チャートの変動率) を表示。プラスなら金色、マイナスなら赤色 */}
             <p className={`text-xl font-serif font-bold ${changePct >= 0 ? 'text-[#D97706]' : 'text-red-500'}`}>
                {changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%
             </p>
           </div>
        </div>

        {/* 5. Holdings List */}
        <div className="mb-32">
          <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-[#E7E5E4]">
            <PieChart className="w-5 h-5 text-[#D97706]" /> Composition
          </h3>
          <div className="space-y-3">
            {tokensInfo.length > 0 ? tokensInfo.map((token, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 bg-[#1C1917] hover:bg-[#292524] rounded-2xl border border-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Token Logo */}
                  <div className="relative">
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-10 h-10 rounded-full bg-black object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center font-bold text-xs text-[#D97706] border border-[#D97706]/20">
                        {token.symbol[0]}
                      </div>
                    )}
                    {/* Chain Badge (Mock) */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black flex items-center justify-center border border-white/10">
                       <img src="https://assets.coingecko.com/coins/images/4128/small/solana.png" className="w-3 h-3" alt="SOL" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-white">{token.symbol}</h4>
                    <p className="text-xs text-[#78716C] max-w-[120px] truncate">{token.name || 'Unknown'}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-serif font-bold text-[#D97706] text-lg">{token.weight}%</p>
                  <p className="text-[10px] text-[#57534E] uppercase tracking-wide">Allocation</p>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 text-[#57534E]">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>Loading composition...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Action Bar (Fixed Bottom) */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-40 safe-area-bottom">
        <div className="max-w-md mx-auto flex gap-3">
             <div className="flex-1 bg-[#1C1917] rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                <span className="text-[9px] text-[#78716C] uppercase tracking-wide">My Position</span>
                <span className="font-serif font-bold text-[#E7E5E4] text-sm">$0.00</span>
             </div>
            <button 
              onClick={() => setIsInvestOpen(true)}
              className="flex-[2] py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(217,119,6,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2 hover:brightness-110"
            >
              Invest <ChevronRight className="w-5 h-5 opacity-70" />
            </button>
        </div>
      </div>

      {/* 7. Modals */}
      <InvestSheet 
        isOpen={isInvestOpen}
        onClose={() => setIsInvestOpen(false)}
        strategy={strategy}
        balance={balance}
      />
    </div>
  );
};