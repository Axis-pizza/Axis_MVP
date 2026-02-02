// src/hooks/useWallet.ts
import { 
  useConnection as useSolanaConnection, 
  useWallet as useSolanaWallet,
} from '@solana/wallet-adapter-react';
import type { WalletContextState as SolanaWalletContextState } from '@solana/wallet-adapter-react';  // ★ type を分離

export type WalletContextState = SolanaWalletContextState & {
  ready: boolean;
  authenticated: boolean;
};

export function useConnection() {
  const { connection } = useSolanaConnection();
  return { connection };
}

export function useWallet(): WalletContextState {
  const wallet = useSolanaWallet();
  
  return {
    ...wallet,
    ready: !wallet.connecting,
    authenticated: wallet.connected,
  };
}