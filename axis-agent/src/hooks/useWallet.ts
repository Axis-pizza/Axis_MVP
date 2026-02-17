import { useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  useConnection as useSolanaConnection, 
} from '@solana/wallet-adapter-react';
import { 
  usePrivy, 
  useWallets, 
  type ConnectedWallet 
} from '@privy-io/react-auth';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import ReactGA from "react-ga4";
import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

export interface WalletContextState {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnect: () => Promise<void>;
  connect: () => void;
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  wallet: ConnectedWallet | null;
  ready: boolean;
  authenticated: boolean;
}

export function useConnection() {
  const { connection } = useSolanaConnection();
  return { connection };
}

export function useWallet(): WalletContextState {
  const { login, ready, authenticated, logout, linkWallet, user, createWallet } = usePrivy();
  const { wallets } = useWallets();

  // 1. 操作可能なSolanaウォレット（署名用）
  const activeWallet = useMemo(() => {
    return wallets.find((w) => w.chainType === 'solana') || null;
  }, [wallets]);

  // 2. 表示用のPublicKey（リンク済みアカウント情報も含む）
  const publicKey = useMemo(() => {
    // A. すでにアクティブなウォレットがあればそれを使う
    if (activeWallet?.address) {
      return new PublicKey(activeWallet.address);
    }
    
    // B. まだロードされていなくても、認証済みユーザー情報にSolanaアドレスがあればそれを使う
    // これにより、UIは即座に「接続済み」に切り替わります
    if (user?.linkedAccounts) {
      const solanaAccount = user.linkedAccounts.find(
        (a) => a.type === 'wallet' && a.chainType === 'solana'
      );
      if (solanaAccount?.address) {
        return new PublicKey(solanaAccount.address);
      }
    }
    
    return null;
  }, [activeWallet, user]);

  // 接続ロジック
  const connect = useCallback(async () => {
    if (!authenticated) {
      login();
    } else {
      // 認証済みだがSolana情報が全くない場合
      if (!publicKey) {
        console.log("Authenticated but no Solana wallet linked.");
        if (user?.email?.address && typeof createWallet === 'function') {
             try { await createWallet(); } catch(e) { console.error(e); }
        } else {
             linkWallet();
        }
      }
    }
  }, [authenticated, login, publicKey, linkWallet, createWallet, user]);

  // トラッキング
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (authenticated && publicKey) {
      if (!hasTrackedRef.current) {
        ReactGA.event({ category: "Wallet", action: "Connect (Privy)", label: publicKey.toString() });
        hasTrackedRef.current = true;
      }
    } else {
      hasTrackedRef.current = false;
    }
  }, [authenticated, publicKey]);

  // 署名関数群
  const signTransaction = async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
      // 署名時は activeWallet が必須
      if (!activeWallet) {
        // UI上は接続済みでも、裏でウォレットがロードされていない場合のハンドリング
        throw new Error("Wallet is loading or not active. Please wait a moment.");
      }
      const w = activeWallet as any;
      if (w.signTransaction) {
          return (await w.signTransaction(transaction)) as T;
      }
      throw new Error("signTransaction not supported on this wallet type");
  };

  const signAllTransactions = async <T extends Transaction | VersionedTransaction>(transactions: T[]) => {
      if (!activeWallet) throw new Error("Wallet is loading or not active.");
      const w = activeWallet as any;
      if (w.signAllTransactions) {
          return (await w.signAllTransactions(transactions)) as T[];
      }
      throw new Error("signAllTransactions not supported on this wallet type");
  };

  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
       if (!activeWallet) throw new Error("Wallet is loading or not active.");
       const signature = await activeWallet.sign(message);
       if (typeof signature === 'string') {
           return Buffer.from(signature.replace(/^0x/, ''), 'hex'); 
       }
       return signature as Uint8Array;
  };

  return {
    publicKey,
    connected: !!publicKey, // これでUIが切り替わります
    connecting: !ready,
    disconnect: logout,
    connect,
    signTransaction,
    signAllTransactions,
    signMessage,
    wallet: activeWallet,
    ready,
    authenticated
  };
}