import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

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
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isExistingUser = !!currentProfile.username;

  useEffect(() => {
    if (isOpen) {
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setPfpUrl(currentProfile.avatar_url || '');
    }
  }, [isOpen, currentProfile.username, currentProfile.bio, currentProfile.avatar_url]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large (Max 5MB)", "error");
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadProfileImage(file, currentProfile.pubkey);
      if (res.success && res.key) {
        setPfpUrl(res.key);
        showToast("Image Uploaded", "success");
      } else {
        showToast("Upload Failed", "error");
      }
    } catch {
      showToast("Error uploading image", "error");
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
        showToast(isExistingUser ? "Profile Updated!" : "Welcome to Axis!", "success");
        onUpdate();
        onClose();
      } else {
        showToast(res.error || "Save Failed", "error");
      }
    } catch (e) {
      showToast("System Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = api.getProxyUrl(pfpUrl);

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
              <div className="flex flex-col items-center">
                <div
                  className="relative w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-black/50 group cursor-pointer"
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
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <p className="text-xs text-white/30 mt-2">Tap to upload</p>
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
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
