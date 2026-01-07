"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

// ==========================================
// Types
// ==========================================

/**
 * Privy Wallet Hook Return Type
 */
interface UsePrivyWalletReturn {
  /** User's wallet address */
  address: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Login function */
  login: () => void;
  /** Logout function */
  logout: () => Promise<void>;
  /** Connect wallet function */
  connectWallet: () => void;
  /** User object from Privy */
  user: any;
}

// ==========================================
// Main Hook
// ==========================================

/**
 * Custom hook for Privy wallet integration
 * 
 * Provides simplified interface for wallet connection and authentication
 * using Privy's authentication system
 * 
 * Features:
 * - Automatic wallet detection
 * - Solana wallet support
 * - User authentication state
 * - Login/Logout functionality
 * 
 * @returns Wallet connection state and functions
 */
export function usePrivyWallet(): UsePrivyWalletReturn {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // ==========================================
  // Effects
  // ==========================================

  /**
   * Update wallet address when wallets change
   */
  useEffect(() => {
    if (wallets.length > 0) {
      // Get first Solana wallet
      const solanaWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy" || wallet.chainType === "solana"
      );
      
      if (solanaWallet && solanaWallet.address) {
        setAddress(solanaWallet.address);
        setIsConnected(true);
      } else if (wallets[0]?.address) {
        // Fallback to first available wallet
        setAddress(wallets[0].address);
        setIsConnected(true);
      }
    } else {
      setAddress(null);
      setIsConnected(false);
    }
  }, [wallets]);

  // ==========================================
  // Functions
  // ==========================================

  /**
   * Connect wallet (triggers Privy login modal)
   */
  const connectWallet = () => {
    if (!authenticated) {
      login();
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    await logout();
    setAddress(null);
    setIsConnected(false);
  };

  // ==========================================
  // Return
  // ==========================================

  return {
    address,
    isAuthenticated: authenticated,
    isConnected,
    isLoading: !ready,
    login,
    logout: handleLogout,
    connectWallet,
    user,
  };
}
