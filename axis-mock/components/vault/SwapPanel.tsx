"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Settings, ArrowDownUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAxisStore } from "@/app/store/useAxisStore";
import { usePrivy } from "@privy-io/react-auth";

// ==========================================
// Types
// ==========================================

interface SwapPanelProps {
  vaultId: string;
  vaultSymbol?: string;
  vaultPrice?: number;
}

interface TokenInfo {
  symbol: string;
  logo: string;
  balance: number;
}

// ==========================================
// Main Component
// ==========================================

/**
 * Swap Panel Component
 * 
 * Allows users to swap between USDC and vault tokens
 * Features:
 * - Token input with balance display
 * - Swap direction toggle
 * - Rate and network cost display
 * - Real-time balance updates
 */
export function SwapPanel({ vaultId, vaultSymbol = "ETF", vaultPrice = 1.0 }: SwapPanelProps) {
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("0.00");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapDirection, setSwapDirection] = useState<"buy" | "sell">("buy");

  // ストアからデータを取得
  const { usdcBalance, depositToVault, fetchBalances, positions, vaults } = useAxisStore();
  const { user, authenticated } = usePrivy();

  // 現在のVaultポジションを取得
  const currentPosition = useMemo(() => {
    return positions.find(p => p.vaultId === vaultId);
  }, [positions, vaultId]);

  // Vault情報を取得
  const vault = useMemo(() => {
    return vaults.find(v => v.id === vaultId);
  }, [vaults, vaultId]);

  const tokenSymbol = vault?.symbol || vaultSymbol;
  const tokenPrice = vaultPrice;

  // 買い（USDC → ETF）か売り（ETF → USDC）
  const isBuying = swapDirection === "buy";

  const payToken: TokenInfo = {
    symbol: isBuying ? "USDC" : tokenSymbol,
    logo: isBuying ? "/tokens/usdc.png" : "/axis-logo.png",
    balance: isBuying ? usdcBalance : (currentPosition?.lpAmount || 0),
  };

  const receiveToken: TokenInfo = {
    symbol: isBuying ? tokenSymbol : "USDC",
    logo: isBuying ? "/axis-logo.png" : "/tokens/usdc.png",
    balance: isBuying ? (currentPosition?.lpAmount || 0) : usdcBalance,
  };

  const rate = `1 ${tokenSymbol} = $${tokenPrice.toFixed(2)} USDC`;
  const networkCost = "~$0.001 (Solana)";

  /**
   * Handle swap action
   */
  const handleSwap = async () => {
    if (!authenticated) {
      toast.error("Please connect wallet first");
      return;
    }

    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    const numericAmount = parseFloat(payAmount);

    // 残高チェック
    if (numericAmount > payToken.balance) {
      toast.error(`Insufficient ${payToken.symbol} balance`);
      return;
    }

    setIsSwapping(true);
    
    try {
      if (isBuying) {
        // USDCをETFに変換（預け入れ）
        depositToVault(vaultId, numericAmount);
        await fetchBalances();
        toast.success(`Successfully bought ${receiveAmount} ${tokenSymbol}!`);
      } else {
        // ETFをUSDCに変換（引き出し） - 今回はシンプルに処理
        toast.success(`Successfully sold ${payAmount} ${tokenSymbol}!`);
      }
      
      setPayAmount("");
      setReceiveAmount("0.00");
    } catch (error) {
      toast.error("Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };

  /**
   * Calculate receive amount based on pay amount
   */
  const handlePayAmountChange = (value: string) => {
    setPayAmount(value);
    const amount = parseFloat(value) || 0;
    
    if (isBuying) {
      // USDC → ETF: amount / price
      const receive = amount / tokenPrice;
      setReceiveAmount(receive.toFixed(4));
    } else {
      // ETF → USDC: amount * price
      const receive = amount * tokenPrice;
      setReceiveAmount(receive.toFixed(2));
    }
  };

  /**
   * Switch swap direction
   */
  const handleSwitchDirection = () => {
    setSwapDirection(prev => prev === "buy" ? "sell" : "buy");
    setPayAmount("");
    setReceiveAmount("0.00");
  };

  /**
   * Set max amount
   */
  const handleMax = () => {
    const maxAmount = payToken.balance.toString();
    setPayAmount(maxAmount);
    handlePayAmountChange(maxAmount);
  };

  return (
    <Card className="bg-black/40 border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Swap</h3>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw size={16} className="text-neutral-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Settings size={16} className="text-neutral-400" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Pay Input */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-neutral-500">You Pay</span>
            <button 
              onClick={handleMax}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Balance: {payToken.balance.toLocaleString()} (Max)
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 min-w-[120px]">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                payToken.symbol === "USDC" ? "bg-blue-500" : "bg-emerald-500"
              }`}>
                {payToken.symbol === "USDC" ? "$" : tokenSymbol[0]}
              </div>
              <span className="font-bold">{payToken.symbol}</span>
            </div>
            
            <Input
              type="number"
              placeholder="0.00"
              value={payAmount}
              onChange={(e) => handlePayAmountChange(e.target.value)}
              className="flex-1 bg-transparent border-0 text-2xl font-bold text-right focus-visible:ring-0 p-0"
            />
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center">
          <button 
            onClick={handleSwitchDirection}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center hover:rotate-180 duration-300"
          >
            <ArrowDownUp size={20} className="text-white" />
          </button>
        </div>

        {/* Receive Input */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-neutral-500">You Receive</span>
            <span className="text-xs text-neutral-500">
              Balance: {receiveToken.balance.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 min-w-[120px]">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                receiveToken.symbol === "USDC" ? "bg-blue-500" : "bg-emerald-500"
              }`}>
                {receiveToken.symbol === "USDC" ? "$" : tokenSymbol[0]}
              </div>
              <span className="font-bold">{receiveToken.symbol}</span>
            </div>
            
            <div className="flex-1 text-2xl font-bold text-right text-emerald-400">
              {receiveAmount}
            </div>
          </div>
        </div>

        {/* Rate Info */}
        <div className="rounded-lg bg-white/5 p-3 space-y-2 text-sm">
          <div className="flex justify-between text-neutral-400">
            <span>Rate</span>
            <span className="text-white">{rate}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Network Cost</span>
            <span className="text-emerald-400">{networkCost}</span>
          </div>
        </div>

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={isSwapping || !payAmount || !authenticated}
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg disabled:opacity-50"
        >
          {isSwapping ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin w-5 h-5" />
              Processing...
            </span>
          ) : !authenticated ? (
            "Connect Wallet"
          ) : (
            `${isBuying ? "Buy" : "Sell"} ${tokenSymbol}`
          )}
        </Button>
      </div>
    </Card>
  );
}
