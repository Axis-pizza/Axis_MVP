"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Server, Globe, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RPC_OPTIONS = [
  { id: "triton", name: "Triton RPC Pool 1", latency: 235, status: "poor" },
  { id: "helius", name: "Helius RPC 1", latency: 31, status: "good" },
  { id: "custom", name: "Custom", latency: null, status: null },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [rpc, setRpc] = useState("helius");
  const [customRpcUrl, setCustomRpcUrl] = useState("");
  const [explorer, setExplorer] = useState("solscan");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#131416] p-0 text-white">
        <DialogHeader className="border-b border-white/5 px-6 py-4">
          <DialogTitle className="text-lg font-medium">Settings</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] space-y-8 overflow-y-auto p-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-neutral-400 uppercase">
              <Globe size={14} /> General
            </h3>

            <div className="space-y-2">
              <Label className="text-sm font-normal text-neutral-200">Preferred Explorer</Label>
              <Select value={explorer} onValueChange={setExplorer}>
                <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/5 text-white focus:ring-emerald-500/50">
                  <SelectValue placeholder="Select Explorer" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1c1c1e] text-white">
                  <SelectItem value="solscan">Solscan</SelectItem>
                  <SelectItem value="solanafm">SolanaFM</SelectItem>
                  <SelectItem value="xray">XRAY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-normal text-neutral-200">Default Currency</Label>
              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                <button className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-2 text-sm font-medium text-emerald-400">
                  USD
                </button>
                <button className="flex-1 rounded-lg py-2 text-sm font-medium text-neutral-400 hover:text-white">
                  SOL
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label className="text-sm font-normal text-neutral-200">Show Top Token Bar</Label>
              <Switch className="data-[state=checked]:bg-emerald-500" />
            </div>
          </div>

          <div className="h-px w-full bg-white/5" />

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-neutral-400 uppercase">
              <Server size={14} /> RPC Endpoint
            </h3>

            <div className="space-y-3">
              {RPC_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setRpc(option.id)}
                  className={cn(
                    "relative flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all",
                    rpc === option.id
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/5 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        rpc === option.id ? "border-emerald-500" : "border-neutral-600"
                      )}
                    >
                      {rpc === option.id && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        rpc === option.id ? "text-emerald-400" : "text-neutral-300"
                      )}
                    >
                      {option.name}
                    </span>
                  </div>

                  {option.latency && (
                    <div className="flex items-center gap-2">
                      <Circle
                        size={8}
                        fill="currentColor"
                        className={option.status === "good" ? "text-emerald-500" : "text-rose-500"}
                      />
                      <span className="text-xs text-neutral-400">{option.latency}ms</span>
                    </div>
                  )}
                </div>
              ))}

              {rpc === "custom" && (
                <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                  <Input
                    placeholder="https://your-custom-rpc.com"
                    value={customRpcUrl}
                    onChange={(e) => setCustomRpcUrl(e.target.value)}
                    className="h-12 rounded-xl border-white/10 bg-black/40 text-white placeholder:text-neutral-600"
                  />
                  <div className="mt-2 flex justify-end">
                    <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/20">
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
