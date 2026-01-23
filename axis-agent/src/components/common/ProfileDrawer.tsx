import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Trophy, Wallet, Sparkles, LogOut, CheckCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const ProfileDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { showToast } = useToast();
  const { publicKey, disconnect } = useWallet();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ユーザーデータ取得
  const fetchUser = async () => {
    if (!publicKey) return;
    const res = await api.getUser(publicKey.toBase58());
    if (res.success) setUserData(res.user);
  };

  useEffect(() => {
    if (isOpen) fetchUser();
  }, [isOpen, publicKey]);

  const handleCheckIn = async () => {
    if (!publicKey) return;
    setLoading(true);
    
    try {
      console.log("👉 Check-in button clicked");
      const res = await api.dailyCheckIn(publicKey.toBase58());
      console.log("👈 API Result:", res);
      
      if (res.success) {
        setUserData(res.user);
        showToast("XP Claimed Successfully! (+10 XP)", "success");
      } else {
        // エラー内容を全て表示
        const errorMsg = res.message || res.error || JSON.stringify(res);
        console.error("❌ Check-in Failed Logic:", errorMsg);
        showToast(errorMsg, "error");
      }
    } catch (e: any) {
      console.error("❌ System Error:", e);
      showToast(`System Error: ${e.message}`, "error");
    }
    
    setLoading(false);
  };

  const handleCopyInvite = () => {
    if (!publicKey) return;
    const link = `${window.location.origin}/?ref=${publicKey.toBase58()}`;
    navigator.clipboard.writeText(link);
    showToast("Invite Link Copied to Clipboard!", "success");
  };

  if (!publicKey) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
          <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:25}} className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#0C0A09] border-l border-white/10 z-[70] p-6 flex flex-col safe-area-top">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-serif font-bold text-xl text-white">Profile</h2>
              <button onClick={onClose}><X className="text-[#78716C]" /></button>
            </div>

            {/* XP Card */}
            <div className="bg-gradient-to-br from-[#1C1917] to-[#292524] rounded-2xl p-6 border border-[#D97706]/20 mb-6 text-center relative overflow-hidden">
               <Trophy className="absolute -right-4 -bottom-4 w-24 h-24 text-[#D97706]/10 rotate-12" />
               <p className="text-xs text-[#D97706] uppercase tracking-widest font-bold mb-2">Season 0 (Devnet)</p>
               <h3 className="text-5xl font-serif font-bold text-white mb-2">{userData?.total_xp?.toLocaleString() || 0}</h3>
               <p className="text-sm text-[#78716C]">Current XP</p>
            </div>

            {/* Actions */}
            <div className="space-y-3 mb-8">
              <button 
                onClick={handleCheckIn}
                disabled={loading}
                className="w-full py-4 bg-[#D97706] text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {loading ? <Sparkles className="animate-spin" /> : <CheckCircle />}
                Daily Check-in (+10 XP)
              </button>

              <button 
                onClick={handleCopyInvite}
                className="w-full py-4 bg-[#1C1917] border border-white/10 text-[#E7E5E4] font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Copy /> Copy Invite Link
              </button>
            </div>

            {/* Footer */}
            <button onClick={disconnect} className="mt-auto flex items-center gap-2 text-red-500 font-bold text-sm">
              <LogOut className="w-4 h-4" /> Disconnect Wallet
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};