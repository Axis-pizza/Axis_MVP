import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Image as ImageIcon, UploadCloud, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    pubkey: string;
    username?: string;
    bio?: string;
    avatar_url?: string;
  };
  onUpdate: () => void;
}

export const ProfileEditModal = ({
  isOpen,
  onClose,
  currentProfile,
  onUpdate,
}: ProfileEditModalProps) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const twitterPopupRef = useRef<Window | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [twitterLinked, setTwitterLinked] = useState(false);
  const [twitterName, setTwitterName] = useState('');
  const [avatarKey, setAvatarKey] = useState(0);

  // モバイル判定用のステートを追加
  const [isMobile, setIsMobile] = useState(false);

  const isExistingUser = !!currentProfile.username;

  // モバイル判定ロジック
  useEffect(() => {
    // ユーザーエージェントで簡易判定（必要に応じて window.innerWidth < 768 なども追加可能）
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setPfpUrl(currentProfile.avatar_url || '');
      setTwitterLinked(false);
      setTwitterName('');
    }
  }, [isOpen, currentProfile.username, currentProfile.bio, currentProfile.avatar_url]);

  // Listen for Twitter OAuth postMessage callback
  const handleTwitterMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type !== 'AXIS_AUTH_SUCCESS') return;
      if (event.data?.provider !== 'twitter') return;

      const user = event.data.user;
      if (user?.avatar_url) {
        setPfpUrl(user.avatar_url);
        setAvatarKey((prev) => prev + 1);
      }
      if (user?.name) {
        setTwitterName(user.name);
        if (!username) {
          setUsername(user.name);
        }
      }

      setTwitterLinked(true);
      setTwitterLoading(false);
      twitterPopupRef.current?.close();
      twitterPopupRef.current = null;
      showToast('X account linked successfully!', 'success');
    },
    [showToast, username]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('message', handleTwitterMessage);
    return () => window.removeEventListener('message', handleTwitterMessage);
  }, [isOpen, handleTwitterMessage]);

  const handleConnectTwitter = () => {
    if (!currentProfile.pubkey) {
      showToast('Wallet not connected', 'error');
      return;
    }
    // ここでの判定は念のため残しますが、UI側で非表示になるため到達しません
    setTwitterLoading(true);
    const authUrl = api.getTwitterAuthUrl(currentProfile.pubkey);
    const w = 500,
      h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    twitterPopupRef.current = window.open(
      authUrl,
      'twitter_auth',
      `width=${w},height=${h},left=${left},top=${top},popup=yes`
    );

    const checkClosed = setInterval(() => {
      if (twitterPopupRef.current?.closed) {
        clearInterval(checkClosed);
        setTwitterLoading(false);
        twitterPopupRef.current = null;
      }
    }, 500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large (Max 5MB)', 'error');
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadProfileImage(file, currentProfile.pubkey);
      if (res.success && res.key) {
        setPfpUrl(res.key);
        setAvatarKey((prev) => prev + 1);
        showToast('Image Uploaded', 'success');
      } else {
        showToast('Upload Failed', 'error');
      }
    } catch {
      showToast('Error uploading image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.updateProfile({
        wallet_address: currentProfile.pubkey,
        username: username,
        bio: bio,
        pfpUrl: pfpUrl,
      });

      if (res.success) {
        showToast(isExistingUser ? 'Profile Updated!' : 'Welcome to Axis!', 'success');
        onUpdate();
        onClose();
      } else {
        showToast(res.error || 'Save Failed', 'error');
      }
    } catch (e) {
      showToast('System Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = pfpUrl?.startsWith('http') ? pfpUrl : api.getProxyUrl(pfpUrl);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-gradient-to-b from-[#140E08] to-[#080503] border border-[rgba(184,134,63,0.15)] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-[rgba(184,134,63,0.1)] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#F2E0C8]">
              {isExistingUser ? 'Edit Profile' : 'Create Account'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <motion.div
                    key={avatarKey}
                    initial={avatarKey > 0 ? { scale: 0.8, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`relative w-32 h-32 rounded-full overflow-hidden bg-black/50 group cursor-pointer ${
                      twitterLinked
                        ? 'border-4 border-[#1D9BF0]'
                        : displayUrl
                          ? 'border-4 border-[#B8863F]/50'
                          : 'border-4 border-white/10'
                    }`}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-8 h-8 text-[#B8863F] animate-spin" />
                      </div>
                    ) : displayUrl ? (
                      <img src={displayUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <UploadCloud className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>

                  {/* X badge on avatar (モバイル以外の場合のみ表示) */}
                  {twitterLinked && !isMobile && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1D9BF0] rounded-full flex items-center justify-center border-2 border-[#140E08] shadow-lg"
                    >
                      <XIcon className="w-4 h-4 fill-white" />
                    </motion.div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <p className="text-xs text-white/30 mt-2">Tap to upload</p>

                {/* X Connect Section - Mobileの場合は非表示にする */}
                {!isMobile && (
                  <>
                    {/* Divider */}
                    <div className="flex items-center gap-3 w-full mt-3">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-white/30">or</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Import from X button */}
                    {twitterLinked ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-[#1D9BF0]/10 border border-[#1D9BF0]/30 rounded-xl"
                      >
                        <XIcon className="w-4 h-4 fill-[#1D9BF0]" />
                        <span className="text-sm text-[#1D9BF0] font-medium">
                          {twitterName || 'Connected'}
                        </span>
                        <Check className="w-4 h-4 text-[#1D9BF0]" />
                      </motion.div>
                    ) : (
                      <button
                        onClick={handleConnectTwitter}
                        disabled={twitterLoading}
                        className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-black border border-white/15 rounded-xl text-white/80 text-sm font-medium hover:bg-white/5 hover:border-white/25 transition-colors disabled:opacity-50"
                      >
                        {twitterLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XIcon className="w-4 h-4 fill-current" />
                        )}
                        Import from X
                      </button>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="text-xs text-white/50 ml-1 mb-1 block">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full p-4 bg-[#080503] border border-[rgba(184,134,63,0.15)] rounded-xl text-[#F2E0C8] focus:outline-none focus:border-[#B8863F]"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 ml-1 mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Bio"
                  rows={3}
                  className="w-full p-4 bg-[#080503] border border-[rgba(184,134,63,0.15)] rounded-xl text-[#F2E0C8] focus:outline-none focus:border-[#B8863F]"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={loading || uploading}
                className="w-full py-4 bg-gradient-to-r from-[#6B4420] via-[#B8863F] to-[#E8C890] text-[#140D07] font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-[0_0_12px_rgba(184,134,63,0.35)]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isExistingUser ? 'Save Changes' : 'Complete Registration'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
