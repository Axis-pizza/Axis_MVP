"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAxisStore } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
} from "@/components/ui/dialog";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from "recharts";
import { 
  TrendingUp, Copy, Check, Gift, 
  Settings, Save, BadgeCheck, Lock, Upload, Image as ImageIcon,
  LayoutGrid, Users, QrCode, LogOut
} from "lucide-react";
import { toast } from "sonner";

// ローカルAPI
const API_URL = "https://axis-api.yusukekikuta-05.workers.dev";

const COMMUNITIES = [
  {
    id: "monkedao",
    name: "MonkeDAO",
    image: "/monke.jpeg",
    description: "SMB Gen2 holders.",
    boost: "1.2x Boost"
  },
  {
    id: "madlads",
    name: "Mad Lads",
    image: "/mad.jpeg",
    description: "xNFT access.",
    boost: "1.5x Boost"
  },
  {
    id: "superteam",
    name: "Superteam",
    image: "/superteam.jpeg",
    description: "Verified members.",
    boost: "Early Access"
  }
];

export default function PortfolioPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { 
    vaults, positions, usdcBalance, email, userProfile, isRegistered,
    fetchUserProfile, updateUserProfile, addBadge, fetchVaults, fetchBalances, 
  } = useAxisStore();

  const [editProfile, setEditProfile] = useState({ username: "", bio: "", pfpUrl: "" });
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // データ初期化
  useEffect(() => {
    fetchVaults();
    if (publicKey) {
      fetchBalances();
      fetchUserProfile();
    }
  }, [publicKey, fetchVaults, fetchBalances, fetchUserProfile]);

  useEffect(() => {
    if (userProfile) {
      setEditProfile({
        username: userProfile.username || "",
        bio: userProfile.bio || "",
        pfpUrl: userProfile.pfpUrl || ""
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (email) {
      fetch(`${API_URL}/my-invites?email=${email}`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setMyInvites(data); })
        .catch(err => console.error("Failed to fetch invites:", err));
    }
  }, [email]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image size must be less than 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditProfile(prev => ({ ...prev, pfpUrl: reader.result as string }));
            toast.success("Image uploaded!");
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    const success = await updateUserProfile(editProfile);
    if (success) {
        toast.success("Profile updated");
        setIsSettingsOpen(false);
    } else {
        toast.error("Failed to update");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Copied");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const myPositions = useMemo(() => {
    return positions.map(pos => {
      const vault = vaults.find(v => v.id === pos.vaultId);
      if (!vault) return null;
      const currentPriceMultiplier = 1.05; 
      const currentValue = pos.lpAmount * currentPriceMultiplier;
      const profit = currentValue - pos.entryValue;
      const profitPercent = (profit / pos.entryValue) * 100;
      return { ...pos, vault, currentValue, profit, profitPercent };
    }).filter(p => p !== null);
  }, [positions, vaults]);

  const totalPortfolioValue = myPositions.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalProfit = myPositions.reduce((acc, curr) => acc + curr.profit, 0);
  const totalProfitPercent = totalPortfolioValue > 0 ? (totalProfit / (totalPortfolioValue - totalProfit)) * 100 : 0;
  
  const chartData = myPositions.map(p => ({
    name: p.vault.symbol,
    value: p.currentValue,
    color: "#10b981" 
  }));
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
  const unusedInvites = myInvites.filter(i => !i.used_by_user_id);

  if (!publicKey) return null; 

  const displayName = userProfile?.username || (isRegistered ? "Investor" : "Guest");
  const displayWallet = publicKey.toBase58().slice(0, 4) + "..." + publicKey.toBase58().slice(-4);
  const badges = userProfile?.badges || [];

  return (
    <div className="min-h-screen text-white font-sans flex flex-col pb-24 relative">
        
        {/* Settings Modal (常時表示しないのでDialog化) */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="bg-[#09090b] border-white/10 text-white max-w-md w-[90%] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl flex items-center gap-2">
                        <Settings size={20} /> {isRegistered ? "Edit Profile" : "Create Profile"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                     <div className="flex items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Avatar className="w-20 h-20 border-2 border-dashed border-white/20">
                                <AvatarImage src={editProfile.pfpUrl} className="object-cover" />
                                <AvatarFallback>{editProfile.username?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                             <Button type="button" variant="outline" size="sm" className="bg-white/5 border-white/10 text-white text-xs w-full mb-2" onClick={() => fileInputRef.current?.click()}>
                                <ImageIcon size={14} className="mr-2" /> Change Photo
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-white text-xs">Username</Label>
                        <Input value={editProfile.username} onChange={(e) => setEditProfile({...editProfile, username: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-white text-xs">Bio</Label>
                        <Textarea value={editProfile.bio} onChange={(e) => setEditProfile({...editProfile, bio: e.target.value})} className="bg-white/5 border-white/10 text-white min-h-[80px]" />
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
                        {isRegistered ? "Save Changes" : "Create Profile"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>


        {/* ================= MAIN CONTENT ================= */}
        
        {/* 1. Header: User Info & Settings Button */}
        <div className="pt-8 px-6 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border border-white/10">
                    <AvatarImage src={userProfile?.pfpUrl} className="object-cover" />
                    <AvatarFallback className="bg-neutral-800 text-neutral-400">{displayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-white text-lg leading-tight">{displayName}</h2>
                        {badges.length > 0 && <BadgeCheck size={16} className="text-emerald-400" />}
                    </div>
                    <p className="text-xs text-neutral-500 font-mono flex items-center gap-1">
                        {displayWallet} <Copy size={10} className="cursor-pointer hover:text-white" onClick={() => handleCopyCode(publicKey.toBase58())}/>
                    </p>
                </div>
            </div>
            {/* Settings Icon Button */}
            <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                <Settings size={20} />
            </button>
        </div>

        {/* 2. Balance Display (Big & Bold) */}
        <div className="px-6 mb-8">
            <p className="text-neutral-500 text-xs mb-1 font-medium tracking-wide">Total Assets</p>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white font-sans tracking-tight">
                    ${(totalPortfolioValue + usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
            <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalProfit >= 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                <span className="text-sm font-medium">{totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toLocaleString()}</span>
                <span className="text-xs opacity-70">({totalProfitPercent.toFixed(2)}%)</span>
            </div>
        </div>

        {/* 3. Segmented Tabs & Content */}
        <Tabs defaultValue="assets" className="flex-1 flex flex-col px-4">
            
            {/* Tab Switcher (Like iOS Segmented Control) */}
            <TabsList className="w-full bg-[#151515] p-1 rounded-xl h-12 grid grid-cols-3 mb-6 border border-white/5">
                <TabsTrigger value="assets" className="rounded-lg text-xs font-medium data-[state=active]:bg-emerald-500 data-[state=active]:text-black transition-all">
                    <LayoutGrid size={14} className="mr-2" /> Assets
                </TabsTrigger>
                <TabsTrigger value="community" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black transition-all">
                    <Users size={14} className="mr-2" /> Community
                </TabsTrigger>
                <TabsTrigger value="invites" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-black transition-all">
                    <Gift size={14} className="mr-2" /> Invites
                </TabsTrigger>
            </TabsList>

            {/* --- TAB: ASSETS --- */}
            <TabsContent value="assets" className="flex-1 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                
                {/* Chart (Compact) */}
                {myPositions.length > 0 && (
                     <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Legend iconSize={8} verticalAlign="middle" align="right" layout="vertical" />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center -translate-x-[20%] pointer-events-none">
                            <span className="text-xs text-neutral-500 font-bold">{myPositions.length} Pos</span>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="space-y-3 pb-20">
                    {myPositions.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                            <p className="text-neutral-500 text-sm mb-4">No active investments</p>
                            <Button onClick={() => router.push('/')} variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400">
                                Explore Vaults
                            </Button>
                        </div>
                    ) : (
                        myPositions.map((pos) => (
                            <div 
                                key={pos.vaultId} 
                                onClick={() => router.push(`/vault/${pos.vaultId}`)}
                                className="bg-[#111] border border-white/5 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm">
                                        {pos.vault.symbol[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{pos.vault.name}</p>
                                        <p className="text-xs text-neutral-500">{pos.vault.symbol} • {pos.lpAmount.toFixed(2)} LP</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-medium font-mono">${pos.currentValue.toLocaleString()}</p>
                                    <p className={`text-xs ${pos.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {pos.profit >= 0 ? "+" : ""}{pos.profitPercent.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </TabsContent>

            {/* --- TAB: COMMUNITY --- */}
            <TabsContent value="community" className="flex-1 space-y-4 animate-in slide-in-from-bottom-2 duration-300 pb-20">
                {COMMUNITIES.map((community) => {
                    const isVerified = badges.includes(community.id);
                    return (
                        <div key={community.id} className={`relative overflow-hidden rounded-2xl border ${isVerified ? "border-emerald-500/30 bg-emerald-950/10" : "border-white/5 bg-[#111]"}`}>
                            <div className="flex items-center p-4 gap-4">
                                <div className="w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0">
                                     <img src={community.image} className="w-full h-full object-cover opacity-80" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm">{community.name}</h4>
                                    <p className="text-xs text-neutral-400">{community.boost}</p>
                                </div>
                                {isVerified ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0"><Check size={12} className="mr-1"/> Verified</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-neutral-600 border-neutral-800"><Lock size={12} className="mr-1"/> Locked</Badge>
                                )}
                            </div>
                        </div>
                    );
                })}
            </TabsContent>

             {/* --- TAB: INVITES --- */}
             <TabsContent value="invites" className="flex-1 space-y-4 animate-in slide-in-from-bottom-2 duration-300 pb-20">
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-white/5 p-6 rounded-2xl text-center mb-6">
                    <Gift size={32} className="text-purple-400 mx-auto mb-3" />
                    <h3 className="font-bold text-white mb-1">Invite Friends</h3>
                    <p className="text-xs text-neutral-400 px-4">Earn points for every friend who deposits using your code.</p>
                </div>

                <div className="space-y-3">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-2">Available Codes ({unusedInvites.length})</p>
                    {unusedInvites.map((invite) => (
                        <div key={invite.code} className="bg-[#111] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <QrCode size={18} className="text-neutral-500" />
                                <code className="font-mono font-bold text-white tracking-wider">{invite.code}</code>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={() => handleCopyCode(invite.code)}>
                                {copiedCode === invite.code ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>}
                            </Button>
                        </div>
                    ))}
                    {unusedInvites.length === 0 && (
                        <div className="text-center py-8 text-neutral-600 text-sm">
                            No invite codes available.
                        </div>
                    )}
                </div>
            </TabsContent>

        </Tabs>
    </div>
  );
}