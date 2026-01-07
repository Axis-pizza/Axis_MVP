"use client";

import React from "react";
import { PrivyProvider } from "./PrivyProvider";
import { BugReportProvider } from "./BugReportProvider";

/**
 * Main Providers Component
 * 
 * Wraps the application with necessary providers:
 * - PrivyProvider: Authentication and wallet connection
 * - BugReportProvider: Bug reporting functionality
 * 
 * Note: Google OAuth has been replaced with Privy which provides
 * built-in Google authentication along with wallet connectivity
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider>
      <BugReportProvider>
        {children}
      </BugReportProvider>
    </PrivyProvider>
  );
}
