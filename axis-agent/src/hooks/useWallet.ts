// src/hooks/useWallet.ts — Privy-backed wallet hook (+ MWA for Seeker)
import { useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { PublicKey, Transaction } from '@solana/web3.js';
import { ConnectionContext } from '../context/ConnectionContext';
import ReactGA from 'react-ga4';
import { useMobileWalletAdapter } from './useMobileWalletAdapter';

const FORCE_LOGOUT_KEY = 'axis_force_logged_out';

export interface WalletContextState {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined;
  signAllTransactions: ((txs: Transaction[]) => Promise<Transaction[]>) | undefined;
  disconnect: () => Promise<void>;
  ready: boolean;
  authenticated: boolean;
  wallet: any;
  // MWA / Seeker support
  connectMWA: () => Promise<void>;
  isMWA: boolean;
  mwaConnecting: boolean;
}

export function useConnection() {
  const { connection } = useContext(ConnectionContext);
  return { connection };
}

export function useLoginModal() {
  const { login, ready } = usePrivy();
  const setVisible = useCallback(
    (visible: boolean) => {
      if (visible && ready) {
        localStorage.removeItem(FORCE_LOGOUT_KEY);
        login();
      }
    },
    [login, ready]
  );
  return { setVisible, visible: false };
}

export function useWallet(): WalletContextState {
  const { authenticated, ready: privyReady, logout, user } = usePrivy();
  const { connection } = useContext(ConnectionContext);

  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  // MWA adapter for Seeker / Seed Vault
  const mwa = useMobileWalletAdapter(connection);

  const isForceLoggedOut = typeof window !== 'undefined' && localStorage.getItem(FORCE_LOGOUT_KEY) === 'true';

  const targetAddress = useMemo(() => {
    if (isForceLoggedOut) return null;

    const linkedWallets = user?.linkedAccounts?.filter(
      (a: any) => a.type === 'wallet' && a.chainType === 'solana'
    ) ?? [];

    const external = linkedWallets.find((w: any) => w.walletClientType !== 'privy');
    if (external) return (external as any).address;

    const embedded = linkedWallets.find((w: any) => w.walletClientType === 'privy');
    if (embedded) return (embedded as any).address;

    return solanaWallets[0]?.address ?? null;
  }, [user, solanaWallets, isForceLoggedOut]);

  const wallet = useMemo(() => {
    if (!targetAddress) return null;
    return solanaWallets.find((w) => w.address === targetAddress) ?? solanaWallets[0] ?? null;
  }, [solanaWallets, targetAddress]);

  const publicKey = useMemo(() => {
    if (!targetAddress) return null;
    try { return new PublicKey(targetAddress); } catch { return null; }
  }, [targetAddress]);

  const connected = authenticated && !!publicKey && !isForceLoggedOut;

  const signTransaction = useMemo(() => {
    if (!wallet) return undefined;
    return async (tx: Transaction): Promise<Transaction> => {
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
      const { signedTransaction } = await privySignTransaction({ transaction: serialized, wallet });
      return Transaction.from(signedTransaction);
    };
  }, [wallet, privySignTransaction]);

  // When MWA is connected, prefer it over Privy
  const effectivePublicKey = mwa.connected ? mwa.publicKey : publicKey;
  const effectiveConnected = mwa.connected || connected;
  const effectiveSignTransaction = mwa.connected ? mwa.signTransaction : signTransaction;

  const disconnect = useCallback(async () => {
    if (mwa.connected) {
      await mwa.disconnect();
      return;
    }
    localStorage.setItem(FORCE_LOGOUT_KEY, 'true');
    try { await logout(); } catch { /* ignored */ }
    window.location.reload();
  }, [logout, mwa]);

  // GA tracking
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (effectiveConnected && effectivePublicKey) {
      if (!hasTrackedRef.current) {
        ReactGA.event({
          category: 'Wallet',
          action: 'Connect',
          label: effectivePublicKey.toString(),
        });
        hasTrackedRef.current = true;
      }
    }
    if (!effectiveConnected) {
      hasTrackedRef.current = false;
    }
  }, [effectiveConnected, effectivePublicKey]);

  return {
    connected: effectiveConnected,
    connecting: !privyReady && !mwa.connecting,
    publicKey: effectivePublicKey,
    signTransaction: effectiveSignTransaction,
    signAllTransactions: undefined,
    disconnect,
    ready: privyReady,
    authenticated: effectiveConnected,
    wallet: mwa.connected ? null : wallet,
    connectMWA: mwa.connect,
    isMWA: mwa.connected,
    mwaConnecting: mwa.connecting,
  };
}
