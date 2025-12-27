"use client";

import { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-white">
      <BottomNav />
      <main>{children}</main>
    </div>
  );
}
