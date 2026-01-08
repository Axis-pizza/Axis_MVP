"use client";

import React, { useMemo } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { mainnet } from "wagmi/chains";

// ==========================================
// Configuration
// ==========================================

const PRIVY_APP_ID = "cmk3fq74f03ugif0c83tghcr7";

// ==========================================
// Wagmi Configuration (Minimal - required for Privy)
// ==========================================

export const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

// ==========================================
// Query Client
// ==========================================

const queryClient = new QueryClient();

// ==========================================
// Main Provider Component
// ==========================================

/**
 * AppWalletProvider
 * 
 * Privy authentication provider with Solana support
 * 
 * Features:
 * - Multi-chain wallet support (Ethereum, Solana)
 * - Email authentication
 * - Social login (Google, Twitter, Discord, etc.)
 * - Embedded wallets
 * 
 * @param children - React children components
 */
export default function AppWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Display settings
        appearance: {
          theme: "dark",
          accentColor: "#10b981",
          logo: "/logo.svg",
          showWalletLoginFirst: true,
          walletList: ['phantom', 'solflare', 'detected_solana_wallets', 'metamask', 'detected_ethereum_wallets'],
        },
        // Login methods - Solana wallet only (Phantom, Solflare, etc.)
        loginMethods: ["wallet"],
        // Wallet configuration
        walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
