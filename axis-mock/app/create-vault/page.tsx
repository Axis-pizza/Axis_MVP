"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { Sparkles, BarChart3, ArrowRight } from "lucide-react";

/**
 * Vault Creation Selection Page
 * 
 * Allows users to choose between:
 * - Simple Mode: User-friendly vault creation
 * - Curator Mode: Professional-grade strategy builder with backtesting
 */
export default function CreateVaultSelectionPage() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-bold mb-3">Create Your Vault</h1>
            <p className="text-neutral-400 text-lg">
              Choose the creation mode that fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Simple Mode Card */}
            <Card 
              onClick={() => router.push("/create")}
              className="bg-gradient-to-br from-emerald-900/20 to-black border-emerald-500/30 p-8 cursor-pointer hover:border-emerald-500/50 transition-all hover:scale-[1.02] group"
            >
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles size={32} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Simple Mode</h2>
                <p className="text-neutral-400 text-sm">
                  Perfect for investors who want to quickly create a diversified portfolio
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                  <span className="text-sm text-neutral-300">AI-powered portfolio suggestions</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                  <span className="text-sm text-neutral-300">Drag-and-drop asset allocation</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                  <span className="text-sm text-neutral-300">One-click deployment</span>
                </div>
              </div>

              <Button className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-bold group">
                Get Started
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>

            {/* Curator Mode Card */}
            <Card 
              onClick={() => router.push("/curator-studio")}
              className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30 p-8 cursor-pointer hover:border-purple-500/50 transition-all hover:scale-[1.02] group"
            >
              <div className="mb-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 size={32} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Curator Mode</h2>
                <p className="text-neutral-400 text-sm">
                  Professional-grade tools for experienced portfolio managers
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
                  <span className="text-sm text-neutral-300">Advanced backtesting engine</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
                  <span className="text-sm text-neutral-300">Risk attribution analytics</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
                  <span className="text-sm text-neutral-300">Institutional-grade metrics</span>
                </div>
              </div>

              <Button className="w-full bg-purple-500 text-black hover:bg-purple-400 font-bold group">
                Launch Studio
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          </div>

          <p className="text-center text-neutral-600 text-sm mt-8">
            Not sure which to choose? Start with Simple Mode and upgrade later.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
