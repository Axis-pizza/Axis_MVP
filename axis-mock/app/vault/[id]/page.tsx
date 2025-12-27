"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxisStore, Vault } from "@/app/store/useAxisStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Share2,
  Loader2,
  Settings2,
  ArrowDownUp,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const generateChartData = () => {
  const data = [];
  let val = 100;
  for (let i = 0; i < 50; i++) {
    val = val * (1 + (Math.random() * 0.08 - 0.035));
    data.push({ date: i, value: val });
  }
  return data;
};

export default function VaultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const { vaults, usdcBalance, fetchVaults, depositToVault } = useAxisStore();
  const { publicKey } = useWallet();

  const [vault, setVault] = useState<Vault | null>(null);
  const [chartData] = useState(generateChartData());
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  const [swapDirection, setSwapDirection] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    if (vaults.length === 0) fetchVaults();
  }, [fetchVaults, vaults.length]);

  useEffect(() => {
    const found = vaults.find((v) => v.id === id);
    if (found) setVault(found);
  }, [vaults, id]);

  const tokenPrice = 124.53;
  const numericAmount = parseFloat(amount) || 0;
  const receiveAmount =
    swapDirection === "deposit" ? numericAmount / tokenPrice : numericAmount * tokenPrice;
  const priceChange = 4.25;
  const priceChangePercent = 3.52;
  const isPositive = priceChange >= 0;

  const handleSwap = async () => {
    if (!publicKey) return toast.error("Connect wallet first");
    setIsSwapping(true);
    setTimeout(() => {
      if (vault && swapDirection === "deposit") depositToVault(vault.id, numericAmount);
      toast.success("Transaction Confirmed");
      setAmount("");
      setIsSwapping(false);
      setIsSwapOpen(false);
    }, 1500);
  };

  const handleMax = () => {
    setAmount(swapDirection === "deposit" ? usdcBalance.toString() : "10");
  };

  if (!vault)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );

  return (
    <div className="min-h-screen pb-48 font-sans text-white">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 px-4 py-3 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="-ml-2 text-white hover:bg-white/10"
        >
          <ArrowLeft size={24} />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold">{vault.name}</span>
          <span className="text-[10px] text-neutral-500">{vault.symbol}</span>
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 text-white hover:bg-white/10">
          <Share2 size={24} />
        </Button>
      </div>

      <div className="mx-auto max-w-md px-6 pt-6">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src={vault.image_url} className="object-cover" />
              <AvatarFallback className="bg-neutral-900 font-bold text-neutral-500">
                {vault.symbol[0]}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold tracking-tight">${tokenPrice.toFixed(2)}</h1>
          </div>

          <div
            className={`flex items-center gap-2 font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}
          >
            <span className="text-lg">
              {isPositive ? "+" : "-"}${Math.abs(priceChange).toFixed(2)}
            </span>
            <span className="text-sm">({Math.abs(priceChangePercent).toFixed(2)}%)</span>
          </div>
        </div>

        <div className="-mx-2 mb-6 h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? "#10b981" : "#ef4444"}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? "#10b981" : "#ef4444"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Tooltip
                content={() => null}
                cursor={{ stroke: "white", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <Tabs defaultValue="1D" className="mb-8">
          <TabsList className="flex h-10 w-full justify-between rounded-none border-b border-white/10 bg-transparent p-0">
            {["1H", "1D", "1W", "1M", "1Y"].map((period) => (
              <TabsTrigger
                key={period}
                value={period}
                className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-xs text-neutral-500 transition-none data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-emerald-400"
              >
                {period}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
              <div className="mb-1 text-xs text-neutral-500">TVL</div>
              <div className="font-mono text-lg font-medium text-white">
                ${vault.min_liquidity?.toLocaleString()}
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
              <div className="mb-1 text-xs text-neutral-500">APY</div>
              <div className="font-mono text-lg font-medium text-emerald-400">12.4%</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
              <div className="mb-1 text-xs text-neutral-500">24h Vol</div>
              <div className="font-mono text-lg font-medium text-white">$2.4M</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-[#111] p-4">
              <div className="mb-1 text-xs text-neutral-500">Holders</div>
              <div className="font-mono text-lg font-medium text-white">1,240</div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-bold text-white">About {vault.symbol}</h3>
            <div className="text-sm leading-relaxed text-neutral-400">
              <p className="line-clamp-3">
                {vault.description ||
                  "This vault strategy focuses on maximizing yield through a diversified basket of Solana ecosystem assets."}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold text-white">Top Holdings</h3>
            <div className="space-y-3">
              {vault.composition?.slice(0, 5).map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={item.token.logoURI}
                        alt={item.token.symbol}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-neutral-800 text-xs text-neutral-500">
                        {item.token.symbol[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-bold text-white">{item.token.name}</div>
                      <div className="text-xs text-neutral-500">{item.token.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">{item.weight}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-24 left-0 z-40 w-full px-4">
        <div className="pointer-events-auto mx-auto max-w-md">
          <Sheet open={isSwapOpen} onOpenChange={setIsSwapOpen}>
            <SheetTrigger asChild>
              <Button className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400">
                Swap
              </Button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="z-[100] rounded-t-[32px] border-t border-white/10 bg-[#111] p-6 pb-12"
            >
              <SheetHeader className="mb-6 flex flex-row items-center justify-between">
                <SheetTitle className="text-xl font-bold text-white">Swap</SheetTitle>
                <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-white">
                  <Settings2 size={18} />
                </Button>
              </SheetHeader>

              <div className="space-y-2">
                <div className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-4">
                  <div className="mb-2 flex justify-between text-xs text-neutral-500">
                    <span>You pay</span>
                    <span className="cursor-pointer text-emerald-400" onClick={handleMax}>
                      Balance: {swapDirection === "deposit" ? usdcBalance : "10.0"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-auto border-none bg-transparent p-0 text-4xl font-bold text-white placeholder:text-neutral-700 focus-visible:ring-0"
                    />
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black px-3 py-1.5">
                      <img
                        src={
                          swapDirection === "deposit"
                            ? "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"
                            : vault.image_url
                        }
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="font-bold">
                        {swapDirection === "deposit" ? "USDC" : vault.symbol}
                      </span>
                      <ChevronDown size={14} className="text-neutral-500" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    ${numericAmount > 0 ? numericAmount.toFixed(2) : "0.00"}
                  </div>
                </div>

                <div className="relative z-10 -my-4 flex justify-center">
                  <button
                    onClick={() => {
                      setSwapDirection((prev) => (prev === "deposit" ? "withdraw" : "deposit"));
                      setAmount("");
                    }}
                    className="rounded-xl border border-white/10 bg-[#111] p-2 text-white transition-transform hover:scale-110"
                  >
                    <ArrowDownUp size={20} />
                  </button>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-4">
                  <div className="mb-2 flex justify-between text-xs text-neutral-500">
                    <span>You receive</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-4xl font-bold text-neutral-400">
                      {numericAmount > 0 ? receiveAmount.toFixed(4) : "0"}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black px-3 py-1.5">
                      <img
                        src={
                          swapDirection === "deposit"
                            ? vault.image_url
                            : "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"
                        }
                        className="h-6 w-6 rounded-full"
                      />
                      <span className="font-bold">
                        {swapDirection === "deposit" ? vault.symbol : "USDC"}
                      </span>
                      <ChevronDown size={14} className="text-neutral-500" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    ${numericAmount > 0 ? (numericAmount * 0.99).toFixed(2) : "0.00"} (-0.5% fee)
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-neutral-400">Rate</span>
                  <span className="font-mono text-white">
                    1 {vault.symbol} = ${tokenPrice}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Network Cost</span>
                  <span className="flex items-center gap-1 text-white">
                    <Wallet size={10} /> ~$0.002
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-6 h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black hover:bg-emerald-400"
                onClick={handleSwap}
                disabled={isSwapping}
              >
                {isSwapping ? <Loader2 className="animate-spin" /> : "Review Swap"}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
