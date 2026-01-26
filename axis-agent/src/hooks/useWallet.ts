// src/hooks/useWallet.ts
import { useMemo } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallets } from "@privy-io/react-auth/solana";

const RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export function useConnection() {
  const connection = useMemo(() => {
    return new Connection(RPC_URL, "confirmed");
  }, []);

  return { connection };
}

export function useWallet() {
  const { ready, wallets } = useWallets();

  const wallet = wallets?.[0];
  const address = wallet?.address;

  const publicKey = useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch {
      return null;
    }
  }, [address]);

  const disconnect = async () => {
    try {
      await wallet?.features?.["standard:disconnect"]?.disconnect();
    } catch (e) {
      console.warn("disconnect failed", e);
    }
  };

  return {
    ready,
    publicKey,
    disconnect,
    wallet,
  };
}
