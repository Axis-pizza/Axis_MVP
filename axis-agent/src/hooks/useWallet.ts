// src/hooks/useWallet.ts
import { useConnection as useSolanaConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';

export function useConnection() {
  const { connection } = useSolanaConnection();
  return { connection };
}

export function useWallet() {
  const wallet = useSolanaWallet();
  
  return {
    // 基本プロパティ
    ready: !wallet.connecting,
    authenticated: wallet.connected,
    connected: wallet.connected,
    publicKey: wallet.publicKey,
    disconnect: wallet.disconnect,
    wallet: wallet.wallet,
    
    // ★追加: トランザクション署名に必要なメソッド
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
    sendTransaction: wallet.sendTransaction,
    signMessage: wallet.signMessage,
  };
}