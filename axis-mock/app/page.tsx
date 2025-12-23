"use client";

import { useEffect, useState } from "react";
import { useAxisStore } from "@/app/store/useAxisStore";
import { ExplorePage } from "@/components/pages/ExplorePage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Twitter, ArrowRight, Loader2, CheckCircle2, Wallet, Mail } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { sendOtpEmail } from "@/app/actions/auth";

const API_URL = "https://axis-api.yusukekikuta-05.workers.dev";

export default function Home() {
  const { isRegistered, registerUser, login } = useAxisStore();
  const { publicKey } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isFollowed, setIsFollowed] = useState(false);


  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return <div className="min-h-screen bg-black" />;
  if (isRegistered) return <ExplorePage />;

  // --- Handlers ---

  const handleVerifyInvite = async () => {
    if (!inviteCode) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/verify-invite?code=${inviteCode}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setIsLoading(false);
        toast.success("Code valid.");
        setStep(2);
      } else {
        setIsLoading(false);
        toast.error("Invalid or used Invite Code.");
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("Connection error.");
    }
  };

  const handleSendOtp = async () => {
    if (!email.includes("@")) return toast.error("Invalid email.");
    if (!isFollowed) return toast.error("Please follow us on X.");
    setIsLoading(true);
    const res = await sendOtpEmail(email);
    setIsLoading(false);
    if (res.success) {
      toast.success("Code sent to " + email);
      setStep(3);
    } else {
      toast.error("Failed to send code.");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setIsLoading(true);

    try {
      // BackendでOTP検証 (ここでDB更新完了 & Inviteコード消費完了)
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          code: otp, 
          inviteCode, 
          walletAddress: publicKey ? publicKey.toString() : "" 
        }),
      });
      const data = await res.json();

      if (data.success) {
        // ★修正ポイント: registerUser (APIコール) は呼ばない！
        // APIから返ってきた最新のユーザー情報を使ってStoreを更新
        login(data.user);
        
        setIsLoading(false);
        setIsModalOpen(false);
        toast.success("Welcome to Axis Protocol.");
        
        // isRegisteredがtrueになったので、Reactの再レンダリングで自動的にExplorePageへ切り替わります
      } else {
        setIsLoading(false);
        toast.error(data.message || "Invalid code.");
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      toast.error("Verification failed.");
    }
  };

  const handleTwitterClick = () => {
    window.open("https://twitter.com/Axis__Solana", "_blank"); 
    setTimeout(() => setIsFollowed(true), 2000); 
  };

  return (
    // ★修正: レイアウトコンテナを整理
    <div className="relative min-h-screen w-full text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Effects (Absolute, but behind content) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/10 blur-[120px] rounded-full" />
      </div>

      <Toaster position="top-center" theme="dark" />
      
      {/* Main Content (Relative z-10) */}
      <main className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center space-y-12">
        
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-xs font-medium tracking-widest uppercase backdrop-blur-md">
            Axis Protocol v0 (Devnet)
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold font-serif tracking-tighter text-white leading-[0.95]">
            Your Strategy.<br/>
            <span className="text-neutral-500">Your ETF.</span>
          </h1>
          
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto font-light leading-relaxed font-serif italic">
            The first self-rebalancing vault protocol on Solana.<br/>
            Create, trade, and manage on-chain index funds powered by MEV.
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <Button 
            size="lg" 
            onClick={() => setIsModalOpen(true)}
            className="h-16 px-12 rounded-full bg-white text-black hover:bg-neutral-200 transition-all font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105"
          >
            Enter Closed Beta <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-neutral-600 font-serif">
            Invite code required. <span className="underline decoration-dotted cursor-help text-neutral-500 hover:text-white transition-colors" title="Check our X for drops">Don't have one?</span>
          </p>
        </div>

      </main>

      {/* --- Footer (Optional) --- */}
      <footer className="absolute bottom-8 text-xs text-neutral-700 font-mono">
        © 2025 Axis Protocol. All rights reserved.
      </footer>

      {/* --- Modal (Fixed) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-neutral-800 text-white shadow-2xl shadow-black p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <DialogTitle className="text-2xl font-bold tracking-tight font-serif text-white">
              {step === 1 ? "Enter Invite Code" : step === 2 ? "Create Profile" : "Verify Email"}
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              {step === 1 ? "Axis is currently in closed beta." : 
               step === 2 ? "Complete tasks to generate access key." : 
               `Enter the 6-digit code sent to ${email}`}
            </DialogDescription>
          </div>

          <div className="p-6 pt-4 space-y-6">
            {/* Step 1 */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-neutral-500">Invite Code</Label>
                  <Input 
                    placeholder="AXIS-XXXXX" 
                    className="bg-neutral-950 border-neutral-800 focus:border-white h-14 font-mono text-center text-xl tracking-widest uppercase text-white placeholder:text-neutral-700"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    autoFocus
                  />
                </div>
                <Button className="w-full bg-white text-black hover:bg-neutral-200 font-bold h-12 text-lg" onClick={handleVerifyInvite} disabled={!inviteCode || isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Verify Code"}
                </Button>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-neutral-500">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-neutral-500" size={18} />
                    <Input type="email" placeholder="you@example.com" className="bg-neutral-950 border-neutral-800 focus:border-white h-11 pl-10 text-white" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className={`p-3 border rounded-xl cursor-pointer flex items-center justify-between transition-colors ${isFollowed ? "bg-white/5 border-white/20" : "bg-neutral-950 border-neutral-800 hover:bg-neutral-900"}`} onClick={handleTwitterClick}>
                  <div className="flex items-center gap-3"><Twitter className={isFollowed ? "text-white" : "text-neutral-500"} size={18} /><span className="text-sm font-medium text-neutral-300">{isFollowed ? "Followed @Axis__Solana" : "Follow @Axis__Solana"}</span></div>
                  {isFollowed && <CheckCircle2 size={18} className="text-emerald-500" />}
                </div>
                <Button className="w-full bg-white text-black hover:bg-neutral-200 font-bold h-12 text-lg" onClick={handleSendOtp} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Send Login Code"}
                </Button>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <>
                <Input placeholder="000000" className="h-16 w-full text-center text-4xl tracking-[0.5em] font-mono bg-neutral-950 border-neutral-800 focus:border-white text-white" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus />
                <Button className="w-full bg-white text-black hover:bg-neutral-200 font-bold h-12 text-lg" onClick={handleVerifyOtp} disabled={isLoading || otp.length < 6}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Enter Axis"}
                </Button>
                <button onClick={() => setStep(2)} className="w-full text-xs text-neutral-500 hover:text-white">Change email</button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}