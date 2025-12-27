"use client";

import React from "react";
import AppWalletProvider from "./AppWalletProvider";
import { BugReportProvider } from "./BugReportProvider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppWalletProvider>
      <BugReportProvider>{children}</BugReportProvider>
    </AppWalletProvider>
  );
}
