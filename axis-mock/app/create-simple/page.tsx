"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { Sparkles, Zap, ArrowLeft, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { usePrivyWallet } from "@/hooks/usePrivyWallet";

// ==========================================
// Types
// ==========================================

interface VaultFormData {
  name: string;
  ticker: string;
  logoUrl: string | null;
  strategy: "balanced" | "aggressive" | null;
}

// ==========================================
// Main Component
// ==========================================

/**
 * Simple Vault Creation Page
 * 
 * User-friendly interface for creating vaults with AI-powered strategies
 * Simplified version without advanced backtesting features
 * 
 * Features:
 * - Basic vault configuration
 * - AI strategy selection
 * - Logo upload
 * - One-click deployment
 */
export default function CreateSimpleVaultPage() {
  const router = useRouter();
  const { address, isConnected } = usePrivyWallet();
  
  const [formData, setFormData] = useState<VaultFormData>({
    name: "",
    ticker: "",
    logoUrl: null,
    strategy: null,
  });
  
  const [isDeploying, setIsDeploying] = useState(false);

  // ==========================================
  // Handlers
  // ==========================================

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const selectStrategy = (strategy: "balanced" | "aggressive") => {
    setFormData(prev => ({ ...prev, strategy }));
    toast.success(`Selected ${strategy === "balanced" ? "Safe" : "High Yield"} strategy`);
  };

  const handleDeploy = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.name || !formData.ticker || !formData.strategy) {
      toast.error("Please complete all fields");
      return;
    }

    setIsDeploying(true);
    
    try {
      // Mock deployment - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Vault created successfully!");
      router.push("/portfolio");
    } catch (error) {
      console.error("Deployment error:", error);
      toast.error("Failed to create vault");
    } finally {
      setIsDeploying(false);
    }
  };

  // ==========================================
  // Render
  // ==========================================

  return (
    <AppLayout>
      <div className="min-h-screen bg-black p-6 pb-24 text-white">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-neutral-400 hover:text-white"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          
          <h1 className="mb-2 font-serif text-3xl font-bold">Create Your Vault</h1>
          <p className="text-neutral-400">
            Build a diversified crypto portfolio in minutes with AI-powered strategies
          </p>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Vault Identity */}
          <Card className="border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold">Vault Identity</h2>
            
            <div className="space-y-4">
              {/* Logo Upload */}
              <div className="flex justify-center">
                <div
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-white/5 transition-all hover:border-emerald-500/50"
                >
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mb-2 text-neutral-500" size={24} />
                      <span className="text-[10px] font-bold uppercase text-neutral-500">
                        Upload Logo
                      </span>
                    </>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-neutral-500">
                  Vault Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. My Solana Portfolio"
                  className="h-12 border-white/10 bg-white/5 text-lg"
                />
              </div>

              {/* Ticker Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-neutral-500">
                  Ticker Symbol
                </label>
                <Input
                  value={formData.ticker}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. MYPF"
                  maxLength={5}
                  className="h-12 border-white/10 bg-white/5 font-mono text-lg"
                />
              </div>
            </div>
          </Card>

          {/* Strategy Selection */}
          <Card className="border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-bold">Choose Strategy</h2>
            <p className="mb-6 text-sm text-neutral-400">
              Our AI will automatically select and rebalance the best assets for your chosen strategy
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Safe/Balanced */}
              <button
                onClick={() => selectStrategy("balanced")}
                className={`group rounded-xl border p-6 text-left transition-all ${
                  formData.strategy === "balanced"
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-emerald-500/30"
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 transition-transform group-hover:scale-110">
                  <Sparkles size={24} />
                </div>
                <h3 className="mb-1 font-bold">Safe / Balanced</h3>
                <p className="text-xs text-neutral-400">
                  Lower risk, stable returns with established tokens
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    ~18% APY
                  </Badge>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                    Low Risk
                  </Badge>
                </div>
              </button>

              {/* Aggressive/High Yield */}
              <button
                onClick={() => selectStrategy("aggressive")}
                className={`group rounded-xl border p-6 text-left transition-all ${
                  formData.strategy === "aggressive"
                    ? "border-orange-500/50 bg-orange-500/10"
                    : "border-white/10 bg-white/5 hover:border-orange-500/30"
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 transition-transform group-hover:scale-110">
                  <Zap size={24} />
                </div>
                <h3 className="mb-1 font-bold">Degen / Aggressive</h3>
                <p className="text-xs text-neutral-400">
                  Higher risk, maximum growth potential
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    ~42% APY
                  </Badge>
                  <Badge variant="outline" className="border-red-500/30 text-red-400">
                    High Risk
                  </Badge>
                </div>
              </button>
            </div>
          </Card>

          {/* Deploy Button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={!formData.name || !formData.ticker || !formData.strategy || isDeploying}
              className="bg-emerald-500 px-8 text-black hover:bg-emerald-400"
            >
              {isDeploying ? "Creating..." : "Create Vault"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
