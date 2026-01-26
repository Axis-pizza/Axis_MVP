import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Trophy, LogOut, CheckCircle, Sparkles, Edit, User, Droplets, Wallet } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../../hooks/useWallet';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConnectWallet } from "@privy-io/react-auth";

import { ProfileEditModal } from './ProfileEditModal';

export const ProfileDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { showToast } = useToast();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { connectWallet } = useConnectWallet();
  const { publicKey, disconnect, ready } = useWallet();

  const fetchUser = async () => {
    if (!publicKey) return;
    const res = await api.getUser(publicKey.toBase58());
    if (res.success || res.user) {
       setUserData(res.user || res);
    }
  };

  useEffect(() => {
    if (isOpen) fetchUser();
  }, [isOpen, publicKey]);

  const handleCheckIn = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await api.dailyCheckIn(publicKey.toBase58());
      if (res.success) {
        setUserData(res.user);
        showToast("✅ +10 XP Claimed!", "success");
      } else {
        showToast(res.message || "Check-in failed", "error");
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "error");
    }
    setLoading(false);
  };

  const handleFaucet = async () => {
    if (!publicKey) return;
    setFaucetLoading(true);
    try {
      const res = await api.requestFaucet(publicKey.toBase58()); 
      if (res.success) {
        showToast("💰 1,000 USDC (Devnet) Sent!", "success");
      } else {
        window.open("https://faucet.circle.com/", "_blank");
        showToast("Please use the external faucet", "info");
      }
    } catch (e) {
       window.open("https://faucet.circle.com/", "_blank");
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (!publicKey) return;
    const link = `${window.location.origin}/?ref=${publicKey.toBase58()}`;
    navigator.clipboard.writeText(link);
    showToast("Invite Link Copied!", "success");
  };

  const handleConnect = async () => {
    try {
      await connectWallet({
        walletList: ["wallet_connect_qr", "wallet_connect"],
        walletChainType: "solana",
      });
      // publicKeyが入ったらuseEffectでfetchUserが走る
    } catch (e: any) {
      showToast(e?.message ?? "Failed to connect wallet", "error");
    }
  };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
              onClick={onClose} 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" 
            />
            
            <motion.div 
              initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} 
              transition={{type:'spring', damping:25, stiffness: 200}} 
              className="fixed top-0 right-0 bottom-0 w-[90%] max-w-sm bg-[#0C0A09] border-l border-white/10 z-[9999] flex flex-col safe-area-top shadow-2xl"
            >
              
              <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                <h2 className="font-serif font-bold text-xl text-white">
                    {publicKey ? "My Profile" : "Connect Wallet"}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-[#78716C] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
              {!ready || !publicKey ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <Wallet className="w-10 h-10 text-white/30" />
                    </div>

                    <p className="text-white/60 mb-8 px-4">
                      Connect via WalletConnect to claim your XP and manage your
                      portfolio.
                    </p>

                    <button
                      onClick={handleConnect}
                      className="w-full py-4 bg-[#D97706] hover:bg-[#b45309] text-black font-bold rounded-xl active:scale-95 transition-all"
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer" onClick={() => setIsEditOpen(true)}>
                        <div className="w-24 h-24 rounded-full border-2 border-[#D97706]/30 p-1">
                        <div className="w-full h-full rounded-full bg-[#1C1917] overflow-hidden flex items-center justify-center">
                            {userData?.avatar_url ? (
                            <img src={api.getProxyUrl(userData.avatar_url)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                            <User className="w-10 h-10 text-white/20" />
                            )}
                        </div>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-[#D97706] text-black p-1.5 rounded-full border border-black shadow-lg group-hover:scale-110 transition-transform">
                        <Edit className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    <h3 className="mt-4 text-xl font-bold text-white">
                        {userData?.username || `${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}`}
                    </h3>
                    {userData?.bio ? (
                        <p className="text-sm text-[#78716C] text-center mt-1 max-w-[200px] leading-relaxed">
                        {userData.bio}
                        </p>
                    ) : (
                        <button onClick={() => setIsEditOpen(true)} className="text-xs text-[#78716C]/50 mt-1 hover:text-[#D97706] transition-colors">
                        + Add Bio
                        </button>
                    )}
                    </div>

                    <div className="bg-gradient-to-br from-[#1C1917] to-[#292524] rounded-2xl p-6 border border-[#D97706]/20 mb-6 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                    <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-[#D97706]/10 rotate-12 group-hover:rotate-6 transition-transform duration-500" />
                    
                    <div className="relative z-10">
                        <p className="text-[10px] text-[#D97706] uppercase tracking-[0.2em] font-bold mb-2">Season 0 Rank</p>
                        <h3 className="text-5xl font-serif font-bold text-white mb-1 tracking-tight">
                        {userData?.total_xp?.toLocaleString() || 0}
                        </h3>
                        <div className="flex items-center justify-center gap-2">
                        <p className="text-sm text-[#78716C]">Current XP</p>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/50 border border-white/5">
                            {userData?.rank_tier || 'Novice'}
                        </span>
                        </div>
                    </div>
                    </div>

                    <div className="space-y-3">
                    <button 
                        onClick={handleCheckIn}
                        disabled={loading}
                        className="w-full py-3.5 bg-[#D97706] hover:bg-[#b45309] text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-orange-900/20"
                    >
                        {loading ? <Sparkles className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        <span>Daily Check-in</span>
                        <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs">+10 XP</span>
                    </button>

                    <button 
                        onClick={handleFaucet}
                        disabled={faucetLoading}
                        className="w-full py-3.5 bg-[#1C1917] hover:bg-[#292524] border border-blue-500/20 text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        {faucetLoading ? <Sparkles className="animate-spin w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                        Get Devnet USDC
                    </button>

                    <button 
                        onClick={handleCopyInvite}
                        className="w-full py-3.5 bg-[#1C1917] hover:bg-[#292524] border border-white/10 text-[#E7E5E4] font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <Copy className="w-5 h-5" /> Copy Invite Link
                    </button>
                    </div>
                  </>
                )}
              </div>

              {!!publicKey && (
                <div className="p-6 pt-0 mt-auto shrink-0">
                  <button
                    onClick={disconnect}
                    className="w-full flex items-center justify-center gap-2 text-red-500/80 hover:text-red-500 font-bold text-sm py-2 hover:bg-red-500/5 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Disconnect Wallet
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfileEditModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)}
        currentProfile={{
          pubkey: publicKey?.toBase58() || '', // nullチェックを追加
          username: userData?.username,
          bio: userData?.bio,
          avatar_url: userData?.avatar_url,
        }}
        onUpdate={fetchUser}
      />
    </>,
    document.body
  );
};