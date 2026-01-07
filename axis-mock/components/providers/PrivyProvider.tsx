"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

// ==========================================
// Constants
// ==========================================

/** Privy App ID */
const PRIVY_APP_ID = "cmk3fq74f03ugif0c83tghcr7";

// ==========================================
// Types
// ==========================================

interface PrivyProviderProps {
  children: React.ReactNode;
}

// ==========================================
// Main Component
// ==========================================

/**
 * Privy Provider Wrapper
 * 
 * Provides authentication and wallet connection via Privy
 * Features:
 * - Solana wallet support
 * - Dark theme UI
 * - Google OAuth integration
 * - Email authentication
 * 
 * @param props - Component props
 * @returns Privy provider component
 */
export function PrivyProvider({ children }: PrivyProviderProps) {
  const router = useRouter();

  return (
    <BasePrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Appearance configuration
        appearance: {
          theme: "dark",
          accentColor: "#10b981", // emerald-500
          logo: "/axis-logo.png",
          showWalletLoginFirst: true,
        },
        
        // Embedded wallet configuration
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          requireUserPasswordOnCreate: false,
        },
        
        // Login methods
        loginMethods: [
          "wallet", // Solana wallets
          "email",  // Email authentication
          "google", // Google OAuth
        ],
        
        // Supported wallets
        supportedChains: [],  // Will add Solana chain config if needed
        
        // Wallet configuration
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      }}
      onSuccess={() => {
        // Redirect after successful login
        router.push("/portfolio");
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
