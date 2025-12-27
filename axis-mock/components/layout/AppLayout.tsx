"use client";

import { ReactNode } from "react";
// ↓ あなたのプロジェクトの実際のパスに合わせてimportしてください
//import { Navbar } from "@/components/layout/Navbar";
// import { BugReportWidget } from "@/components/layout/BugReportWidget";
import { BottomNav } from "@/components/layout/BottomNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-white">
      {/* ログイン後のみ表示したい要素 */}
      <BottomNav />
      
      <main>
        {children}
      </main>
      
  
    </div>
  );
}