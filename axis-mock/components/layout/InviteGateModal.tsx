"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "https://axis-api.yusukekikuta-05.workers.dev";
//   process.env.NEXT_PUBLIC_API_URL || "https://axis-api.yusukekikuta-05.workers.dev";

interface InviteGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (code: string) => void;
}

export function InviteGateModal({ isOpen, onClose, onVerified }: InviteGateModalProps) {
  const [step, setStep] = useState<"follow" | "code">("code");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);

  const handleVerify = async () => {
    if (!inviteCode) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/check-invite?code=${inviteCode}`);
      const data = await res.json();
      
      if (res.ok && data.valid) {
        toast.success("Invite code verified!");
        // コードが有効なら次のステップへ（またはXフォロー済みなら完了）
        if (isFollowed) {
            onVerified(inviteCode);
        } else {
            setStep("follow");
        }
      } else {
        toast.error(data.message || "Invalid invite code");
      }
    } catch (e) {
      toast.error("Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowClick = () => {
    window.open("https://twitter.com/Axis__Solana", "_blank");
    setIsFollowed(true);
  };

  const handleComplete = () => {
      if (isFollowed) {
          onVerified(inviteCode);
      } else {
          toast.error("Please follow us on X first!");
      }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-[400px] overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                EARLY ACCESS
              </h2>
              <p className="mt-2 text-xs text-neutral-400">
                Axis is currently in private beta.
              </p>
            </div>

            {step === "code" && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase">
                            Enter Invite Code
                        </label>
                        <Input 
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="AXIS-XXXX"
                            className="border-white/10 bg-white/5 text-center text-lg font-mono tracking-widest text-white placeholder:text-neutral-700"
                        />
                    </div>
                    <Button
                        onClick={handleVerify}
                        disabled={isLoading || !inviteCode}
                        className="w-full bg-[#14F195] font-bold text-black hover:bg-[#10c479]"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : "VERIFY CODE"}
                    </Button>
                    <div className="text-center">
                        <p className="text-[10px] text-neutral-600">
                            Don't have a code? Check our X for drops.
                        </p>
                    </div>
                </div>
            )}

            {step === "follow" && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="mb-4 text-sm text-neutral-300">
                            To complete your registration, please follow the official Axis Protocol account.
                        </p>
                        <Button
                            onClick={handleFollowClick}
                            variant="outline"
                            className="w-full gap-2 border-white/10 hover:bg-white/10 hover:text-white"
                        >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            Follow @Axis__Solana
                        </Button>
                    </div>

                    <Button
                        onClick={handleComplete}
                        className="w-full bg-[#14F195] font-bold text-black hover:bg-[#10c479]"
                    >
                        I'VE FOLLOWED <ArrowRight size={16} className="ml-2" />
                    </Button>
                </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}