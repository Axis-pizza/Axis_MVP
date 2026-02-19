import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Trophy,
  LogOut,
  CheckCircle,
  Sparkles,
  Edit,
  User,
  Wallet,
  QrCode,
  Share2,
  ExternalLink,
  AlertTriangle,
  Coins // ★追加: Coinsアイコン
} from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '../../hooks/useWallet';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ProfileEditModal } from './ProfileEditModal';

// --- Invite Modal Component ---
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

        <h3 className="mb-2 text-2xl font-serif font-bold text-[#F2E0C8] tracking-tight">
          Invite & Earn
        </h3>
        <p className="mb-8 text-sm text-[#7A5A30]">Share your link to earn referral XP.</p>

        <div className="mx-auto mb-8 w-fit rounded-2xl border border-[#B8863F]/15 bg-[#080503] p-4 shadow-inner">
          <img src={qrUrl} alt="Invite QR" className="h-48 w-48 rounded-lg opacity-90" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#221509] py-3.5 text-sm font-bold text-[#F2E0C8] transition-all hover:bg-[#221509] active:scale-95 border border-[rgba(184,134,63,0.08)]"
          >
            <Copy className="w-4 h-4" /> Copy Link
          </button>

          <button
            onClick={handleShareX}
            className="group flex items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-sm font-bold text-[#F2E0C8] transition-all hover:border-[#B8863F]/35 border border-[#B8863F]/15 active:scale-95"
          >
            <Share2 className="w-4 h-4 group-hover:text-[#B8863F] transition-colors" /> Post on X
          </button>
        </div>
      </motion.div>
    </div>
  );
};


// --- Profile Drawer Component ---
export const ProfileDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { showToast } = useToast();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isWalletModalPending, setIsWalletModalPending] = useState(false);
  const { setVisible, visible: walletModalVisible } = useWalletModal();
  const { publicKey, disconnect, connected } = useWallet();
  
  // ★ 追加: Faucetフォールバック用のState
  const [showFaucetFallback, setShowFaucetFallback] = useState(false);

  const resetUserData = useCallback(() => {
    setUserData(null);
  }, []);

  const fetchUser = useCallback(async () => {
    if (!publicKey) {
      resetUserData();
      return;
    }
    try {
      const res = await api.getUser(publicKey.toBase58());
      if (res.success || res.user) {
        const user = res.user || res;
        user.is_registered = res.is_registered ?? true;
        setUserData(user);
      }
    } catch {
      // エラー処理は適宜
    }
  }, [publicKey, resetUserData]);

  useEffect(() => {
    if (!publicKey || !connected) {
      resetUserData();
    } else {
      fetchUser();
    }
  }, [publicKey, connected, fetchUser, resetUserData]);

  useEffect(() => {
    if (isOpen && publicKey && connected) {
      fetchUser();
    }
  }, [isOpen, publicKey, connected, fetchUser]);

  useEffect(() => {
    if (isWalletModalPending && !walletModalVisible) {
      setIsWalletModalPending(false);
    }
  }, [walletModalVisible, isWalletModalPending]);

  // ★ 追加: ウォレット接続・切断ハンドラ
  const handleConnect = () => {
    setVisible(true);
    setIsWalletModalPending(true);
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnect();
      resetUserData();
      onClose();
      showToast('Wallet disconnected', 'info');
    } catch (error) {
      console.error('Disconnect error:', error);
      showToast('Failed to disconnect wallet', 'error');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await api.dailyCheckIn(publicKey.toBase58());
      if (res.success) {
        const newXp = res.user?.total_xp ?? res.user?.xp ?? res.total_xp ?? res.xp;
        if (newXp !== undefined) {
          setUserData((prev: any) => ({
            ...prev,
            total_xp: newXp,
            ...(res.user || {}),
          }));
        }
        await fetchUser();
        showToast('✅ +10 XP Claimed!', 'success');
      } else {
        showToast(res.error || res.message || 'Check-in failed', 'error');
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
    setLoading(false);
  };

  // ★ 修正: Faucetハンドラ (エラー時にフォールバック表示)
  const handleFaucet = async () => {
    if (!publicKey) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    setFaucetLoading(true);
    setShowFaucetFallback(false);

    try {
      const walletAddress = publicKey.toBase58();
      console.log('[Faucet] Requesting for wallet:', walletAddress);
      const result = await api.requestFaucet(walletAddress);
      
      if (result.success) {
        showToast(result.message || "1,000 USDC received!", "success");
      } else {
        console.error('[Faucet] Error:', result.error || result.message);
        setShowFaucetFallback(true); // ★ エラー時に表示
      }
    } catch (e) {
      console.error('[Faucet] Exception:', e);
      setShowFaucetFallback(true); // ★ 例外時にも表示
    } finally {
      setFaucetLoading(false);
    }
  };

  const showConnectView = !connected || !publicKey;
  const drawerZIndex = walletModalVisible ? 'z-[100]' : 'z-[9999]';
  const backdropZIndex = walletModalVisible ? 'z-[99]' : 'z-[9998]';

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${backdropZIndex}`}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 bottom-0 w-[90%] max-w-sm bg-[#080503] border-l border-[rgba(184,134,63,0.15)] ${drawerZIndex} flex flex-col safe-area-top shadow-2xl`}
            >
              <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                <h2 className="font-serif font-bold text-xl text-[#F2E0C8]">
                  {showConnectView ? 'Connect Wallet' : 'My Profile'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full text-[#7A5A30] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                {showConnectView ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <Wallet className="w-10 h-10 text-[#F2E0C8]/30" />
                    </div>
                    <p className="text-[#F2E0C8]/60 mb-8 px-4">
                      Connect your Solana wallet to claim XP and manage your portfolio.
                    </p>
                    <button
                      onClick={handleConnect}
                      className="w-full py-4 bg-gradient-to-r from-[#6B4420] via-[#B8863F] to-[#E8C890] hover:brightness-110 text-black font-bold rounded-xl active:scale-95 transition-all"
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center mb-8">
                      <div
                        className="relative group cursor-pointer"
                        onClick={() => setIsEditOpen(true)}
                      >
                        <div className="w-24 h-24 rounded-full border-2 border-[#B8863F]/30 p-1">
                          <div className="w-full h-full rounded-full bg-[#140E08] overflow-hidden flex items-center justify-center relative">
                            {userData?.avatar_url ? (
                              <img
                                src={api.getProxyUrl(userData.avatar_url)}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-10 h-10 text-[#F2E0C8]/20" />
                            )}
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-gradient-to-r from-[#6B4420] via-[#B8863F] to-[#E8C890] text-[#140D07] p-1.5 rounded-full border border-black shadow-lg group-hover:scale-110 transition-transform">
                          <Edit className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <h3 className="mt-4 text-xl font-bold text-[#F2E0C8]">
                        {userData?.username ||
                          `${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}`}
                      </h3>
                      {userData?.bio ? (
                        <p className="text-sm text-[#7A5A30] text-center mt-1 max-w-[200px] leading-relaxed">
                          {userData.bio}
                        </p>
                      ) : (
                        <button
                          onClick={() => setIsEditOpen(true)}
                          className="text-xs text-[#7A5A30]/50 mt-1 hover:text-[#B8863F] transition-colors"
                        >
                          + Add Bio
                        </button>
                      )}
                    </div>

                    <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#B8863F]/15 bg-[radial-gradient(circle_at_70%_20%,#221509,#0B0704_60%)] p-6 text-center shadow-lg">
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                      <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#B8863F]/8 blur-3xl" />

                      <Trophy className="absolute -right-4 -bottom-4 h-24 w-24 rotate-12 text-[#B8863F]/5 transition-transform duration-500 group-hover:rotate-6" />

                      <div className="relative z-10">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8863F]">
                          Season 0 Rank
                        </p>
                        <h3 className="mb-1 font-serif text-5xl font-bold tracking-tight text-[#F2E0C8] drop-shadow-sm">
                          {userData?.total_xp?.toLocaleString() || 0}
                        </h3>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-sm text-[#7A5A30]">Current XP</p>
                          <span className="rounded border border-[rgba(184,134,63,0.08)] bg-white/5 px-1.5 py-0.5 text-[10px] text-[#F2E0C8]/50">
                            {userData?.rank_tier || 'Novice'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Daily Check-in Button */}
                      <button
                        onClick={handleCheckIn}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B8863F] py-3.5 font-bold text-black shadow-lg shadow-[#6B4420]/20 transition-all active:scale-95 hover:brightness-110 disabled:opacity-50"
                      >
                        {loading ? (
                          <Sparkles className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                        <span>Daily Check-in</span>
                        <span className="rounded bg-black/20 px-1.5 py-0.5 text-xs">+10 XP</span>
                      </button>

                      {/* Faucet Block */}
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleFaucet}
                          disabled={faucetLoading}
                          className={`w-full bg-[#1C1C1E] border border-[rgba(184,134,63,0.3)] text-[#B8863F] py-3 rounded-2xl font-bold flex flex-col items-center justify-center transition-all ${
                            faucetLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#B8863F]/10 active:scale-95'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Coins className="w-5 h-5" />
                            <span>{faucetLoading ? 'Processing...' : 'Get Demo Tokens'}</span>
                          </div>
                          <span className="text-[10px] text-[#B8863F]/70 font-normal mt-0.5">
                            Requires Devnet SOL for gas
                          </span>
                        </button>

                        {/* ★ Faucetフォールバック案内 */}
                        {showFaucetFallback && (
                          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-2 text-red-400">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <p className="text-[11px] font-medium leading-relaxed">
                                Automatic distribution failed due to network congestion or insufficient pool balance.<br />Please claim test SOL from the official faucets below.
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <a 
                                href="https://faucet.quicknode.com/solana/devnet" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between px-3 py-2 bg-black/40 hover:bg-black/60 rounded-lg border border-white/5 text-xs text-white/80 transition-colors"
                              >
                                <span className="font-bold text-[#B8863F]">QuickNode Faucet</span>
                                <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                              </a>
                              <a 
                                href="https://faucet.solana.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between px-3 py-2 bg-black/40 hover:bg-black/60 rounded-lg border border-white/5 text-xs text-white/80 transition-colors"
                              >
                                <span>Solana Faucet</span>
                                <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Invite Button */}
                      <button
                        onClick={() => setIsInviteOpen(true)}
                        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(184,134,63,0.15)] bg-[#140E08] py-3.5 font-bold text-[#F2E0C8] transition-all active:scale-95 hover:bg-[#221509]"
                      >
                        <QrCode className="h-5 w-5 text-[#7A5A30] transition-colors group-hover:text-[#F2E0C8]" />
                        Invite & Earn
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Disconnect Footer */}
              {!showConnectView && publicKey && (
                <div className="mt-auto shrink-0 p-6 pt-0">
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold text-red-500/80 transition-colors hover:bg-red-500/5 hover:text-red-500 disabled:opacity-50"
                  >
                    {isDisconnecting ? (
                      <Sparkles className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      {publicKey && (
        <ProfileEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          currentProfile={{
            pubkey: publicKey.toBase58(),
            username: userData?.is_registered ? userData?.username : undefined,
            bio: userData?.bio,
            avatar_url: userData?.avatar_url,
          }}
          onUpdate={fetchUser}
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
    </>,
    document.body
  );
};