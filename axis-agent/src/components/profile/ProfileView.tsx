import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Users, Copy, CheckCircle, PlusCircle, TrendingUp, Sparkles, Crown, Shield } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'; // 追加
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// 数字の省略表示 (1,200,000 -> 1.2M)
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
};

export const ProfileView = () => { // コンポーネント名はProfileViewのままでも、中身はLeaderboardViewとして機能します
  const { publicKey } = useWallet();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'ranking' | 'earn'>('ranking');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // データ取得
  useEffect(() => {
    // ウォレット未接続時はリーダーボードのフェッチのみ行う（ユーザー情報は取得しない）
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lbRes, userRes] = await Promise.all([
          api.getLeaderboard(),
          publicKey ? api.getUser(publicKey.toBase58()) : Promise.resolve({ user: null })
        ]);

        if (lbRes.success) {
          setLeaderboard(lbRes.leaderboard);
        }
        if (userRes && userRes.user) {
          setMyRank(userRes.user);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [publicKey]);

  // アクション: デイリーチェックイン
  const handleCheckIn = async () => {
    if (!publicKey) return;
    try {
      const res = await api.dailyCheckIn(publicKey.toBase58());
      if (res.success) {
        showToast("✅ +10 XP Claimed!", "success");
        setMyRank(res.user); // 自分のXP表示を更新
      } else {
        showToast(res.message || "Already checked in", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // アクション: 招待リンクコピー
  const handleCopyInvite = () => {
    if (!publicKey) return;
    const link = `${window.location.origin}/?ref=${publicKey.toBase58()}`;
    navigator.clipboard.writeText(link);
    showToast("Invite Link Copied!", "success");
  };

  // 自分の順位を計算
  const myIndex = leaderboard.findIndex(u => u.pubkey === publicKey?.toBase58());
  const myRankNumber = myIndex !== -1 ? myIndex + 1 : '-';

  // ★修正: ウォレット未接続時の表示を追加
  if (!publicKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center pt-4 px-4 pb-24 safe-area-top text-center">
        <div className="p-6 bg-[#D97706]/10 rounded-full mb-6 ring-1 ring-[#D97706]/30">
          <Trophy className="w-16 h-16 text-[#D97706]" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-white mb-3">Join the Leaderboard</h2>
        <p className="text-white/50 text-sm mb-8 max-w-xs leading-relaxed">
          Connect your wallet to compete for Season 0 Airdrop rewards and track your rankings.
        </p>
        
        {/* Wallet Adapter UI のスタイルを上書きして使用 */}
        <div className="wallet-adapter-button-trigger">
            <WalletMultiButton style={{ backgroundColor: '#D97706', borderRadius: '12px', fontWeight: 'bold' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col pt-4 px-4 pb-24 safe-area-top">
      
      {/* --- Header Area --- */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
          <Trophy className="text-[#D97706] fill-[#D97706]/20" />
          Leaderboard
        </h1>
        <p className="text-white/50 text-sm mt-1">Compete for Season 0 Airdrop</p>
      </div>

      {/* --- My Stats Card (Sticky-like prominent view) --- */}
      {publicKey && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-[#1C1917] to-black rounded-2xl p-6 mb-6 border border-[#D97706]/30 relative overflow-hidden shadow-2xl shadow-orange-900/10"
        >
          {/* Background Decor */}
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#D97706]/10 rounded-full blur-2xl" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[#D97706] text-xs font-bold tracking-widest uppercase mb-1">My Standing</p>
              <h2 className="text-4xl font-serif font-bold text-white mb-1">
                {myRank?.total_xp?.toLocaleString() || 0} <span className="text-lg text-white/40">XP</span>
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-[#D97706]/20 text-[#D97706] text-xs font-bold rounded flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {myRank?.rank_tier || 'Novice'}
                </span>
                <span className="text-sm font-mono text-white/60">
                  Rank #{myRankNumber}
                </span>
              </div>
            </div>
            
            {/* Rank Badge Visual */}
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-[#D97706]/10 border border-[#D97706]/30">
               <Crown className="w-8 h-8 text-[#D97706]" />
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Tab Switcher --- */}
      <div className="flex p-1 bg-white/5 rounded-xl mb-6 shrink-0 border border-white/5">
        <button 
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'ranking' ? 'bg-[#292524] text-white shadow-sm ring-1 ring-white/10' : 'text-[#78716C] hover:text-white'}`}
        >
          Top Ranking
        </button>
        <button 
          onClick={() => setActiveTab('earn')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'earn' ? 'bg-[#292524] text-white shadow-sm ring-1 ring-white/10' : 'text-[#78716C] hover:text-white'}`}
        >
          How to Earn
        </button>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 min-h-0">
        
        {/* TAB: RANKING */}
        {activeTab === 'ranking' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-3 pb-8"
          >
            {loading ? (
              <div className="flex justify-center py-10"><Sparkles className="animate-spin text-[#D97706]" /></div>
            ) : leaderboard.length === 0 ? (
               <div className="text-center text-white/30 py-10">No players found yet.</div>
            ) : (
              leaderboard.map((user, index) => {
                const isMe = user.pubkey === publicKey?.toBase58();
                const rank = index + 1;
                
                // Rank Styling
                let rankStyle = "bg-[#1C1917]/50 border-white/5";
                let rankIcon = <span className="text-[#78716C] font-mono font-bold w-6 text-center">{rank}</span>;
                
                if (rank === 1) {
                   rankStyle = "bg-gradient-to-r from-yellow-900/20 to-[#1C1917] border-yellow-500/30";
                   rankIcon = <Medal className="w-6 h-6 text-yellow-500" />;
                } else if (rank === 2) {
                   rankStyle = "bg-gradient-to-r from-gray-800/20 to-[#1C1917] border-gray-400/30";
                   rankIcon = <Medal className="w-6 h-6 text-gray-400" />;
                } else if (rank === 3) {
                   rankStyle = "bg-gradient-to-r from-orange-900/20 to-[#1C1917] border-orange-700/30";
                   rankIcon = <Medal className="w-6 h-6 text-orange-700" />;
                }
                
                if (isMe) rankStyle += " ring-1 ring-[#D97706] bg-[#D97706]/5";

                return (
                  <div key={user.pubkey} className={`flex items-center gap-4 p-4 rounded-xl border ${rankStyle}`}>
                    <div className="shrink-0">{rankIcon}</div>
                    
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 overflow-hidden shrink-0">
                       {user.avatar_url ? (
                         <img src={api.getProxyUrl(user.avatar_url)} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs text-white/30 font-bold">
                           {user.pubkey.slice(0, 2)}
                         </div>
                       )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isMe ? 'text-[#D97706]' : 'text-white'}`}>
                        {user.username || `${user.pubkey.slice(0, 4)}...${user.pubkey.slice(-4)}`}
                      </p>
                      <p className="text-xs text-white/40">{user.rank_tier}</p>
                    </div>

                    <div className="text-right">
                       <p className="font-mono font-bold text-white">{formatNumber(user.total_xp)}</p>
                       <p className="text-[10px] text-[#D97706]">XP</p>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* TAB: EARN (Quests) */}
        {activeTab === 'earn' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-4 pb-8"
          >
            {/* Quest 1: Login */}
            <div className="bg-[#1C1917] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <CheckCircle className="w-24 h-24" />
               </div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                       <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                         <CheckCircle className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="font-bold text-white">Daily Check-in</h3>
                         <p className="text-sm text-[#78716C]">Log in to Axis every 24 hours.</p>
                       </div>
                    </div>
                    <span className="bg-[#D97706] text-black text-xs font-bold px-2 py-1 rounded">+10 XP</span>
                 </div>
                 <button 
                   onClick={handleCheckIn}
                   className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold rounded-xl transition-all active:scale-95"
                 >
                   Claim Daily XP
                 </button>
               </div>
            </div>

            {/* Quest 2: Referral */}
            <div className="bg-[#1C1917] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Users className="w-24 h-24" />
               </div>
               <div className="relative z-10">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                       <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                         <Users className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="font-bold text-white">Invite Friends</h3>
                         <p className="text-sm text-[#78716C]">Earn 10% of their rewards forever.</p>
                       </div>
                    </div>
                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold px-2 py-1 rounded">10% Commission</span>
                 </div>
                 <button 
                   onClick={handleCopyInvite}
                   className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                   <Copy className="w-4 h-4" /> Copy Invite Link
                 </button>
               </div>
            </div>

            {/* Quest 3: Create Strategy */}
            <div className="bg-[#1C1917]/50 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                 <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                       <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                         <PlusCircle className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="font-bold text-white">Create Strategy</h3>
                         <p className="text-sm text-[#78716C]">Deploy a new index fund.</p>
                       </div>
                    </div>
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold px-2 py-1 rounded">+500 XP</span>
                 </div>
            </div>

            {/* Quest 4: Holding */}
            <div className="bg-[#1C1917]/50 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                 <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                       <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                         <TrendingUp className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="font-bold text-white">Hold Assets (Auto)</h3>
                         <p className="text-sm text-[#78716C]">Earn 1 XP per $1 held daily.</p>
                       </div>
                    </div>
                    <span className="bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/30 text-xs font-bold px-2 py-1 rounded">Auto</span>
                 </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
};