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
    // 修正: chainType プロパティへのアクセスで型エラーが出るため any キャスト
    return wallets.find((w: any) => w.chainType === 'solana') || null;
  }, [wallets]);

  // 2. 表示用のPublicKey（リンク済みアカウント情報も含む）
  const publicKey = useMemo(() => {
    // A. すでにアクティブなウォレットがあればそれを使う
    if (activeWallet?.address) {
      return new PublicKey(activeWallet.address);
    }
    
    // B. まだロードされていなくても、認証済みユーザー情報にSolanaアドレスがあればそれを使う
    if (user?.linkedAccounts) {
      // 修正: address プロパティへのアクセスで型エラーが出るため any キャスト
      const solanaAccount = user.linkedAccounts.find(
        (a: any) => a.type === 'wallet' && a.chainType === 'solana'
      ) as any;

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

  const signTransaction = async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
      if (!activeWallet) {
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
       // 修正: activeWallet.sign は型定義上 string を要求する場合があるため any キャストして Uint8Array を渡す
       // (実際の Solana Provider は Uint8Array を受け付ける)
       const signature = await (activeWallet as any).sign(message);
       
       if (typeof signature === 'string') {
           return Buffer.from(signature.replace(/^0x/, ''), 'hex'); 
       }
       return signature as Uint8Array;
  };

  return {
    publicKey,
    connected: !!publicKey,
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