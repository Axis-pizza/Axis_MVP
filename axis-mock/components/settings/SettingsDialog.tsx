"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, Wand2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export function SettingsDialog() {
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIcon, setGeneratedIcon] = useState<string | null>(null);

  const mockNFTs = [
    { id: "1", name: "Mad Lads #8420", url: "https://placehold.co/100x100/2a2a2a/FFF?text=ML" },
    { id: "2", name: "SMB #231", url: "https://placehold.co/100x100/4a4a4a/FFF?text=SMB" },
    { id: "3", name: "Claynosaurz", url: "https://placehold.co/100x100/6a6a6a/FFF?text=Clay" },
  ];

  const handleGenerate = () => {
    if (!selectedNFT) return;
    setIsGenerating(true);

    setTimeout(() => {
      setGeneratedIcon("https://placehold.co/200x200/10b981/FFF?text=AXIS+AI");
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
          <Settings size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-neutral-800 bg-neutral-900/95 font-serif text-white backdrop-blur">
        <DialogHeader>
          <DialogTitle>Settings & Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold tracking-wider text-neutral-400 uppercase">
              RPC Connection
            </h3>
            <div className="flex items-center justify-between rounded border border-white/10 bg-black/40 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-sm">Helius Devnet (High Speed)</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-6 border-white/10 text-xs text-neutral-400"
              >
                Change
              </Button>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-neutral-400 uppercase">
                <Wand2 size={14} className="text-purple-400" /> AI PFP Generator
              </h3>
              <Badge variant="outline" className="border-purple-500/30 text-[10px] text-purple-400">
                Beta
              </Badge>
            </div>

            <p className="text-xs text-neutral-500">
              Select an NFT from your wallet and let Axis AI reimagine it for our ecosystem.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {mockNFTs.map((nft) => (
                <div
                  key={nft.id}
                  onClick={() => {
                    setSelectedNFT(nft.id);
                    setGeneratedIcon(null);
                  }}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${selectedNFT === nft.id ? "border-emerald-500 opacity-100" : "border-transparent opacity-60 hover:opacity-80"}`}
                >
                  <img src={nft.url} alt={nft.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>

            {selectedNFT && !generatedIcon && (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full border border-purple-500/30 bg-gradient-to-r from-purple-900 to-indigo-900 font-serif text-purple-100"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating Axis Style...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate AI Icon
                  </>
                )}
              </Button>
            )}

            {generatedIcon && (
              <div className="animate-in fade-in slide-in-from-bottom-4 mt-4 rounded-xl border border-purple-500/20 bg-purple-950/20 p-4 text-center">
                <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-full border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <img src={generatedIcon} alt="Generated" className="h-full w-full object-cover" />
                </div>
                <p className="mb-2 text-sm font-bold text-emerald-400">Axis Identity Generated!</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Download
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    Set as PFP
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
