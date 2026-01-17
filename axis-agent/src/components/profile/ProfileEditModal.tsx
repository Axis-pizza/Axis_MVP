/**
 * ProfileEditModal - Edit user profile (name, bio, PFP)
 * SNS-style profile editing
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { ImageUpload } from '../common/ImageUpload';
import { api } from '../../services/api';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  currentProfile: {
    username?: string;
    bio?: string;
    pfpUrl?: string;
  };
  onSave: (data: { username?: string; bio?: string; pfpUrl?: string }) => void;
  isRegistration?: boolean;
}

export const ProfileEditModal = ({
  isOpen,
  onClose,
  walletAddress,
  currentProfile,
  onSave,
  isRegistration = false,
}: ProfileEditModalProps) => {
  const [username, setUsername] = useState(currentProfile.username || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [pfpUrl, setPfpUrl] = useState(currentProfile.pfpUrl || '');
  
  // Registration fields
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [regStep, setRegStep] = useState<'EMAIL' | 'CODE'>('EMAIL'); // EMAIL -> CODE
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setPfpUrl(currentProfile.pfpUrl || '');
      setEmail('');
      setInviteCode('');
      setRegStep('EMAIL'); // Reset step
      setError(null);
    }
  }, [isOpen, currentProfile]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      let result;
      
      if (isRegistration) {
        // Step 1: Request Invite Code
        if (regStep === 'EMAIL') {
           if (!email) throw new Error('Email is required');
           
           result = await api.requestInvite(email);
           if (result.success) {
             setRegStep('CODE');
             setSaving(false);
             return; // Stop here, wait for code input
           } else {
             throw new Error(result.error || 'Failed to send invite code');
           }
        }

        // Step 2: Complete Registration
        if (!email || !inviteCode) {
            throw new Error('Email and Invite Code are required');
        }
        
        result = await api.register({
            email,
            wallet_address: walletAddress,
            invite_code_used: inviteCode,
            avatar_url: pfpUrl || undefined,
            name: username || undefined,
            bio: bio || undefined
        });

      } else {
        // Update existing profile
        result = await api.updateProfile({
            wallet_address: walletAddress,
            name: username || undefined,
            bio: bio || undefined,
            avatar_url: pfpUrl || undefined,
        });
      }

      if (result.success) {
        onSave({ username, bio, pfpUrl });
        onClose();
      } else {
        throw new Error(result.error || (isRegistration ? 'Registration failed' : 'Failed to save profile'));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Operation failed';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setPfpUrl(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed inset-x-4 top-[15%] bottom-[5%] md:inset-x-auto md:w-[480px] md:left-1/2 md:-translate-x-1/2 bg-[#121212] border border-white/10 rounded-3xl z-[70] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold">{isRegistration ? 'Link Email to Wallet' : 'Edit Profile'}</h2>
                <p className="text-xs text-white/50">{isRegistration ? 'Register to access the network' : 'Customize your identity'}</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Registration Fields - ONLY visible during registration */}
              {isRegistration ? (
                <div className="space-y-6">
                   <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <p className="text-sm text-orange-200 mb-2">Initialize your Axis account.</p>
                      <ul className="text-xs text-orange-200/70 list-disc list-inside space-y-1">
                        <li>Link your email for notifications</li>
                        <li>Enter your exclusive invite code</li>
                      </ul>
                   </div>

                   {/* Step 1: Email */}
                   <div className={regStep === 'CODE' ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="text-sm text-white/50 mb-2 block font-medium">Email Address <span className="text-orange-500">*</span></label>
                    <input
                      type="email"
                      value={email}
                      disabled={regStep === 'CODE'}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                  
                  {/* Step 2: Invite Code (Only shows after email sent) */}
                  <AnimatePresence>
                    {regStep === 'CODE' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                      >
                        <label className="text-sm text-white/50 mb-2 block font-medium">
                            Invite Code <span className="text-orange-500">*</span>
                            <span className="ml-2 text-xs text-green-400 font-normal">Sent to email!</span>
                        </label>
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="AXIS-XXXX"
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-colors uppercase font-mono tracking-widest"
                        />
                         <button 
                            onClick={() => setRegStep('EMAIL')}
                            className="text-xs text-white/30 hover:text-white mt-2 underline"
                         >
                            Change Email
                         </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* Profile Edit Fields - ONLY visible during editing */
                <div className="space-y-6">
                  {/* PFP Upload */}
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-white/50 mb-4">Profile Picture</p>
                    {pfpUrl ? (
                      <div className="relative group">
                        <img 
                          src={pfpUrl} 
                          alt="Profile" 
                          className="w-32 h-32 rounded-full object-cover border-4 border-white/10"
                        />
                        <button
                          onClick={() => setPfpUrl('')}
                          className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <span className="text-xs text-white">Change</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32">
                        <ImageUpload
                          walletAddress={walletAddress}
                          type="profile"
                          onUploadComplete={handleImageUpload}
                          className="h-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Display Name</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={50}
                      placeholder="Enter your name..."
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                    <p className="text-xs text-white/30 mt-1 text-right">{username.length}/50</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={200}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                    />
                    <p className="text-xs text-white/30 mt-1 text-right">{bio.length}/200</p>
                  </div>
                </div>
              )}

              {/* Wallet Info (Always visible or maybe move to bottom) */}
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/30 mb-1">Wallet Address</p>
                <p className="font-mono text-sm text-white/70 break-all">{walletAddress}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 shrink-0">
              <button
                onClick={handleSave}
                disabled={
                  saving || 
                  (isRegistration 
                    ? (regStep === 'EMAIL' ? !email : !inviteCode)
                    : false
                  )
                }
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isRegistration ? (regStep === 'EMAIL' ? 'Sending Code...' : 'Registering...') : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isRegistration ? (regStep === 'EMAIL' ? 'Get Access Code' : 'Complete Registration') : 'Save Profile'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
