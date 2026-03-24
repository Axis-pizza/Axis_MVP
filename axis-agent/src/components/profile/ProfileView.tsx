import { useState, useEffect, useMemo, memo } from 'react';
import {
  Eye,
  EyeOff,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Star,
  LayoutGrid,
  Trophy,
  Edit,
  User,
  QrCode,
  CheckCircle,
  Sparkles,
  Coins,
  LogOut,
  Copy,
  Share2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection, useLoginModal } from '../../hooks/useWallet';
import { isAndroidChrome } from '../../utils/seekerDetect';
import { api } from '../../services/api';
import { getUsdcBalance } from '../../services/usdc';
import { TokenImage } from '../common/TokenImage';
import { OGBadge } from '../common/OGBadge';
import { TierBadge } from '../common/TierBadge';
import { ProfileEditModal } from '../common/ProfileEditModal';
import { useToast } from '../../context/ToastContext';

// --- Types & Styles ---
const FIXED_BG_STYLE = {
  background: 'radial-gradient(circle at 70% 20%, #221509, #0B0704 60%)',
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
  bio?: string;
  avatar_url?: string;
}

// --- Helper Functions ---
const formatCurrency = (val: number, currency: 'USD' | 'USDC') => {
  if (currency === 'USDC')
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAddress = (address: string | null | undefined) => {
  if (!address) return 'Unknown';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// --- Invite Modal ---
const InviteModal = ({
  isOpen,
  onClose,
  pubkey,
}: {
  isOpen: boolean;
  onClose: () => void;
  pubkey: string;
}) => {
  const { showToast } = useToast();
  const inviteLink = `${window.location.origin}/?ref=${pubkey}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}&color=C9975B&bgcolor=0F0B07&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    showToast('✅ Invite Link Copied!', 'success');
  };

  const handleShareX = () => {
    const text = `Join me on Axis! 🚀\nCreating my own crypto ETF on Solana.\n\n#Axis #Solana #DeFi`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteLink)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#B8863F]/15 bg-gradient-to-b from-[#140E08] to-[#080503] p-8 text-center shadow-2xl shadow-[#6B4420]/20"
      >
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#B8863F]/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-[#B8863F]/8 blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#F2E0C8]/30 hover:text-[#F2E0C8] transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="mb-2 text-2xl font-serif font-normal text-[#F2E0C8] tracking-tight">
          Invite & Earn
        </h3>
        <p className="mb-8 text-sm text-[#7A5A30]">Share your link to earn referral XP.</p>

        <div className="mx-auto mb-8 w-fit rounded-2xl border border-[#B8863F]/15 bg-[#080503] p-4 shadow-inner">
          <img src={qrUrl} alt="Invite QR" className="h-48 w-48 rounded-lg opacity-90" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#221509] py-3.5 text-sm font-normal text-[#F2E0C8] transition-all hover:bg-[#221509] active:scale-95 border border-[rgba(184,134,63,0.08)]"
          >
            <Copy className="w-4 h-4" /> Copy Link
          </button>

          <button
            onClick={handleShareX}
            className="group flex items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-sm font-normal text-[#F2E0C8] transition-all hover:border-[#B8863F]/35 border border-[#B8863F]/15 active:scale-95"
          >
            <Share2 className="w-4 h-4 group-hover:text-[#B8863F] transition-colors" /> Post on X
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface ProfileViewProps {
  onStrategySelect?: (strategy: any) => void;
}

export const ProfileView = ({ onStrategySelect }: ProfileViewProps) => {
  const { publicKey, disconnect, connectMWA, mwaConnecting } = useWallet();
  const { connection } = useConnection();
  const { setVisible: openLogin } = useLoginModal();
const { showToast } = useToast();

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'portfolio' | 'leaderboard'>('portfolio');
  const [portfolioSubTab, setPortfolioSubTab] = useState<'created' | 'invested' | 'watchlist'>(
    'created'
  );
  const [leaderboardTab, setLeaderboardTab] = useState<'points' | 'created'>('points');

  const [currencyMode, setCurrencyMode] = useState<'USD' | 'USDC'>('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);

  // --- Action State ---
  const [checkedIn, setCheckedIn] = useState(false);
  const [faucetClaimed, setFaucetClaimed] = useState(false);
  const [xpFlash, setXpFlash] = useState(false);
  const [earnedXp, setEarnedXp] = useState(10);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // --- Data State ---
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myStrategies, setMyStrategies] = useState<Strategy[]>([]);
  const [investedStrategies, setInvestedStrategies] = useState<Strategy[]>([]);
  const [watchlist, setWatchlist] = useState<Strategy[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // --- 1. Init (USDC Balance) ---
  useEffect(() => {
    if (!publicKey || !connection) return;
    const fetchBalance = async () => {
      if (document.hidden) return;
      try {
        const bal = await getUsdcBalance(connection, publicKey);
        setUsdcBalance(bal);
      } catch {}
    };
    fetchBalance();

    const interval = setInterval(fetchBalance, 60000);
    const handleVisibility = () => {
      if (!document.hidden) fetchBalance();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [publicKey, connection]);

  // --- 2. Check-in / Faucet state: localStorage を初期値とし loadProfile で上書き ---
  useEffect(() => {
    if (!publicKey) { setCheckedIn(false); setFaucetClaimed(false); return; }
    const today = getJSTDate();
    const stored = localStorage.getItem(`axis_checkin_${publicKey.toBase58()}_${today}`);
    setCheckedIn(!!stored);
  }, [publicKey]);

  // JST (UTC+9) 基準で今日の日付文字列 (YYYY-MM-DD) を返す
  const getJSTDate = (): string => {
    const jst = new Date(Date.now() + 9 * 3600 * 1000);
    return jst.toISOString().split('T')[0];
  };

  // JST (UTC+9) 基準で「今日」かどうかを判定するユーティリティ
  const isToday = (unixTs: number): boolean => {
    if (!unixTs) return false;
    const JST_OFFSET = 9 * 3600;
    const now = Math.floor(Date.now() / 1000);
    const todayJST = Math.floor((now + JST_OFFSET) / 86400);
    const thatDayJST = Math.floor((unixTs + JST_OFFSET) / 86400);
    return todayJST === thatDayJST;
  };

  // --- 3. Load User Profile & Portfolio ---
  const loadProfile = async () => {
    if (!publicKey) return;
    setIsLoading(true);
    try {
      const [userRes, stratsRes, watchlistRes, investedRes] = await Promise.all([
        api.getUser(publicKey.toBase58()),
        api.getUserStrategies(publicKey.toBase58()),
        api.getUserWatchlist(publicKey.toBase58()),
        api.getInvestedStrategies(publicKey.toBase58()),
      ]);

      if (userRes.success && userRes.user) {
        const u = userRes.user;
        setUserProfile({
          username: u.username || 'Anonymous',
          referralCode:
            u.referralCode || `AXIS-${publicKey.toBase58().slice(0, 4).toUpperCase()}`,
          totalPoints: u.total_xp || 0,
          totalVolume: Number(u.total_invested) || 0,
          rankTier: u.rank_tier || 'Novice',
          pnlPercent: Number(u.pnl_percent) || 0,
          referralCount: u.referralCount || 0,
          is_vip: u.is_vip || false,
          bio: u.bio,
          avatar_url: u.avatar_url || u.pfpUrl,
        });

        // サーバーの last_checkin / last_faucet_at で状態を上書き（localStorage 改ざん対策）
        if (isToday(u.last_checkin)) {
          setCheckedIn(true);
          const today = getJSTDate();
          localStorage.setItem(`axis_checkin_${publicKey.toBase58()}_${today}`, 'true');
        }
        if (isToday(u.last_faucet_at)) {
          setFaucetClaimed(true);
        }
      }

      if (stratsRes.success && stratsRes.strategies) {
        const seen = new Map();
        const unique = stratsRes.strategies
          .filter((s: any) => {
            const key = s.id;
            return seen.has(key) ? false : seen.set(key, true);
          })
          .sort((a: any, b: any) => b.createdAt - a.createdAt);
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

  useEffect(() => {
    if (!publicKey) return;
    loadProfile();
  }, [publicKey]);

  // --- 4. Load Leaderboard ---
  useEffect(() => {
    if (activeTab !== 'leaderboard') return;

    const loadLeaderboard = async () => {
      setLeaderboardData([]);
      setIsLeaderboardLoading(true);
      try {
        if (leaderboardTab === 'created') {
          // Paginate through all strategies to get accurate counts.
          // 200 per page, stop when a page returns fewer than 200 (last page).
          const PAGE = 200;
          const MAX_PAGES = 10; // safety cap: at most 2000 strategies
          const allStrategies: any[] = [];
          for (let page = 0; page < MAX_PAGES; page++) {
            const res = await api.discoverStrategies(PAGE, page * PAGE);
            const items: any[] = res.strategies || res || [];
            allStrategies.push(...items);
            if (items.length < PAGE) break; // reached last page
          }

          const countMap: Record<string, { count: number; pfpUrl?: string | null }> = {};
          for (const s of allStrategies) {
            const pk = s.ownerPubkey || s.owner_pubkey;
            if (!pk) continue;
            if (!countMap[pk]) countMap[pk] = { count: 0, pfpUrl: s.creatorPfpUrl ?? null };
            countMap[pk].count++;
          }

          const sorted = Object.entries(countMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 20);

          const userInfos = await Promise.all(
            sorted.map(([pk]) => api.getUser(pk).catch(() => null))
          );

          setLeaderboardData(
            sorted.map(([pk, data], i) => {
              const u = userInfos[i]?.user;
              return {
                pubkey: pk,
                username: u?.username || `${pk.slice(0, 4)}...${pk.slice(-4)}`,
                avatar_url: u?.avatar_url || u?.pfpUrl || data.pfpUrl || null,
                value: data.count,
                rank: i + 1,
                isMe: pk === publicKey?.toBase58(),
              };
            })
          );
        } else {
          const res = await api.getLeaderboard('points');
          if (res.success && res.leaderboard) {
            setLeaderboardData(
              res.leaderboard.map((u: any, i: number) => ({
                ...u,
                rank: i + 1,
                isMe: u.pubkey === publicKey?.toBase58(),
              }))
            );
          }
        }
      } catch {
      } finally {
        setIsLeaderboardLoading(false);
      }
    };
    loadLeaderboard();
  }, [activeTab, leaderboardTab, publicKey]);

  // --- Handlers ---
  const handleCheckIn = async () => {
    if (!publicKey || checkedIn) return;
    setCheckInLoading(true);
    try {
      const res = await api.dailyCheckIn(publicKey.toBase58());

      if (res.success) {
        const earned: number = res.earnedPoints ?? 10;
        const isVip: boolean = res.isVip ?? false;

        setEarnedXp(earned);
        setUserProfile((prev) =>
          prev ? { ...prev, totalPoints: (prev.totalPoints || 0) + earned } : prev
        );
        setXpFlash(true);
        setTimeout(() => setXpFlash(false), 1200);
        setCheckedIn(true);
        const today = getJSTDate();
        localStorage.setItem(`axis_checkin_${publicKey.toBase58()}_${today}`, 'true');
        showToast(
          isVip ? `⭐ +${earned} XP Claimed! (VIP Bonus)` : `✅ +${earned} XP Claimed!`,
          'success'
        );
        loadProfile();
      } else {
        const errorMsg = (res.error || res.message || '').toLowerCase();

        if (errorMsg.includes('already') || errorMsg.includes('today') || errorMsg.includes('済')) {
          // 正常なケース（今日すでに実施済み）— error ではなく info で表示
          setCheckedIn(true);
          const today = getJSTDate();
          localStorage.setItem(`axis_checkin_${publicKey.toBase58()}_${today}`, 'true');
          showToast("Already checked in today. Come back tomorrow!", 'info');
        } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
          // ユーザーレコードが存在しない
          showToast('Profile not found. Please set up your profile first.', 'error');
        } else {
          // その他のサーバーエラー
          showToast('Check-in failed. Please try again later.', 'error');
        }
      }
    } catch {
      showToast('Network error. Check your connection and try again.', 'error');
    }
    setCheckInLoading(false);
  };

  const handleFaucet = async () => {
    if (!publicKey || faucetClaimed) return;
    setFaucetLoading(true);
    try {
      const result = await api.requestFaucet(publicKey.toBase58());
      if (result.success) {
        setFaucetClaimed(true);
        showToast('💰 1,000 USDC received! Check your wallet.', 'success');
      } else {
        const msg = (result.error || result.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('claimed')) {
          // 今日すでに受け取り済み — info で表示
          setFaucetClaimed(true);
          showToast('Already claimed today. Resets at midnight (JST).', 'info');
        } else if (msg.includes('network') || msg.includes('timeout')) {
          showToast('Network error. Check your connection and try again.', 'error');
        } else {
          showToast('Faucet unavailable. Please try again later.', 'error');
        }
      }
    } catch {
      showToast('Network error. Check your connection and try again.', 'error');
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  // --- Logic & Display Values ---
  const investedAmountUSD = useMemo(
    () => myStrategies.reduce((sum, s) => sum + (s.tvl || 0), 0),
    [myStrategies]
  );
  const totalNetWorthUSD = useMemo(
    () => usdcBalance + investedAmountUSD,
    [usdcBalance, investedAmountUSD]
  );
  const displayValue = useMemo(() => totalNetWorthUSD, [totalNetWorthUSD]);
  const pnlVal = userProfile?.pnlPercent || 0;
  const isPos = pnlVal >= 0;

  if (!publicKey) {
    return (
      <div className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 overflow-hidden pt-24 pb-32">
        {/* Ambient background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-30"
            style={{ background: 'radial-gradient(ellipse, rgba(184,134,63,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-20 right-0 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(153,69,255,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>

        <div className="relative w-full max-w-sm mx-auto">
          {/* Logo mark */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: 'linear-gradient(135deg, #1A0E06, #2A1A08)',
                border: '1px solid rgba(184,134,63,0.2)',
                boxShadow: '0 0 40px rgba(184,134,63,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6B4420, #B8863F)' }}>
                <Wallet className="w-4 h-4 text-black" />
              </div>
            </div>

            <p className="text-[10px] font-normal uppercase tracking-[0.25em] mb-3"
              style={{ color: '#B8863F' }}>
              Axis · DeFi Strategy Hub
            </p>
            <h1 className="font-serif text-3xl font-normal text-center leading-tight tracking-tight"
              style={{ color: '#F2E0C8' }}>
              Your private<br />portfolio awaits
            </h1>
            <p className="text-sm text-center mt-3 leading-relaxed max-w-[240px]"
              style={{ color: '#5A3A18' }}>
              Sign in to manage strategies, track XP, and climb the leaderboard
            </p>
          </div>

          {/* Connect Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => openLogin(true)}
            className="w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(153,69,255,0.08) 0%, rgba(20,241,149,0.05) 100%)',
              border: '1px solid rgba(153,69,255,0.25)',
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, rgba(153,69,255,0.14) 0%, rgba(20,241,149,0.08) 100%)' }} />
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.2)' }}>
              <svg width="22" height="22" viewBox="0 0 397.7 311.7" fill="none">
                <defs>
                  <linearGradient id="sol-grad-profile" x1="360.8" y1="351.5" x2="141.7" y2="-69.3" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#9945ff" />
                    <stop offset="1" stopColor="#14f195" />
                  </linearGradient>
                </defs>
                <path fill="url(#sol-grad-profile)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm0-164.2c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm317.4-70H64.6c-3.5 0-6.8 1.4-9.2 3.8L-7.3 70.2c-4.1 4.1-1.2 11.1 4.6 11.1h317.4c3.5 0 6.8-1.4 9.2-3.8l62.7-62.7c4.1-4.1 1.2-11.1-4.6-11.1z" />
              </svg>
            </div>
            <div className="relative text-left flex-1">
              <p className="text-[#F2E0C8] font-normal text-[15px] leading-tight">Continue with Solana</p>
              <p className="text-[#7A5A30] text-xs mt-0.5">Phantom · Solflare · Backpack</p>
            </div>
            <span className="relative text-[#9945ff]/40 group-hover:text-[#9945ff]/70 transition-colors text-lg">›</span>
          </motion.button>

          {/* Seeker / MWA Connect Button — shown on Android Chrome only */}
          {isAndroidChrome() && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={mwaConnecting}
              onClick={async () => {
                try {
                  await connectMWA();
                } catch {
                  // Error handled by useMobileWalletAdapter
                }
              }}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl mt-3 transition-all duration-150 active:opacity-80 disabled:opacity-50"
              style={{
                background: '#0A0F05',
                border: '1px solid rgba(100,184,63,0.25)',
              }}
            >
              <img src="/icon.png" alt="Seeker" width={20} height={20} className="shrink-0 rounded opacity-90" />
              <span style={{ color: '#F2E0C8' }} className="text-sm font-normal flex-1 text-left">
                {mwaConnecting ? 'Connecting...' : 'Connect with Seeker'}
              </span>
              <span style={{ color: 'rgba(100,184,63,0.4)' }} className="text-base leading-none">›</span>
            </motion.button>
          )}

          <p className="text-center text-[11px] mt-6 leading-relaxed" style={{ color: '#2E1A08' }}>
            By signing in, you agree to our Terms of Service
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col pt-4 md:pt-28 px-4 pb-32 safe-area-top relative">

      {/* Hero Section */}
      <div className="mb-6 relative overflow-hidden rounded-[24px] border border-[rgba(184,134,63,0.15)] bg-[#080503] shadow-2xl">
        <div className="absolute inset-0 z-0" style={FIXED_BG_STYLE} />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
        <div className="relative z-10 p-5">
          {/* Top row: Avatar + Info + Edit */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="relative group cursor-pointer flex-shrink-0"
              onClick={() => setIsEditOpen(true)}
            >
              <div className="w-20 h-20 rounded-full border-2 border-[#B8863F]/30 p-1">
                <div className="w-full h-full rounded-full bg-[#140E08] overflow-hidden flex items-center justify-center">
                  {userProfile?.avatar_url ? (
                    <img
                      src={api.getProxyUrl(userProfile.avatar_url)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-[#F2E0C8]/20" />
                  )}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 bg-gradient-to-r from-[#6B4420] via-[#B8863F] to-[#E8C890] text-[#140D07] p-1 rounded-full border border-black shadow-lg group-hover:scale-110 transition-transform">
                <Edit className="w-3 h-3" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-normal text-[#F2E0C8] truncate">
                  {userProfile?.username || formatAddress(publicKey.toBase58())}
                </h2>
                {userProfile?.is_vip && <OGBadge size="sm" />}
              </div>

              {/* XP with flash animation */}
              <div className="relative inline-block mt-0.5">
                <p className={`text-sm font-serif font-normal transition-colors duration-300 ${xpFlash ? 'text-emerald-400' : 'text-[#B8863F]'}`}>
                  XP: {userProfile?.totalPoints.toLocaleString() || 0}
                </p>
                <AnimatePresence>
                  {xpFlash && (
                    <motion.span
                      initial={{ opacity: 0, y: 4, scale: 0.8 }}
                      animate={{ opacity: 1, y: -16, scale: 1 }}
                      exit={{ opacity: 0, y: -32, scale: 0.8 }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="absolute -top-1 left-full ml-2 text-emerald-400 font-normal text-xs whitespace-nowrap pointer-events-none"
                    >
                      +{earnedXp} XP
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-1.5">
                <TierBadge tier={userProfile?.rankTier || 'Novice'} size="sm" />
              </div>

              {/* Wallet Address */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <Wallet className="w-3 h-3 text-white/30 flex-shrink-0" />
                <span className="text-[11px] font-mono text-white/40 tracking-wide">
                  {formatAddress(publicKey.toBase58())}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-3">
            {userProfile?.bio ? (
              <p className="text-sm text-[#7A5A30] leading-relaxed">{userProfile.bio}</p>
            ) : (
              <button
                onClick={() => setIsEditOpen(true)}
                className="text-xs text-[#7A5A30]/50 hover:text-[#B8863F] transition-colors"
              >
                + Add Bio
              </button>
            )}
          </div>

          {/* Net Worth separator */}
          <div className="mt-4 pt-4 border-t border-[rgba(184,134,63,0.1)] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase font-normal tracking-widest mb-1">
                Net Worth
              </p>
              <h3 className="text-2xl font-normal text-white font-serif">
                {isHidden ? '••••••' : formatCurrency(displayValue, currencyMode)}
              </h3>
              {pnlVal !== 0 && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-normal mt-1 border border-[rgba(184,134,63,0.15)] ${isPos ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                >
                  {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span className="font-mono">
                    {isHidden ? '••••' : `${isPos ? '+' : ''}${pnlVal.toFixed(2)}%`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrencyMode((m) => (m === 'USD' ? 'USDC' : 'USD'))}
                className="text-[10px] font-normal bg-black/40 px-2 py-1 rounded text-white/70 border border-[rgba(184,134,63,0.15)]"
              >
                {currencyMode}
              </button>
              <button onClick={() => setIsHidden(!isHidden)} className="text-white/50">
                {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 space-y-3">
        {/* Daily Check-in */}
        <button
          onClick={handleCheckIn}
          disabled={checkInLoading || checkedIn}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-normal shadow-lg transition-all ${
            checkedIn
              ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 cursor-default'
              : 'bg-[#B8863F] text-black shadow-[#6B4420]/20 active:scale-95 hover:brightness-110 disabled:opacity-50'
          }`}
        >
          {checkInLoading ? (
            <Sparkles className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          <span>{checkedIn ? "Today's Check-in Done" : 'Daily Check-in'}</span>
          {!checkedIn && (
            <span className="rounded bg-black/20 px-1.5 py-0.5 text-xs">+{earnedXp} XP</span>
          )}
        </button>

        {/* Faucet + Invite row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleFaucet}
            disabled={faucetLoading || faucetClaimed}
            className={`py-3 rounded-2xl font-normal flex items-center justify-center gap-2 transition-all ${
              faucetClaimed
                ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 cursor-default'
                : faucetLoading
                  ? 'bg-[#1C1C1E] border border-[rgba(184,134,63,0.3)] text-[#B8863F] opacity-50 cursor-not-allowed'
                  : 'bg-[#1C1C1E] border border-[rgba(184,134,63,0.3)] text-[#B8863F] hover:bg-[#B8863F]/10 active:scale-95'
            }`}
          >
            {faucetClaimed
              ? <CheckCircle className="w-4 h-4" />
              : <Coins className="w-4 h-4" />
            }
            <span className="text-sm">
              {faucetClaimed ? 'Claimed Today' : faucetLoading ? 'Processing...' : 'Get Demo USDC'}
            </span>
          </button>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="group flex items-center justify-center gap-2 rounded-2xl border border-[rgba(184,134,63,0.15)] bg-[#140E08] py-3 font-normal text-[#F2E0C8] text-sm transition-all active:scale-95 hover:bg-[#221509]"
          >
            <QrCode className="h-4 w-4 text-[#7A5A30] transition-colors group-hover:text-[#F2E0C8]" />
            Invite & Earn
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(184,134,63,0.15)] mb-6 sticky top-0 md:top-20 bg-[#080503] z-20 pt-2">
        {['portfolio', 'leaderboard'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={`flex-1 pb-3 font-normal text-sm capitalize transition-colors ${activeTab === t ? 'text-white border-b-2 border-[#B8863F]' : 'text-white/40 hover:text-white/60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <FilterChip
              label={`Created (${myStrategies.length})`}
              active={portfolioSubTab === 'created'}
              onClick={() => setPortfolioSubTab('created')}
            />
            <FilterChip
              label={`Invested (${investedStrategies.length})`}
              active={portfolioSubTab === 'invested'}
              onClick={() => setPortfolioSubTab('invested')}
            />
            <FilterChip
              label={`Watchlist (${watchlist.length})`}
              active={portfolioSubTab === 'watchlist'}
              onClick={() => setPortfolioSubTab('watchlist')}
              icon={<Star className="w-3 h-3" />}
            />
          </div>
          <div className="space-y-3 pb-20">
            {isLoading && (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-t-[#B8863F] border-white/10 rounded-full animate-spin" />
              </div>
            )}
            {!isLoading && portfolioSubTab === 'created' &&
              (myStrategies.length > 0 ? (
                myStrategies.map((s) => (
                  <StrategyCard key={s.id} strategy={s} onSelect={onStrategySelect} />
                ))
              ) : (
                <EmptyState
                  icon={LayoutGrid}
                  title="No strategies yet"
                  sub="Create your first index fund."
                />
              ))}
            {!isLoading && portfolioSubTab === 'invested' &&
              (investedStrategies.length > 0 ? (
                investedStrategies.map((s) => (
                  <StrategyCard key={s.id} strategy={s} onSelect={onStrategySelect} />
                ))
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No investments"
                  sub="Explore strategies to grow wealth."
                />
              ))}
            {!isLoading && portfolioSubTab === 'watchlist' &&
              (watchlist.length > 0 ? (
                watchlist.map((s) => (
                  <StrategyCard key={s.id} strategy={s} onSelect={onStrategySelect} />
                ))
              ) : (
                <EmptyState
                  icon={Star}
                  title="Watchlist empty"
                  sub="Star strategies to track them."
                />
              ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Leaderboard sub-tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <FilterChip
              label="Points"
              active={leaderboardTab === 'points'}
              onClick={() => setLeaderboardTab('points')}
              icon={<Star className="w-3 h-3" />}
            />
            <FilterChip
              label="ETFs Created"
              active={leaderboardTab === 'created'}
              onClick={() => setLeaderboardTab('created')}
              icon={<Trophy className="w-3 h-3" />}
            />
          </div>
          {leaderboardData.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-white/30 text-xs">
              {isLeaderboardLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-t-[#B8863F] border-white/10 rounded-full animate-spin"></div>
                  <span className="font-mono tracking-widest uppercase">Loading...</span>
                </div>
              ) : (
                'No ranking data available.'
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top 1 (Gold) */}
              {leaderboardData[0] && (
                <div className={`relative flex flex-col items-center p-6 rounded-2xl border ${
                  leaderboardData[0].isMe
                    ? 'bg-gradient-to-b from-[#D4AF37]/10 to-[#140E08] border-[#D4AF37]/50'
                    : 'bg-[#140E08] border-[rgba(212,175,55,0.2)]'
                  } overflow-hidden`}
                >
                  <span className="absolute top-4 left-5 font-normal text-2xl bg-gradient-to-br from-[#FFF5C3] via-[#D4AF37] to-[#996515] text-transparent bg-clip-text drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    #1
                  </span>

                  <div className="relative mb-3">
                    <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] overflow-hidden bg-white/5 flex items-center justify-center z-10 relative">
                      {leaderboardData[0].avatar_url ? (
                        <img src={api.getProxyUrl(leaderboardData[0].avatar_url)} className="w-full h-full object-cover" alt="Rank 1" />
                      ) : (
                        <span className="text-2xl font-normal text-white/50">{leaderboardData[0].username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  <p className="font-normal text-white text-lg mb-1">{leaderboardData[0].username}</p>
                  <div className="flex items-center gap-1.5 text-[#D4AF37] font-normal">
                    {leaderboardTab === 'created' ? (
                      <><Trophy className="w-4 h-4" />{leaderboardData[0].value.toLocaleString()} ETFs</>
                    ) : (
                      <><Star className="w-4 h-4 fill-[#D4AF37]" />{leaderboardData[0].value.toLocaleString()}</>
                    )}
                  </div>
                </div>
              )}

              {/* Top 2 (Silver) & 3 (Bronze) */}
              <div className="grid grid-cols-2 gap-3">
                {[leaderboardData[1], leaderboardData[2]].map((user, idx) => {
                  if (!user) return null;
                  const rank = idx + 2;
                  const isSilver = rank === 2;

                  const badgeGradient = isSilver
                    ? 'from-[#FFFFFF] via-[#C0C0C0] to-[#707070]'
                    : 'from-[#FFDAB9] via-[#CD7F32] to-[#8B4513]';
                  const borderColor = isSilver ? 'border-[#C0C0C0]' : 'border-[#CD7F32]';
                  const shadowColor = isSilver ? 'shadow-[0_0_15px_rgba(192,192,192,0.25)]' : 'shadow-[0_0_15px_rgba(205,127,50,0.25)]';
                  const textColor = isSilver ? 'text-[#C0C0C0]' : 'text-[#CD7F32]';

                  return (
                    <div key={user.pubkey} className={`relative flex flex-col items-center p-5 rounded-2xl border ${
                      user.isMe
                        ? `bg-gradient-to-b ${isSilver ? 'from-[#C0C0C0]/10' : 'from-[#CD7F32]/10'} to-[#140E08] ${borderColor}`
                        : 'bg-[#140E08] border-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <span className={`absolute top-3 left-4 font-normal text-xl bg-gradient-to-br ${badgeGradient} text-transparent bg-clip-text drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]`}>
                        #{rank}
                      </span>

                      <div className={`w-16 h-16 rounded-full border-[1.5px] ${borderColor} ${shadowColor} mb-2 overflow-hidden bg-white/5 flex items-center justify-center`}>
                        {user.avatar_url ? (
                          <img src={api.getProxyUrl(user.avatar_url)} className="w-full h-full object-cover" alt={`Rank ${rank}`} />
                        ) : (
                          <span className="text-xl font-normal text-white/50">{user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <p className="font-normal text-white text-sm mb-1 w-full text-center truncate">{user.username}</p>
                      <div className={`flex items-center gap-1 font-normal text-sm ${textColor}`}>
                        {leaderboardTab === 'created' ? (
                          <><Trophy className="w-3.5 h-3.5" />{user.value.toLocaleString()} ETFs</>
                        ) : (
                          <><Star className="w-3.5 h-3.5 fill-current" />{user.value.toLocaleString()}</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 4th and beyond */}
              <div className="flex flex-col gap-2 pt-2">
                {leaderboardData.slice(3).map((user) => (
                  <div key={user.pubkey} className={`flex items-center p-3 sm:p-4 rounded-2xl border transition-colors ${
                    user.isMe
                      ? 'bg-[#B8863F]/10 border-[#B8863F]/30'
                      : 'bg-[#140E08] border-[rgba(255,255,255,0.03)] hover:border-[rgba(184,134,63,0.15)]'
                    }`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={api.getProxyUrl(user.avatar_url)} className="w-full h-full object-cover" alt="Player" />
                        ) : (
                          <span className="text-sm font-normal text-white/50">{user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-[11px] text-white/40 mb-0.5 font-mono font-normal">#{user.rank}</p>
                        <div className="flex items-center gap-2">
                          <p className={`font-normal text-sm truncate ${user.isMe ? 'text-[#B8863F]' : 'text-white/90'}`}>
                            {user.username}
                          </p>
                          {user.isMe && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[#B8863F]/20 text-[#B8863F] uppercase tracking-wider font-normal">You</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-white/70 font-normal">
                        {leaderboardTab === 'created' ? (
                          <><Trophy className="w-3.5 h-3.5" />{user.value.toLocaleString()} ETFs</>
                        ) : (
                          <><Star className="w-3.5 h-3.5 fill-white/20" />{user.value.toLocaleString()}</>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnect Button */}
      <div className="mt-6 pb-4">
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-normal text-red-500/80 transition-colors hover:bg-red-500/5 hover:text-red-500 disabled:opacity-50"
        >
          {isDisconnecting ? (
            <Sparkles className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {isDisconnecting ? 'Logging out...' : 'Log Out'}
        </button>
      </div>

      {/* Modals */}
      {publicKey && (
        <ProfileEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          currentProfile={{
            pubkey: publicKey.toBase58(),
            username: userProfile?.username,
            bio: userProfile?.bio,
            avatar_url: userProfile?.avatar_url,
          }}
          onUpdate={loadProfile}
        />
      )}

      <AnimatePresence>
        {isInviteOpen && publicKey && (
          <InviteModal
            isOpen={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
            pubkey={publicKey.toBase58()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub Components ---

const FilterChip = memo(({ label, active, onClick, icon }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-normal whitespace-nowrap transition-colors ${active ? 'bg-gradient-to-r from-[#6B4420] via-[#B8863F] to-[#E8C890] text-[#140D07]' : 'bg-[#140E08] border border-[rgba(184,134,63,0.08)] text-white/50 hover:bg-white/5'}`}
  >
    {icon} {label}
  </button>
));

const EmptyState = memo(({ icon: Icon, title, sub }: any) => (
  <div className="flex flex-col items-center justify-center py-12 text-white/20 border border-dashed border-[rgba(184,134,63,0.08)] rounded-2xl">
    <Icon className="w-10 h-10 mb-3 opacity-20" />
    <p className="text-sm font-normal text-white/40">{title}</p>
    <p className="text-xs">{sub}</p>
  </div>
));

const StrategyCard = memo(
  ({ strategy, onSelect }: { strategy: Strategy; onSelect?: (strategy: any) => void }) => {
    const tvlUSD = strategy.tvl || 0;
    const tokens = Array.isArray(strategy.tokens) ? strategy.tokens : [];
    const displayTokens = tokens.slice(0, 5);
    const extraCount = tokens.length - 5;

    return (
      <button
        onClick={() => onSelect?.(strategy)}
        className="w-full text-left bg-[#140E08] p-4 rounded-xl border border-[rgba(184,134,63,0.08)] hover:border-[#B8863F]/30 transition-colors active:scale-[0.98]"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-white font-normal">{strategy.name}</p>
            <p className="text-white/40 text-xs">{strategy.ticker || strategy.type || ''}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-mono text-sm">
              {tvlUSD > 0 ? `$${tvlUSD.toFixed(2)}` : '-'}
            </p>
            <p className="text-white/40 text-[10px]">TVL</p>
          </div>
        </div>
        <div className="flex items-center gap-0 mb-3">
          {displayTokens.map((t: any, i: number) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#140E08] bg-white/10 -ml-1.5 first:ml-0"
            >
              <TokenImage
                src={t.logoURI}
                alt={t.symbol || ''}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {extraCount > 0 && (
            <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#140E08] -ml-1.5 flex items-center justify-center">
              <span className="text-[8px] text-white/60 font-normal">+{extraCount}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-[rgba(184,134,63,0.08)]">
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-normal">
            ACTIVE
          </span>
          <span className="text-[10px] text-white/30">
            {new Date(strategy.createdAt * 1000).toLocaleDateString()}
          </span>
        </div>
      </button>
    );
  }
);
