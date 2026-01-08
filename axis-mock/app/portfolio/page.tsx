"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAxisStore } from "@/app/store/useAxisStore";
import { usePrivy } from "@privy-io/react-auth";
// ... (imports)
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Copy,
  Check,
  Gift,
  Settings,
  BadgeCheck,
  Lock,
  Image as ImageIcon,
  LayoutGrid,
  Users,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = "https://axis-api.yusukekikuta-05.workers.dev";

const COMMUNITIES = [
  {
    id: "monkedao",
    name: "MonkeDAO",
    image: "/monke.jpeg",
    description: "SMB Gen2 holders.",
    boost: "1.2x Boost",
  },
  {
    id: "madlads",
    name: "Mad Lads",
    image: "/mad.jpeg",
    description: "xNFT access.",
    boost: "1.5x Boost",
  },
  {
    id: "superteam",
    name: "Superteam",
    image: "/superteam.jpeg",
    description: "Verified members.",
    boost: "Early Access",
  },
];

export default function PortfolioPage() {
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const publicKey = user?.wallet?.address ? { toBase58: () => user.wallet!.address } : null;
  const {
    vaults,
    positions,
    usdcBalance,
    email,
    userProfile,
    isRegistered,
    fetchUserProfile, // インポートは残すが使用しない
    updateUserProfile,
    fetchVaults,
    fetchBalances,
  } = useAxisStore();

  const [editProfile, setEditProfile] = useState({ username: "", bio: "", pfpUrl: "" });
  const [myInvites, setMyInvites] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchVaults();
    if (publicKey) {
      fetchBalances();
      // fetchUserProfile(); // ← これを削除またはコメントアウトします。
      // これが失敗すると isRegistered が false になり、ページ遷移時にLPへ飛ばされる原因になります。
    }
  }, [publicKey, fetchVaults, fetchBalances]); // 依存配列からも削除

  useEffect(() => {
    if (userProfile) {
      setEditProfile({
        username: userProfile.username || "",
        bio: userProfile.bio || "",
        pfpUrl: userProfile.pfpUrl || "",
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (email) {
      fetch(`${API_URL}/my-invites?email=${email}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setMyInvites(data);
        })
        .catch((err) => console.error("Failed to fetch invites:", err));
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
        setEditProfile((prev) => ({ ...prev, pfpUrl: reader.result as string }));
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
    return positions
      .map((pos) => {
        const vault = vaults.find((v) => v.id === pos.vaultId);
        if (!vault) return null;
        const currentPriceMultiplier = 1.05;
        const currentValue = pos.lpAmount * currentPriceMultiplier;
        const profit = currentValue - pos.entryValue;
        const profitPercent = (profit / pos.entryValue) * 100;
        return { ...pos, vault, currentValue, profit, profitPercent };
      })
      .filter((p) => p !== null);
  }, [positions, vaults]);

  const totalPortfolioValue = myPositions.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalProfit = myPositions.reduce((acc, curr) => acc + curr.profit, 0);
  const totalProfitPercent =
    totalPortfolioValue > 0 ? (totalProfit / (totalPortfolioValue - totalProfit)) * 100 : 0;

  const chartData = myPositions.map((p) => ({
    name: p.vault.symbol,
    value: p.currentValue,
    color: "#10b981",
  }));
  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
  const unusedInvites = myInvites.filter((i) => !i.used_by_user_id);

  if (!authenticated || !publicKey) return null;

  const displayName = userProfile?.username || (isRegistered ? "Investor" : "Guest");
  const displayWallet = publicKey.toBase58().slice(0, 4) + "..." + publicKey.toBase58().slice(-4);
  const badges = userProfile?.badges || [];

  return (
    <AppLayout>
      <div className="relative flex min-h-screen flex-col pb-24 font-sans text-white">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="w-[90%] max-w-md rounded-3xl border-white/10 bg-[#09090b] text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-serif text-xl">
                <Settings size={20} /> {isRegistered ? "Edit Profile" : "Create Profile"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div
                  className="group relative cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar className="h-20 w-20 border-2 border-dashed border-white/20">
                    <AvatarImage src={editProfile.pfpUrl} className="object-cover" />
                    <AvatarFallback>{editProfile.username?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-2 w-full border-white/10 bg-white/5 text-xs text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon size={14} className="mr-2" /> Change Photo
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white">Username</Label>
                <Input
                  value={editProfile.username}
                  onChange={(e) => setEditProfile({ ...editProfile, username: e.target.value })}
                  className="border-white/10 bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white">Bio</Label>
                <Textarea
                  value={editProfile.bio}
                  onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                  className="min-h-[80px] border-white/10 bg-white/5 text-white"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
              >
                {isRegistered ? "Save Changes" : "Create Profile"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mb-6 flex items-center justify-between px-6 pt-8">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-white/10">
              <AvatarImage src={userProfile?.pfpUrl} className="object-cover" />
              <AvatarFallback className="bg-neutral-800 text-neutral-400">
                {displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg leading-tight font-bold text-white">{displayName}</h2>
                {badges.length > 0 && <BadgeCheck size={16} className="text-emerald-400" />}
              </div>
              <p className="flex items-center gap-1 font-mono text-xs text-neutral-500">
                {displayWallet}{" "}
                <Copy
                  size={10}
                  className="cursor-pointer hover:text-white"
                  onClick={() => handleCopyCode(publicKey.toBase58())}
                />
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="mb-8 px-6">
          <p className="mb-1 text-xs font-medium tracking-wide text-neutral-500">Total Assets</p>
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-4xl font-bold tracking-tight text-white">
              $
              {(totalPortfolioValue + usdcBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            className={`mt-2 inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {totalProfit >= 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingUp size={14} className="rotate-180" />
            )}
            <span className="text-sm font-medium">
              {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toLocaleString()}
            </span>
            <span className="text-xs opacity-70">({totalProfitPercent.toFixed(2)}%)</span>
          </div>
        </div>

        <Tabs defaultValue="assets" className="flex flex-1 flex-col px-4">
          <TabsList className="mb-6 grid h-12 w-full grid-cols-3 rounded-xl border border-white/5 bg-[#151515] p-1">
            <TabsTrigger
              value="assets"
              className="rounded-lg text-xs font-medium transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-black"
            >
              <LayoutGrid size={14} className="mr-2" /> Assets
            </TabsTrigger>
            <TabsTrigger
              value="community"
              className="rounded-lg text-xs font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Users size={14} className="mr-2" /> Community
            </TabsTrigger>
            <TabsTrigger
              value="invites"
              className="rounded-lg text-xs font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black"
            >
              <Gift size={14} className="mr-2" /> Invites
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="assets"
            className="animate-in slide-in-from-bottom-2 flex-1 space-y-6 duration-300"
          >
            {myPositions.length > 0 && (
              <div className="relative h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconSize={8} verticalAlign="middle" align="right" layout="vertical" />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex -translate-x-[20%] items-center justify-center">
                  <span className="text-xs font-bold text-neutral-500">{myPositions.length} Pos</span>
                </div>
              </div>
            )}

            <div className="space-y-3 pb-20">
              {myPositions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                  <p className="mb-4 text-sm text-neutral-500">No active investments</p>
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-400"
                  >
                    Explore Vaults
                  </Button>
                </div>
              ) : (
                myPositions.map((pos) => (
                  <div
                    key={pos.vaultId}
                    onClick={() => router.push(`/vault/${pos.vaultId}`)}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#111] p-4 transition-transform active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                        {pos.vault.symbol[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{pos.vault.name}</p>
                        <p className="text-xs text-neutral-500">
                          {pos.vault.symbol} • {pos.lpAmount.toFixed(2)} LP
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-white">
                        ${pos.currentValue.toLocaleString()}
                      </p>
                      <p
                        className={`text-xs ${pos.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {pos.profit >= 0 ? "+" : ""}
                        {pos.profitPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent
            value="community"
            className="animate-in slide-in-from-bottom-2 flex-1 space-y-4 pb-20 duration-300"
          >
            {COMMUNITIES.map((community) => {
              const isVerified = badges.includes(community.id);
              return (
                <div
                  key={community.id}
                  className={`relative overflow-hidden rounded-2xl border ${isVerified ? "border-emerald-500/30 bg-emerald-950/10" : "border-white/5 bg-[#111]"}`}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                      <img src={community.image} className="h-full w-full object-cover opacity-80" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white">{community.name}</h4>
                      <p className="text-xs text-neutral-400">{community.boost}</p>
                    </div>
                    {isVerified ? (
                      <Badge className="border-0 bg-emerald-500/20 text-emerald-400">
                        <Check size={12} className="mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-neutral-800 text-neutral-600">
                        <Lock size={12} className="mr-1" /> Locked
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent
            value="invites"
            className="animate-in slide-in-from-bottom-2 flex-1 space-y-4 pb-20 duration-300"
          >
            <div className="mb-6 rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 text-center">
              <Gift size={32} className="mx-auto mb-3 text-purple-400" />
              <h3 className="mb-1 font-bold text-white">Invite Friends</h3>
              <p className="px-4 text-xs text-neutral-400">
                Earn points for every friend who deposits using your code.
              </p>
            </div>

            <div className="space-y-3">
              <p className="pl-2 text-xs font-bold tracking-widest text-neutral-500 uppercase">
                Available Codes ({unusedInvites.length})
              </p>
              {unusedInvites.map((invite) => (
                <div
                  key={invite.code}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111] p-4"
                >
                  <div className="flex items-center gap-3">
                    <QrCode size={18} className="text-neutral-500" />
                    <code className="font-mono font-bold tracking-wider text-white">
                      {invite.code}
                    </code>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-neutral-400 hover:text-white"
                    onClick={() => handleCopyCode(invite.code)}
                  >
                    {copiedCode === invite.code ? (
                      <Check size={16} className="text-emerald-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </div>
              ))}
              {unusedInvites.length === 0 && (
                <div className="py-8 text-center text-sm text-neutral-600">
                  No invite codes available.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
