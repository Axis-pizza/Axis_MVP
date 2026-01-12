/**
 * Wallet Hook - Enhanced wallet utilities for Kagemusha
 */

import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const useWallet = () => {
  const { connection } = useConnection();
  const wallet = useSolanaWallet();

  const shortAddress = useMemo(() => {
    if (!wallet.publicKey) return null;
    const addr = wallet.publicKey.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }, [wallet.publicKey]);

  const getBalance = useCallback(async (): Promise<number | null> => {
    if (!wallet.publicKey) return null;
    try {
      const balance = await connection.getBalance(wallet.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (e) {
      console.error('Failed to fetch balance:', e);
      return null;
    }
  }, [connection, wallet.publicKey]);

  const isConnected = wallet.connected && wallet.publicKey !== null;

  return {
    ...wallet,
    shortAddress,
    getBalance,
    isConnected,
    publicKeyString: wallet.publicKey?.toBase58() || null,
  };
};
