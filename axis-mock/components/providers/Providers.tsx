"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AppWalletProvider from "./AppWalletProvider"; // default import
import { BugReportProvider } from "./BugReportProvider";

// 定数定義（環境変数推奨ですが、既存コードに合わせています）
const GOOGLE_CLIENT_ID = "862680354-qf4s464d0msju7rtra43dpbdfgl2e44b.apps.googleusercontent.com";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppWalletProvider>
        <BugReportProvider>{children}</BugReportProvider>
      </AppWalletProvider>
    </GoogleOAuthProvider>
  );
}