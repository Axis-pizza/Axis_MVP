import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Image as ImageIcon, UploadCloud, Mail, Key } from 'lucide-react';
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

type Step = 'EMAIL' | 'OTP' | 'PROFILE';

export const ProfileEditModal = ({
  isOpen,
  onClose,
  currentProfile,
  onUpdate,
}: ProfileEditModalProps) => {

  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentProfile.username) {
        setStep('PROFILE');
        setUsername(currentProfile.username);
        setBio(currentProfile.bio || '');
        setPfpUrl(currentProfile.avatar_url || '');
      } else {
        setStep(prev => (prev === 'OTP' || prev === 'PROFILE') ? prev : 'EMAIL');
      }
    }
  }, [isOpen]);

  const handleRequestInvite = async () => {
    if (!email.includes('@')) return showToast("Invalid Email", "error");
    setLoading(true);
    try {
      const res = await api.requestInvite(email);
      if (res.success) {
        setStep('OTP');
        showToast("Code sent to your email!", "success");
      } else {
        showToast(res.error || "Failed to send code", "error");
      }
    } catch (e) {
      showToast("Network Error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) return showToast("Invalid Code", "error");
    setInviteCode(otp); 
    setStep('PROFILE');
  };

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
    } catch (e) {
      console.error(e);
      showToast("Error uploading image", "error");
    } finally {
      setUploading(false);
    }
  };


  const handleSave = async () => {
    setLoading(true);
    try {
      if (currentProfile.username) {
        const res = await api.updateProfile({
          wallet_address: currentProfile.pubkey,
          username: username,
          bio: bio,
          pfpUrl: pfpUrl,
        });
        if (res.success) {
            showToast("Profile Updated!", "success");
            onUpdate();
            onClose();
        } else {
            showToast("Update Failed", "error");
        }
      } else {

        const res = await api.register({
          email: email,
          wallet_address: currentProfile.pubkey,
          invite_code_used: inviteCode,
          name: username,
          bio: bio,
          avatar_url: pfpUrl
        });
        
        if (res.success) {
          showToast("Welcome to Axis!", "success");
          onUpdate();
          onClose();
        } else {
          showToast(res.error || "Registration Failed", "error");
        }
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
          className="w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {currentProfile.username ? 'Edit Profile' : 'Create Account'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {step === 'EMAIL' && (
              <div className="space-y-4">
                <p className="text-white/70">Enter your email to receive an invite code.</p>
                <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                  <Mail className="text-white/30 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent p-4 text-white focus:outline-none"
                  />
                </div>
                <button 
                  onClick={handleRequestInvite}
                  disabled={loading}
                  className="w-full py-4 bg-white text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            )}

            {step === 'OTP' && (
              <div className="space-y-4">
                <p className="text-white/70">Enter the code sent to {email}</p>
                <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                  <Key className="text-white/30 w-5 h-5" />
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.toUpperCase())}
                    placeholder="AXIS-XXXX"
                    className="w-full bg-transparent p-4 text-white focus:outline-none font-mono tracking-widest"
                  />
                </div>
                <button 
                  onClick={handleVerifyOtp}
                  className="w-full py-4 bg-[#D97706] text-black font-bold rounded-xl hover:opacity-90"
                >
                  Verify & Continue
                </button>
              </div>
            )}


            {step === 'PROFILE' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                   <div 
                    className="relative w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-black/50 group cursor-pointer"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    {uploading ? (
                       <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                         <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
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
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#D97706]"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 ml-1 mb-1 block">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Bio"
                    rows={3}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#D97706]"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={loading || uploading}
                  className="w-full py-4 bg-gradient-to-r from-[#D97706] to-amber-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {currentProfile.username ? 'Save Changes' : 'Complete Registration'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};