import { useState, useEffect, useMemo, memo } from 'react';
import {
  Eye, EyeOff, Wallet, ArrowUpRight, ArrowDownRight,
  TrendingUp, Star, LayoutGrid
} from 'lucide-react';
import { useWallet, useConnection } from '../../hooks/useWallet';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { api } from '../../services/api';
import { TokenImage } from '../common/TokenImage';
import { OGBadge } from '../common/OGBadge';

// --- Types & Styles ---
const FIXED_BG_STYLE = {
  background: 'radial-gradient(circle at top right, #451a03 0%, #000000 80%)'
};

interface Strategy {
  id: string;
  name: string;
  ticker: string | null;
  type: string;
  tokens: any[];
  tvl: number;
  status: string;
  createdAt: number;
}

interface UserProfile {
  username: string;
  referralCode: string;
  totalPoints: number;
  totalVolume: number;
  rankTier: string;
  pnlPercent: number;
  referralCount: number;
  is_vip?: boolean;
}

// --- Helper Functions ---
const formatCurrency = (val: number, currency: 'USD' | 'SOL') => {
  if (currency === 'SOL') return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

interface ProfileViewProps {
  onStrategySelect?: (strategy: any) => void;
}

export const ProfileView = ({ onStrategySelect }: ProfileViewProps) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'portfolio' | 'leaderboard'>('portfolio');
  const [portfolioSubTab, setPortfolioSubTab] = useState<'created' | 'invested' | 'watchlist'>('created');
  const [leaderboardTab] = useState<'points'>('points'); // pointsに固定
  
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'SOL'>('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);

  // --- Data State ---
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myStrategies, setMyStrategies] = useState<Strategy[]>([]);
  const [investedStrategies, setInvestedStrategies] = useState<Strategy[]>([]);
  const [watchlist, setWatchlist] = useState<Strategy[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // --- 1. Init (Price & Balance) ---
  useEffect(() => {
    const fetchPrice = async () => {
      if (document.hidden) return;
      try {
        const price = await api.getSolPrice();
        if (price) setSolPrice(price);
        else {
           const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
           const data = await res.json();
           setSolPrice(data.solana?.usd || 150);
        }
      } catch { setSolPrice(150); }
    };
    fetchPrice();

    if (!publicKey || !connection) return;
    const getBalance = async () => {
      if (document.hidden) return;
      try {
        const lamports = await connection.getBalance(publicKey);
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch {}
    };
    getBalance();

    const interval = setInterval(() => { fetchPrice(); getBalance(); }, 60000);
    const handleVisibility = () => { if (!document.hidden) { fetchPrice(); getBalance(); } };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [publicKey, connection]);

  // --- 2. Load User Profile & Portfolio ---
  useEffect(() => {
    if (!publicKey) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const [userRes, stratsRes, watchlistRes, investedRes] = await Promise.all([
          api.getUser(publicKey.toBase58()),
          api.getUserStrategies(publicKey.toBase58()),
          api.getUserWatchlist(publicKey.toBase58()),
          api.getInvestedStrategies(publicKey.toBase58())
        ]);

        if (userRes.success && userRes.user) {
          const u = userRes.user;
          setUserProfile({
            username: u.username || 'Anonymous',
            referralCode: u.referralCode || `AXIS-${publicKey.toBase58().slice(0,4).toUpperCase()}`,
            totalPoints: u.total_xp || 0,
            totalVolume: u.total_invested || 0,
            rankTier: u.rank_tier || 'Novice',
            pnlPercent: u.pnl_percent || 0,
            referralCount: u.referralCount || 0,
            is_vip: u.is_vip || false
          });
        }

        if (stratsRes.success && stratsRes.strategies) {
          const seen = new Map();
          const unique = stratsRes.strategies.filter((s: any) => {
             const key = s.id;
             return seen.has(key) ? false : seen.set(key, true);
          }).sort((a: any, b: any) => b.createdAt - a.createdAt);
          setMyStrategies(unique);
        }

        if (watchlistRes.success && watchlistRes.strategies) {
          setWatchlist(watchlistRes.strategies);
        }

        if (investedRes.success && investedRes.strategies) {
          setInvestedStrategies(investedRes.strategies);
        }
        
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [publicKey]);

  // --- 3. Load Leaderboard (POINTS only) ---
  useEffect(() => {
    if (activeTab !== 'leaderboard') return;

    const loadLeaderboard = async () => {
      try {
        const res = await api.getLeaderboard('points');
        if (res.success && res.leaderboard) {
          setLeaderboardData(res.leaderboard.map((u: any, i: number) => ({
            ...u,
            rank: i + 1,
            isMe: u.pubkey === publicKey?.toBase58()
          })));
        }
      } catch {
      }
    };
    loadLeaderboard();
  }, [activeTab, publicKey]);

  // --- Logic & Display Values ---
  const investedAmountUSD = useMemo(() =>
    myStrategies.reduce((sum, s) => sum + ((s.tvl || 0) * solPrice), 0),
    [myStrategies, solPrice]
  );
  const totalNetWorthUSD = useMemo(() =>
    (solBalance * solPrice) + investedAmountUSD,
    [solBalance, solPrice, investedAmountUSD]
  );
  const displayValue = useMemo(() =>
    currencyMode === 'USD' ? totalNetWorthUSD : (solPrice > 0 ? totalNetWorthUSD / solPrice : 0),
    [currencyMode, totalNetWorthUSD, solPrice]
  );
  const pnlVal = userProfile?.pnlPercent || 0;
  const isPos = pnlVal >= 0;

  if (!publicKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center min-h-[70vh]">
        <div className="w-20 h-20 bg-[#1C1917] rounded-full flex items-center justify-center border border-white/10 mb-6 animate-pulse">
          <Wallet className="w-8 h-8 text-white/50" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2">Connect Wallet</h2>
        <p className="text-white/40 text-sm max-w-xs mx-auto mb-8">
          Access your portfolio, track referrals, and climb the leaderboard.
        </p>
        <div className="w-full max-w-xs">
           <WalletMultiButton style={{ width: '100%', justifyContent: 'center', background: '#D97706', borderRadius: '12px', fontWeight: 'bold' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col pt-4 md:pt-28 px-4 pb-32 safe-area-top relative">
      {/* Net Worth Card */}
      <div className="mb-8 relative group perspective-1000">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0C0A09] shadow-2xl" style={{ aspectRatio: '1.58/1' }}>
            <div className="absolute inset-0 z-0" style={FIXED_BG_STYLE} />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
            <div className="relative z-10 h-full p-6 flex flex-col justify-between bg-black/10 backdrop-blur-[1px]">
            <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 w-fit">
                            <Wallet className="w-3 h-3 text-[#D97706]" />
                            <span className="font-bold text-white text-sm font-serif">{formatAddress(publicKey.toBase58())}</span>
                        </div>
                        {userProfile?.is_vip && <div className="ml-1"><OGBadge size="sm" /></div>}
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setCurrencyMode(m => m === 'USD' ? 'SOL' : 'USD')} className="text-[10px] font-bold bg-black/40 px-2 py-1 rounded text-white/70 border border-white/10">{currencyMode}</button>
                         <button onClick={() => setIsHidden(!isHidden)} className="text-white/50">{isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                 </div>
                 <div className="py-2">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Total Net Worth</p>
                    <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight font-serif">
                        {isHidden ? '••••••' : formatCurrency(displayValue, currencyMode)}
                    </h2>
                    {pnlVal !== 0 && (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 border border-white/10 ${isPos ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {isPos ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                          <span className="font-mono">{isHidden ? '••••' : `${isPos ? '+' : ''}${pnlVal.toFixed(2)}%`}</span>
                      </div>
                    )}
                 </div>
                 <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-white/40 uppercase font-bold mb-0.5">Points</p>
                        <p className="text-sm text-[#D97706] font-bold font-mono">{userProfile?.totalPoints.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/40 uppercase font-bold mb-0.5">Rank</p>
                      <p className="text-sm text-white font-bold">{userProfile?.rankTier || 'Novice'}</p>
                    </div>
                 </div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 sticky top-0 md:top-20 bg-[#0C0A09] z-20 pt-2">
         {['portfolio', 'leaderboard'].map(t => (
             <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`flex-1 pb-3 font-bold text-sm capitalize transition-colors ${activeTab === t ? 'text-white border-b-2 border-[#D97706]' : 'text-white/40 hover:text-white/60'}`}
             >
                {t}
             </button>
         ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <FilterChip label={`Created (${myStrategies.length})`} active={portfolioSubTab === 'created'} onClick={() => setPortfolioSubTab('created')} />
            <FilterChip label={`Invested (${investedStrategies.length})`} active={portfolioSubTab === 'invested'} onClick={() => setPortfolioSubTab('invested')} />
            <FilterChip label={`Watchlist (${watchlist.length})`} active={portfolioSubTab === 'watchlist'} onClick={() => setPortfolioSubTab('watchlist')} icon={<Star className="w-3 h-3" />} />
          </div>
          <div className="space-y-3 pb-20">
            {portfolioSubTab === 'created' && (
               myStrategies.length > 0 ? myStrategies.map(s => <StrategyCard key={s.id} strategy={s} solPrice={solPrice} onSelect={onStrategySelect} />)
               : <EmptyState icon={LayoutGrid} title="No strategies yet" sub="Create your first index fund." />
            )}
            {portfolioSubTab === 'invested' && (
              investedStrategies.length > 0 ? investedStrategies.map(s => <StrategyCard key={s.id} strategy={s} solPrice={solPrice} onSelect={onStrategySelect} />)
              : <EmptyState icon={TrendingUp} title="No investments" sub="Explore strategies to grow wealth." />
            )}
            {portfolioSubTab === 'watchlist' && (
               watchlist.length > 0 ? watchlist.map(s => <StrategyCard key={s.id} strategy={s} solPrice={solPrice} onSelect={onStrategySelect} />)
               : <EmptyState icon={Star} title="Watchlist empty" sub="Star strategies to track them." />
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center px-4 pb-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                <div className="w-8 text-center">#</div>
                <div className="flex-1 pl-2">User</div>
                <div className="w-24 text-right">XP</div>
            </div>
            <div className="space-y-2">
                {leaderboardData.length === 0 ? (
                    <div className="py-20 text-center text-white/30 text-xs">
                        {isLoading ? "Loading..." : "No data available."}
                    </div>
                ) : (
                    leaderboardData.map((user, i) => (
                        <div key={i} className={`flex items-center p-3 rounded-xl border transition-colors ${user.isMe ? 'bg-[#D97706]/10 border-[#D97706]/50' : 'bg-[#1C1917] border-white/5'}`}>
                            <div className={`w-8 text-center font-mono font-bold text-lg ${user.rank <= 3 ? 'text-[#FFD700]' : 'text-[#78716C]'}`}>{user.rank}</div>
                            <div className="flex-1 flex items-center gap-3 pl-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/50 border border-white/5 overflow-hidden">
                                    {user.avatar_url ? <img src={api.getProxyUrl(user.avatar_url)} className="w-full h-full object-cover"/> : user.username.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className={`font-bold text-sm truncate ${user.isMe ? 'text-[#D97706]' : 'text-white'}`}>{user.username}</p>
                                    <p className="text-[10px] text-white/30 font-mono">{formatAddress(user.pubkey)}</p>
                                </div>
                            </div>
                            <div className="w-24 text-right font-mono font-bold text-white">
                                {user.value.toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
};

// --- Sub Components ---

const FilterChip = memo(({ label, active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${active ? 'bg-[#D97706] text-black' : 'bg-[#1C1917] border border-white/5 text-white/50 hover:bg-white/5'}`}
  >
    {icon} {label}
  </button>
));

const EmptyState = memo(({ icon: Icon, title, sub }: any) => (
  <div className="flex flex-col items-center justify-center py-12 text-white/20 border border-dashed border-white/5 rounded-2xl">
    <Icon className="w-10 h-10 mb-3 opacity-20" />
    <p className="text-sm font-bold text-white/40">{title}</p>
    <p className="text-xs">{sub}</p>
  </div>
));

const StrategyCard = memo(({ strategy, solPrice, onSelect }: { strategy: Strategy; solPrice: number; onSelect?: (strategy: any) => void }) => {
  const tvlUSD = (strategy.tvl || 0) * solPrice;
  const tokens = Array.isArray(strategy.tokens) ? strategy.tokens : [];
  const displayTokens = tokens.slice(0, 5);
  const extraCount = tokens.length - 5;

  return (
    <button
      onClick={() => onSelect?.(strategy)}
      className="w-full text-left bg-[#1C1917] p-4 rounded-xl border border-white/5 hover:border-[#D97706]/30 transition-colors active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-white font-bold">{strategy.name}</p>
          <p className="text-white/40 text-xs">{strategy.ticker || strategy.type || ''}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-mono text-sm">{tvlUSD > 0 ? `$${tvlUSD.toFixed(2)}` : '-'}</p>
          <p className="text-white/40 text-[10px]">TVL</p>
        </div>
      </div>
      <div className="flex items-center gap-0 mb-3">
         {displayTokens.map((t: any, i: number) => (
           <div key={i} className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#1C1917] bg-white/10 -ml-1.5 first:ml-0">
             <TokenImage
               src={t.logoURI}
               alt={t.symbol || ''}
               className="w-full h-full object-cover"
             />
           </div>
         ))}
         {extraCount > 0 && (
           <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#1C1917] -ml-1.5 flex items-center justify-center">
             <span className="text-[8px] text-white/60 font-bold">+{extraCount}</span>
           </div>
         )}
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-bold">ACTIVE</span>
        <span className="text-[10px] text-white/30">{new Date(strategy.createdAt * 1000).toLocaleDateString()}</span>
      </div>
    </button>
  );
});