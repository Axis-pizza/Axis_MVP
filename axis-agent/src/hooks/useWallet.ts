// src/hooks/useWallet.ts
import { useEffect, useRef } from 'react';
import {
  useConnection as useSolanaConnection,
  useWallet as useSolanaWallet,
} from '@solana/wallet-adapter-react';
import type { WalletContextState as SolanaWalletContextState } from '@solana/wallet-adapter-react';
import ReactGA from 'react-ga4';

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

  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      if (!hasTrackedRef.current) {
        const address = wallet.publicKey.toString();

        ReactGA.event({
          category: 'Wallet',
          action: 'Connect',
          label: address,
        });

        hasTrackedRef.current = true;
      }
    }

    if (!wallet.connected) {
      hasTrackedRef.current = false;
    }
  }, [wallet.connected, wallet.publicKey]);

  return {
    ...wallet,
    ready: !wallet.connecting,
    authenticated: wallet.connected,
  };
}
