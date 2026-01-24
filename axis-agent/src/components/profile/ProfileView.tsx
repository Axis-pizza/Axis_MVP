import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Shield, Eye, EyeOff, Download, 
  ArrowUpRight, ArrowDownRight, Wallet, ArrowLeft, TrendingUp, TrendingDown,
  Crown, Sparkles, CheckCircle, Copy, Users, Zap
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import html2canvas from 'html2canvas';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// --- Assets (Fixed Background) ---
const FIXED_BG_STYLE = {
  background: 'radial-gradient(circle at top right, #451a03 0%, #000000 80%)'
};

// --- Helper Functions ---
const formatCurrency = (val: number, currency: 'USD' | 'SOL') => {
  if (currency === 'SOL') {
      return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;
  }
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPnL = (percent: number) => {
  const isPositive = percent >= 0;
  return {
    valueStr: `${isPositive ? '+' : ''}${percent.toFixed(2)}%`,
    colorHex: isPositive ? '#4ADE80' : '#F87171',
    bgHex: isPositive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
    color: isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]', 
    bg: isPositive ? 'bg-[#4ADE80]/10' : 'bg-[#F87171]/10',
    label: isPositive ? 'PROFIT' : 'LOSS',
    icon: isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />
  };
};

const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

export const ProfileView = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { showToast } = useToast();
  
  const cardRef = useRef<HTMLDivElement>(null); 
  const captureRef = useRef<HTMLDivElement>(null); 
  
  // State
  const [viewMode, setViewMode] = useState<'portfolio' | 'leaderboard'>('portfolio');
  const [activeTab, setActiveTab] = useState<'positions' | 'activity'>('positions');
  const [positionSubTab, setPositionSubTab] = useState<'created' | 'invested'>('created');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'SOL'>('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Balance
  const [solBalance, setSolBalance] = useState<number>(0); 
  const [investedAmountUSD, setInvestedAmountUSD] = useState<number>(0); 

  // Data
  const [userData, setUserData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myStrategies, setMyStrategies] = useState<any[]>([]);
  const [investedStrategies, setInvestedStrategies] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<{ total_xp?: number; rank_tier?: string; username?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  // PnL (Mock Logic for Demo)
  const [pnlPercent, setPnlPercent] = useState<number>(12.49);

  // Fetch Data
  useEffect(() => {
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
        
        // 修正箇所: 'success' in userRes を使ってプロパティの存在を確認する
        if (userRes && 'success' in userRes && userRes.success && userRes.user) {
          setMyRank(prev => ({
            ...(prev || {}),
            ...userRes.user,
            username: userRes.user.username || 'Anonymous'
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [publicKey]);

  // Balance
  useEffect(() => {
      if (!publicKey || !connection) return;
      const getBalance = async () => {
          try {
              const lamports = await connection.getBalance(publicKey);
              setSolBalance(lamports / LAMPORTS_PER_SOL);
          } catch (e) { console.error(e); }
      };
      getBalance();
      const id = setInterval(getBalance, 20000);
      return () => clearInterval(id);
  }, [publicKey, connection]);

  // Calculations
  const walletBalanceUSD = solBalance * (solPrice || 0);
  const totalNetWorthUSD = walletBalanceUSD + investedAmountUSD;
  const totalNetWorthSOL = (solPrice > 0) ? totalNetWorthUSD / solPrice : 0;
  const displayValue = currencyMode === 'USD' ? totalNetWorthUSD : totalNetWorthSOL;
  const isPositive = pnlPercent >= 0; 
  const pnlInfo = formatPnL(pnlPercent);
  

  // Actions
  const handleDownloadCard = async () => {
    if (!captureRef.current) return;
    showToast("Generating PnL card...", "info");
    
    // 一時的に表示 (画面外)
    captureRef.current.style.display = 'block';

    try {
        const canvas = await html2canvas(captureRef.current, {
            backgroundColor: '#000000', 
            scale: 2, 
            useCORS: true, 
            logging: false,
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `axis-pnl.png`;
        link.click();
        showToast("Saved!", "success");
    } catch (e) {
        console.error("Capture failed", e);
        showToast("Capture failed", "error");
    } finally {
        captureRef.current.style.display = 'none';
    }
  };

  if (!publicKey) return <div className="p-10 text-center text-white">Connect Wallet</div>;
  if (viewMode === 'leaderboard') return <LeaderboardScreen leaderboard={leaderboard} userData={userData} onBack={() => setViewMode('portfolio')} publicKey={publicKey} />;

  return (
    <div className="max-w-md mx-auto h-full flex flex-col pt-4 px-4 pb-24 safe-area-top relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h1 className="text-2xl font-serif font-bold text-white">Portfolio</h1>
        <button 
            onClick={() => setViewMode('leaderboard')}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1C1917] border border-[#D97706]/30 rounded-full text-[#D97706] text-xs font-bold"
        >
            <Trophy className="w-4 h-4" /> Rank
        </button>
      </div>

      {/* --- Main Card (Display UI: Rich Info) --- */}
      <div className="mb-8 relative group perspective-1000">
        <div ref={cardRef} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0C0A09] shadow-2xl" style={{ aspectRatio: '1.58/1' }}>
            {/* Background */}
            <div className="absolute inset-0 z-0" style={FIXED_BG_STYLE} />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
            
            {/* Content Layer */}
            <div className="relative z-10 h-full p-6 flex flex-col justify-between bg-black/10 backdrop-blur-[1px]">
                 {/* Top: Address & Controls */}
                 <div className="flex justify-between">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                        <Wallet className="w-3 h-3 text-[#D97706]" />
                        {/* Address: Times New Roman */}
                        <span className="font-bold text-white text-sm" style={{ fontFamily: '"Times New Roman", serif' }}>
                            {formatAddress(publicKey.toBase58())}
                        </span>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setCurrencyMode(m => m === 'USD' ? 'SOL' : 'USD')} className="text-[10px] font-bold bg-black/40 px-2 py-1 rounded text-white/70 border border-white/10">{currencyMode}</button>
                         <button onClick={() => setIsHidden(!isHidden)} className="text-white/50">{isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                 </div>

                 {/* Center: Net Worth (Rich) */}
                 <div className="py-2">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Total Net Worth</p>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight" style={{ fontFamily: '"Times New Roman", serif' }}>
                        {isHidden ? '••••••' : formatCurrency(displayValue, currencyMode)}
                    </h2>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 border border-white/10 ${pnlInfo.bg} ${pnlInfo.color}`}>
                        {!isHidden && pnlInfo.icon}
                        <span className="font-mono">{isHidden ? '••••' : pnlInfo.valueStr}</span>
                    </div>
                 </div>

                 {/* Bottom: Rank & XP */}
                 <div className="flex justify-between items-end">
                    <div className="flex gap-4">
                        <div><p className="text-[10px] text-white/40 uppercase font-bold mb-0.5">Rank</p><p className="text-sm text-white font-bold flex gap-1"><Shield className="w-3 h-3 text-[#D97706]" />{userData?.rank_tier || 'Novice'}</p></div>
                        <div><p className="text-[10px] text-white/40 uppercase font-bold mb-0.5">XP</p><p className="text-sm text-[#D97706] font-bold font-mono">{userData?.total_xp?.toLocaleString() || 0}</p></div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end mt-3">
            <button onClick={handleDownloadCard} className="flex items-center gap-2 px-6 py-2 bg-[#D97706] text-black border border-[#D97706]/50 rounded-xl text-sm font-bold transition-all active:scale-95 hover:bg-[#b46305]">
                <Download className="w-4 h-4" /> Save PnL
            </button>
        </div>
      </div>

      {/* --- HIDDEN CAPTURE CARD (Simple PnL Only) --- */}
      {/* --- HIDDEN CAPTURE CARD (Formula-like vertical breakdown + Right PnL, X 1200x630) --- */}
<div
  ref={captureRef}
  style={{
    position: 'fixed',
    left: '-9999px',
    top: 0,
    width: '1200px',
    height: '630px',
    display: 'none',
    background: '#000000',
    fontFamily: '"Times New Roman", serif',
  }}
>
  {/* Background */}
  <div
    style={{
      position: 'absolute',
      inset: 0,
      ...FIXED_BG_STYLE,
      zIndex: 0,
    }}
  />

  {/* Soft orange glows */}
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(circle at 18% 25%, rgba(217,119,6,0.18) 0%, rgba(0,0,0,0) 45%), radial-gradient(circle at 78% 78%, rgba(217,119,6,0.12) 0%, rgba(0,0,0,0) 55%)',
      zIndex: 1,
    }}
  />

  {/* Noise */}
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: "url('/noise.png')",
      opacity: 0.08,
      mixBlendMode: 'overlay',
      zIndex: 2,
    }}
  />

  {/* Content */}
  <div
    style={{
      position: 'relative',
      zIndex: 3,
      width: '100%',
      height: '100%',
      padding: '54px',
      color: 'white',
      fontFamily: '"Times New Roman", serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          Axis
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          PORTFOLIO SNAPSHOT
        </div>
      </div>

      {/* 右上は空（Wallet/Dateなど消す） */}
      <div />
    </div>

    {/* Middle Area */}
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 40,
        marginTop: 10,
      }}
    >
      {/* LEFT: Formula-like Breakdown */}
      <div style={{ width: '520px' }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 18,
          }}
        >
          BREAKDOWN
        </div>

        <div
          style={{
            borderRadius: 22,
            background: 'rgba(0,0,0,0.30)',
            border: '1px solid rgba(255,255,255,0.10)',
            padding: '22px 22px',
          }}
        >
          {/* Row: Invested */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '0.10em',
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              INVESTED
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.92)' }}>
              {isHidden ? '••••' : formatCurrency(investedAmountUSD, 'USD')}
            </div>
          </div>

          {/* + */}
          <div
            style={{
              margin: '12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'rgba(255,255,255,0.30)',
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            <div style={{ width: 28, textAlign: 'center' }}>+</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Row: Wallet Balance */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '0.10em',
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              WALLET BAL
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.92)' }}>
              {isHidden ? '••••' : formatCurrency(walletBalanceUSD, 'USD')}
            </div>
          </div>

          {/* = */}
          <div
            style={{
              margin: '16px 0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'rgba(255,255,255,0.30)',
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            <div style={{ width: 28, textAlign: 'center' }}>=</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }} />
          </div>

          {/* Row: Position */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '0.10em',
                color: 'rgba(255,255,255,0.58)',
              }}
            >
              POSITION
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.98)',
                letterSpacing: '-0.01em',
              }}
            >
              {isHidden ? '••••' : formatCurrency(totalNetWorthUSD, 'USD')}
            </div>
          </div>

          {/* small note */}
          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              color: 'rgba(255,255,255,0.40)',
              fontWeight: 700,
            }}
          >
            Total Net Worth = Invested + Wallet Balance
          </div>
        </div>
      </div>

      {/* RIGHT: PnL Big, Right aligned */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          textAlign: 'right',
        }}
      >
        <div style={{ width: '100%' }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 10,
            }}
          >
            {pnlInfo.label}
          </div>

          <div
            style={{
              fontSize: 150,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: pnlInfo.colorHex,
              textShadow: '0 18px 60px rgba(0,0,0,0.55)',
            }}
          >
            {isHidden ? '••••' : pnlInfo.valueStr}
          </div>

        </div>
      </div>
    </div>

    {/* Footer line (subtle) */}
    <div
      style={{
        height: 1,
        background: 'rgba(255,255,255,0.08)',
        marginTop: 10,
      }}
    />
  </div>
</div>


      {/* Tabs Placeholder */}
      <div className="flex border-b border-white/10 mb-4 sticky top-0 bg-[#0C0A09] z-20 pt-2">
         <button className="flex-1 pb-3 text-white font-bold border-b-2 border-[#D97706]">Positions</button>
         <button className="flex-1 pb-3 text-white/40 font-bold">Activity</button>
      </div>
      <div className="space-y-4 pb-20">
          <div className="bg-[#1C1917] p-4 rounded-xl border border-white/5"><p className="text-white">Solana High Yield</p><p className="text-white/50 text-xs">$1,500.00</p></div>
      </div>
    </div>
  );
};

// --- Leaderboard Sub-Screen (Refined) ---
// --- Leaderboard Sub-Screen (Fix: Empty State Handling) ---
const LeaderboardScreen = ({ leaderboard, userData, onBack, publicKey }: any) => {
  // データが配列かどうかのチェックと、空の場合のデフォルト値
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  
  // 自分のランクを探す
  const myRankIndex = safeLeaderboard.findIndex((u: any) => u.pubkey === publicKey?.toBase58());
  const myRankNumber = myRankIndex !== -1 ? myRankIndex + 1 : '-';
  
  // 自分のPnL (DBになければ0)
  const myPnL = userData?.pnl_percent || 0;
  const isMyPnLPos = myPnL >= 0;

  // Helper
  const shortAddr = (addr: string) => addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : 'Unknown';

  return (
      <div className="h-full flex flex-col pt-4 px-4 bg-black safe-area-top">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                  <ArrowLeft className="w-5 h-5"/>
              </button>
              <div>
                  <h1 className="text-2xl font-serif font-bold text-white">Leaderboard</h1>
                  <p className="text-xs text-white/40">Top Performers</p>
              </div>
          </div>

          {/* My Rank (Sticky) */}
          <div className="bg-[#1C1917] rounded-xl p-4 mb-4 border border-[#D97706]/30 flex items-center justify-between shadow-lg shadow-orange-900/10 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D97706]/20 flex items-center justify-center text-[#D97706] border border-[#D97706]/30 shrink-0">
                      <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                      <p className="text-[#D97706] text-[10px] font-bold uppercase">My Rank</p>
                      <p className="text-xl font-bold text-white font-mono">#{myRankNumber}</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className={`text-lg font-bold font-mono ${isMyPnLPos ? 'text-[#4ADE80]' : 'text-[#F87171]'}`} style={{ fontFamily: '"Times New Roman", serif' }}>
                      {isMyPnLPos ? '+' : ''}{Number(myPnL).toFixed(2)}%
                  </p>
                  <p className="text-xs text-white/40">My PnL</p>
              </div>
          </div>

          {/* Header Row */}
          <div className="flex items-center px-4 pb-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
              <div className="w-8 text-center">#</div>
              <div className="flex-1 pl-2">Trader</div>
              <div className="w-20 text-right">PnL</div>
              <div className="w-16 text-right">XP</div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pb-20">
               {safeLeaderboard.length === 0 ? (
                   // Empty State
                   <div className="flex flex-col items-center justify-center py-20 text-white/30">
                       <Trophy className="w-12 h-12 mb-4 opacity-20" />
                       <p className="text-sm">No ranking data yet.</p>
                       <p className="text-xs mt-1">Be the first to trade!</p>
                   </div>
               ) : (
                   safeLeaderboard.map((user: any, i: number) => {
                      const rank = i + 1;
                      const isMe = user.pubkey === publicKey?.toBase58();
                      const pnl = user.pnl_percent || 0;
                      const isPos = pnl >= 0;

                      // Rank Styling
                      let rankColor = "text-[#78716C]";
                      let borderStyle = "border-white/5";
                      if (rank === 1) { rankColor = "text-[#FFD700]"; borderStyle = "border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/5 to-[#1C1917]"; }
                      else if (rank === 2) { rankColor = "text-[#C0C0C0]"; borderStyle = "border-[#C0C0C0]/30"; }
                      else if (rank === 3) { rankColor = "text-[#CD7F32]"; borderStyle = "border-[#CD7F32]/30"; }
                      if (isMe) borderStyle = "border-[#D97706] bg-[#D97706]/5";

                      return (
                          <div key={i} className={`flex items-center p-3 rounded-xl bg-[#1C1917] border ${borderStyle} transition-colors`}>
                              <div className={`w-8 text-center font-mono font-bold text-lg ${rankColor}`} style={{ fontFamily: '"Times New Roman", serif' }}>{rank}</div>
                              
                              <div className="flex-1 flex items-center gap-3 pl-2 min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-black/50 overflow-hidden border border-white/10 shrink-0">
                                       {user.avatar_url ? <img src={api.getProxyUrl(user.avatar_url)} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs text-white/20">?</div>}
                                  </div>
                                  <div className="min-w-0">
                                      <p className={`font-bold text-sm truncate ${isMe ? 'text-[#D97706]' : 'text-white'}`}>{user.username || 'User'}</p>
                                      <div className="flex items-center gap-1 text-white/30">
                                          <p className="text-[10px] font-mono" style={{ fontFamily: '"Times New Roman", serif' }}>{shortAddr(user.pubkey)}</p>
                                      </div>
                                  </div>
                              </div>

                              <div className="w-20 text-right">
                                  <p className={`font-bold text-sm font-mono ${isPos ? 'text-[#4ADE80]' : 'text-[#F87171]'}`} style={{ fontFamily: '"Times New Roman", serif' }}>
                                      {isPos ? '+' : ''}{Number(pnl).toFixed(2)}%
                                  </p>
                              </div>

                              <div className="w-16 text-right">
                                  <div className="inline-flex items-center gap-1 justify-end text-white/50">
                                      <Sparkles className="w-3 h-3" />
                                      <p className="font-bold text-xs font-mono">{(user.total_xp / 1000).toFixed(1)}k</p>
                                  </div>
                              </div>
                          </div>
                      );
                   })
               )}
          </div>
      </div>
  );
};