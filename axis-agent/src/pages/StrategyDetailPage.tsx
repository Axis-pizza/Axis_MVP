import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Users, ArrowDownLeft, Shuffle, Save } from 'lucide-react';
import { PizzaChart } from '../components/common/PizzaChart'; // パスは適宜調整してください
import { api } from '../services/api'; // APIサービス（仮定）

// モーダルで使っていた詳細表示ロジックをここに移植
export const StrategyDetailPage = () => {
  const { id } = useParams<{ id: string }>(); // URLからIDを取得
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState<any>(null); // 型は StrategyDetail を使用
  const [view, setView] = useState<'INFO' | 'DEPOSIT' | 'REBALANCE'>('INFO');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // IDに基づいてデータを取得するロジック
    // ※ ここで api.getStrategy(id) のようにデータを取ってくる必要があります
    const fetchStrategy = async () => {
      setLoading(true);
      try {
        // デモ用: APIがない場合はここでモックデータをセット
        // const data = await api.getStrategy(id); 
        // setStrategy(data);
        
        // 仮のデータセット（実際はAPIから取得）
        setStrategy({
          id: id,
          name: 'High Yield Alpha',
          type: 'AGGRESSIVE',
          tvl: 1250.5,
          description: 'Maximizing returns through leveraged yield farming on Solana.',
          tokens: [
            { symbol: 'SOL', weight: 40 },
            { symbol: 'JUP', weight: 30 },
            { symbol: 'BONK', weight: 30 }
          ],
          ownerPubkey: 'dummy...',
          address: id
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchStrategy();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#D97706]">Loading...</div>;
  if (!strategy) return <div className="min-h-screen flex items-center justify-center">Strategy not found</div>;

  // 以下、StrategyDetailModalの中身（レンダリング部分）を、
  // モーダルの枠（fixed inset-0...）を取り払って配置します
  return (
    <div className="min-h-screen bg-[#0C0A09] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0C0A09]/80 backdrop-blur-md border-b border-[#D97706]/10 p-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-[#D97706]/10 rounded-full text-[#A8A29E] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-serif font-bold text-[#E7E5E4]">{strategy.name}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-8">
        {/* Pizza Chart Area */}
        <div className="flex justify-center py-6 scale-110">
          <PizzaChart slices={strategy.tokens} size={220} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-px bg-[#D97706]/20 rounded-xl overflow-hidden border border-[#D97706]/10">
          <div className="bg-[#0C0A09] p-5 text-center">
            <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">TVL</p>
            <p className="text-xl font-serif font-bold text-[#E7E5E4]">
              {strategy.tvl} <span className="text-sm text-[#78716C]">SOL</span>
            </p>
          </div>
          <div className="bg-[#0C0A09] p-5 text-center">
            <p className="text-[10px] text-[#78716C] uppercase tracking-widest mb-1">APR</p>
            <p className="text-xl font-serif font-bold text-[#D97706]">+12.5%</p>
          </div>
        </div>

        {/* Description */}
        <div className="p-5 bg-[#1C1917] rounded-xl border border-[#D97706]/10">
          <h3 className="text-xs font-bold text-[#D97706] uppercase tracking-widest mb-2">Strategy Thesis</h3>
          <p className="text-sm text-[#A8A29E] font-serif italic leading-relaxed">
            "{strategy.description}"
          </p>
        </div>

        {/* Composition List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#78716C] uppercase tracking-widest">Asset Allocation</h3>
          {strategy.tokens.map((token: any) => (
            <div key={token.symbol} className="flex items-center justify-between p-4 bg-[#1C1917] border border-[#D97706]/5 rounded-lg">
              <span className="font-serif font-bold text-[#E7E5E4]">{token.symbol}</span>
              <span className="text-sm font-mono text-[#D97706]">{token.weight}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Actions (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0C0A09] border-t border-[#D97706]/10 safe-area-bottom">
        <div className="max-w-md mx-auto flex gap-4">
           <button 
             className="flex-1 py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-black rounded-xl font-serif font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
           >
             <ArrowDownLeft className="w-5 h-5" />
             Invest
           </button>
        </div>
      </div>
    </div>
  );
};