import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Send, ExternalLink, Loader2, Trash2 } from 'lucide-react';

interface BugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugDrawer = ({ isOpen, onClose }: BugDrawerProps) => {
  const [tgId, setTgId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatus('idle');

    try {
      let imageBase64 = null;
      if (selectedFile) {
        imageBase64 = await convertToBase64(selectedFile);
      }

      const res = await fetch(`${API_BASE_URL}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_tg: tgId,
          message: message,
          image: imageBase64,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to transmit signal');
      }

      setStatus('success');

      setTimeout(() => {
        setStatus('idle');
        onClose();
        setTgId('');
        setMessage('');
        clearFile();
      }, 2000);
    } catch {
      setStatus('error');
      alert('Transmission failed. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#050505] border-t border-white/10 rounded-t-[32px] p-6 pb-12 shadow-[0_-20px_60px_rgba(249,115,22,0.1)] overflow-hidden"
          >
            <div className="flex justify-center mb-8">
              <div className="w-12 h-1 bg-white/10 rounded-full" />
            </div>

            <div className="max-w-md mx-auto relative font-serif">
              <button
                onClick={onClose}
                className="absolute -top-4 right-0 p-2 text-white/30 hover:text-white transition-colors z-10"
              >
                <X size={24} />
              </button>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <p className="text-center text-xs text-white/30 font-sans mb-3 tracking-widest uppercase">
                  Direct Line
                </p>

                <a
                  href="https://t.me/muse_jp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block overflow-hidden rounded-2xl border border-orange-500/20 group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-950/80 via-black to-neutral-950 opacity-90 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />

                  <div className="relative p-5 flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-orange-500 blur-md opacity-20 rounded-full" />
                      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-orange-500/30">
                        <img
                          src="/muse.png"
                          alt="Founder"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-serif text-xl italic tracking-wide">
                          Muse
                        </span>
                        <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-bold rounded-sm tracking-widest">
                          FOUNDER
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/40 text-xs font-sans">
                        <Send size={12} className="text-orange-500/50" />
                        <span className="group-hover:text-white/70 transition-colors">
                          @muse_jp
                        </span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 border border-white/5 group-hover:bg-orange-500 group-hover:text-black group-hover:border-orange-500 transition-all duration-300">
                      <ExternalLink size={14} />
                    </div>
                  </div>
                </a>
              </motion.div>

              <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
                <span className="text-[10px] text-white/20 whitespace-nowrap font-sans tracking-widest">
                  OR SEND SIGNAL
                </span>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
              </div>

              {status === 'success' ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-8 text-center"
                >
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400 border border-orange-500/20">
                    <Send size={32} />
                  </div>
                  <p className="text-2xl italic text-white mb-2">Signal Transmitted.</p>
                  <p className="text-sm font-sans text-white/40">
                    We will analyze your report shortly.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={submitReport} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-orange-500/70 uppercase tracking-widest font-sans font-bold pl-1">
                      Your ID
                    </label>
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors font-mono">
                        @
                      </span>
                      <input
                        name="user_tg"
                        type="text"
                        value={tgId}
                        onChange={(e) => setTgId(e.target.value)}
                        placeholder="Telegram Username"
                        className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-orange-500/40 focus:bg-[#161616] transition-all font-sans text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-orange-500/70 uppercase tracking-widest font-sans font-bold pl-1">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Report a bug or suggest a feature..."
                      className="w-full h-32 bg-[#111] border border-white/10 rounded-xl p-4 text-white placeholder:text-white/10 focus:outline-none focus:border-orange-500/40 focus:bg-[#161616] transition-all resize-none font-serif leading-relaxed text-base"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />

                    {!selectedFile ? (
                      <motion.button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 border border-dashed border-white/10 rounded-xl flex items-center justify-center gap-2 text-white/30 hover:text-white/60 hover:border-white/20 transition-all group"
                      >
                        <ImageIcon
                          size={16}
                          className="group-hover:rotate-12 transition-transform"
                        />
                        <span className="text-xs font-sans tracking-wide">Attach Screenshot</span>
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-xl overflow-hidden border border-white/10 group"
                      >
                        {previewUrl && (
                          <div className="h-32 w-full bg-[#111] relative">
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover opacity-60"
                            />
                          </div>
                        )}

                        <div className="absolute inset-0 flex items-center justify-between p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <span className="text-xs text-white font-mono truncate max-w-[70%]">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={clearFile}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, shadow: '0 0 20px rgba(249,115,22,0.2)' }}
                    whileTap={{ scale: 0.96 }}
                    disabled={isSending}
                    type="submit"
                    className="w-full bg-white text-black py-3.5 rounded-xl font-serif text-lg font-bold flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all disabled:opacity-50 mt-4"
                  >
                    {isSending ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <span>Transmit Signal</span>
                        <Send size={18} />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
