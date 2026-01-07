"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AppWalletProvider from "./AppWalletProvider";
import { BugReportProvider } from "./BugReportProvider";

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = "862680354-qf4s464d0msju7rtra43dpbdfgl2e44b.apps.googleusercontent.com";

/**
 * Main Providers Component
 * 
 * Wraps the application with necessary providers:
 * - GoogleOAuthProvider: Google authentication
 * - AppWalletProvider: Solana wallet connection
 * - BugReportProvider: Bug reporting functionality
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppWalletProvider>
        <BugReportProvider>{children}</BugReportProvider>
      </AppWalletProvider>
    </GoogleOAuthProvider>
  );
}
