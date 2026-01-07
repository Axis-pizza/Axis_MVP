"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

// ==========================================
// Types
// ==========================================

interface SwapPanelProps {
  vaultId: string;
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
export function SwapPanel({ vaultId }: SwapPanelProps) {
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("0.00");
  const [isSwapping, setIsSwapping] = useState(false);

  // Mock data - replace with actual vault data
  const payToken: TokenInfo = {
    symbol: "USDC",
    logo: "/tokens/usdc.png",
    balance: 2490.00,
  };

  const receiveToken: TokenInfo = {
    symbol: "AXIX",
    logo: "/axis-logo.png",
    balance: 0.00,
  };

  const rate = "1 AXIX = 0.90 USDC";
  const networkCost = "0 Fee";

  /**
   * Handle swap action
   */
  const handleSwap = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    setIsSwapping(true);
    
    try {
      // TODO: Implement actual swap logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Swap successful!");
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
    // Simple calculation: 1 AXIX = 0.90 USDC
    const receive = amount / 0.90;
    setReceiveAmount(receive.toFixed(2));
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
            <span className="text-xs text-neutral-500">
              Balance: {payToken.balance.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 min-w-[120px]">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold">
                $
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
          <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">
            <RefreshCw size={20} className="text-white" />
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
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">
                A
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
          disabled={isSwapping || !payAmount}
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg disabled:opacity-50"
        >
          {isSwapping ? "Swapping..." : "Swap"}
        </Button>
      </div>
    </Card>
  );
}
