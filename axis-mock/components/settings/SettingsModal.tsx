"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  // DialogTrigger は削除（親から制御するため不要）
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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

// Props定義：親から制御するための open, onOpenChange を受け取る
interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [rpc, setRpc] = useState("helius");
  const [customRpcUrl, setCustomRpcUrl] = useState("");
  const [explorer, setExplorer] = useState("solscan");

  // 内部の state (isOpen) は削除し、props の open を使用する

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogTrigger は削除 */}
      
      <DialogContent className="max-w-md bg-[#131416] border-white/10 text-white rounded-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-white/5">
          <DialogTitle className="text-lg font-medium">Settings</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          {/* General Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Globe size={14} /> General
            </h3>
            
            <div className="space-y-2">
              <Label className="text-sm font-normal text-neutral-200">Preferred Explorer</Label>
              <Select value={explorer} onValueChange={setExplorer}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-emerald-500/50">
                  <SelectValue placeholder="Select Explorer" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c1e] border-white/10 text-white">
                  <SelectItem value="solscan">Solscan</SelectItem>
                  <SelectItem value="solanafm">SolanaFM</SelectItem>
                  <SelectItem value="xray">XRAY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-normal text-neutral-200">Default Currency</Label>
              <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex">
                 <button className="flex-1 py-2 text-sm font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">USD</button>
                 <button className="flex-1 py-2 text-sm font-medium rounded-lg text-neutral-400 hover:text-white">SOL</button>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <Label className="text-sm font-normal text-neutral-200">Show Top Token Bar</Label>
              <Switch className="data-[state=checked]:bg-emerald-500" />
            </div>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* RPC Endpoint Section */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Server size={14} /> RPC Endpoint
            </h3>

            <div className="space-y-3">
              {RPC_OPTIONS.map((option) => (
                <div 
                  key={option.id}
                  onClick={() => setRpc(option.id)}
                  className={cn(
                    "relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                    rpc === option.id 
                      ? "bg-emerald-500/10 border-emerald-500/50" 
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      rpc === option.id ? "border-emerald-500" : "border-neutral-600"
                    )}>
                      {rpc === option.id && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    <span className={cn("text-sm font-medium", rpc === option.id ? "text-emerald-400" : "text-neutral-300")}>
                      {option.name}
                    </span>
                  </div>

                  {option.latency && (
                    <div className="flex items-center gap-2">
                      <Circle size={8} fill="currentColor" className={option.status === "good" ? "text-emerald-500" : "text-rose-500"} />
                      <span className="text-xs text-neutral-400">{option.latency}ms</span>
                    </div>
                  )}
                </div>
              ))}
              
              {rpc === "custom" && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                  <Input 
                    placeholder="https://your-custom-rpc.com" 
                    value={customRpcUrl}
                    onChange={(e) => setCustomRpcUrl(e.target.value)}
                    className="bg-black/40 border-white/10 text-white placeholder:text-neutral-600 h-12 rounded-xl"
                  />
                  <div className="flex justify-end mt-2">
                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors">
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