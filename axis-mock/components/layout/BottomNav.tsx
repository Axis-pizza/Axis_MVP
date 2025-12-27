"use client";

import { useState } from "react";
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
  SheetClose
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBugReport } from "@/components/providers/BugReportProvider";
import { SettingsModal } from "@/components/settings/SettingsModal";

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { open: openBugReport } = useBugReport();
  
  // Menu (Sheet) のState
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Settings (Modal) のState
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleWalletClick = () => {
    if (!connected) {
      setVisible(true);
    } else {
      router.push("/portfolio");
    }
  };

  const navItems = [
    {
      label: "Explore",
      icon: Search,
      action: () => router.push("/"),
      isActive: pathname === "/" || pathname.startsWith("/vault/"),
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
      {/* SettingsModal を Sheet の外に配置。これで Sheet が閉じても消えません */}
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <div className="fixed bottom-0 left-0 w-full z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-full h-16 flex items-center justify-between px-2 shadow-2xl relative">
          
          <div className="flex items-center justify-around flex-1 h-full px-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={cn(
                  "relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
                  item.isActive 
                    ? "text-white bg-white/10" 
                    : "text-neutral-500 hover:text-white hover:bg-white/5",
                  item.highlight && !item.isActive && "text-emerald-400 animate-pulse"
                )}
              >
                <item.icon size={20} strokeWidth={item.isActive ? 2.5 : 2} />
                {item.isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
                )}
              </button>
            ))}

            {/* Menu Sheet */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#09090b] border-t border-white/10 rounded-t-[32px] p-6 pb-12 z-[100]">
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="text-white font-serif text-xl">Menu</SheetTitle>
                </SheetHeader>
                
                <div className="grid grid-cols-2 gap-4">
                   {/* Bug Report */}
                   <div className="col-span-2 bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                              <Bug size={18} />
                          </div>
                          <div className="text-sm">
                              <p className="text-white font-bold">Report a Bug</p>
                              <p className="text-neutral-500 text-xs">Found something wrong?</p>
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

                   {/* Settings Button */}
                   {/* クリックしたら Menu を閉じて、Settings を開く */}
                   <button 
                      onClick={() => {
                        setIsMenuOpen(false); // Menuを閉じる
                        setIsSettingsOpen(true); // Settingsを開く
                      }}
                      className="col-span-2 group relative p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left flex items-center justify-between"
                   >
                      <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center text-neutral-400 group-hover:text-white transition-colors">
                              <Settings size={18} />
                          </div>
                          <div>
                              <p className="text-white font-bold">Settings</p>
                              <p className="text-neutral-500 text-xs">RPC, Explorer, Currency</p>
                          </div>
                      </div>
                      <ChevronRight size={16} className="text-neutral-600 group-hover:text-white transition-colors" />
                   </button>

                </div>

                <div className="mt-8 text-center">
                   <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Axis Protocol v0.1.0</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  );
}