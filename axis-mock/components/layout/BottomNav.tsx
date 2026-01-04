"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Search, Sparkles, Wallet, Menu, Bug, Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBugReport } from "@/components/providers/BugReportProvider";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { toast } from "sonner";

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { open: openBugReport } = useBugReport();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnectingForPortfolio, setIsConnectingForPortfolio] = useState(false);

  const handleWalletClick = () => {
    if (connected) {
      router.push("/portfolio");
    } else {
      setIsConnectingForPortfolio(true);
      setVisible(true);
      toast.info("Connect wallet to view portfolio");
    }
  };

  useEffect(() => {
    if (connected && isConnectingForPortfolio) {
      router.push("/portfolio");
      setIsConnectingForPortfolio(false);
      toast.success("Wallet connected successfully");
    }
  }, [connected, isConnectingForPortfolio, router]);

  const navItems = [
    {
      label: "Explore",
      icon: Search,
      action: () => router.push("/pages"),
      isActive: pathname === "/pages" || pathname.startsWith("/vault/"),
    },
    {
      label: "Create",
      icon: Sparkles,
      action: () => router.push("/create"),
      isActive: pathname === "/create",
    },
    {
      label: "Wallet",
      icon: Wallet,
      action: handleWalletClick,
      isActive: pathname === "/portfolio",
      highlight: !connected,
    },
  ];

  return (
    <>
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <div className="pointer-events-none fixed bottom-0 left-0 z-50 w-full bg-gradient-to-t from-black via-black/90 to-transparent px-6 pt-4 pb-8">
        <div className="pointer-events-auto relative mx-auto flex h-16 max-w-md items-center justify-between rounded-full border border-white/10 bg-[#111]/90 px-2 shadow-2xl backdrop-blur-xl">
          <div className="flex h-full flex-1 items-center justify-around px-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={cn(
                  "relative flex h-12 w-12 flex-col items-center justify-center rounded-full transition-all duration-300",
                  item.isActive
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:bg-white/5 hover:text-white",
                  item.highlight && !item.isActive && "animate-pulse text-emerald-400"
                )}
              >
                <item.icon size={20} strokeWidth={item.isActive ? 2.5 : 2} />
                {item.isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-white" />
                )}
              </button>
            ))}

            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex h-12 w-12 flex-col items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/5 hover:text-white">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="z-[100] rounded-t-[32px] border-t border-white/10 bg-[#09090b] p-6 pb-12"
              >
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="font-serif text-xl text-white">Menu</SheetTitle>
                </SheetHeader>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                        <Bug size={18} />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-white">Report a Bug</p>
                        <p className="text-xs text-neutral-500">Found something wrong?</p>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-black/20 text-xs hover:bg-white/10 hover:text-white"
                        onClick={openBugReport}
                      >
                        Report
                      </Button>
                    </SheetClose>
                  </div>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="group relative col-span-2 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-500/10 text-neutral-400 transition-colors group-hover:text-white">
                        <Settings size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Settings</p>
                        <p className="text-xs text-neutral-500">RPC, Explorer, Currency</p>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-neutral-600 transition-colors group-hover:text-white"
                    />
                  </button>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-[10px] tracking-widest text-neutral-600 uppercase">
                    Axis Protocol v0.1.0
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  );
}
