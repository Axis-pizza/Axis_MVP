import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { toWeb3JsTransaction } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Buffer } from 'buffer';

// App metadata
const APP_IDENTITY = {
  name: 'Axis App',
  uri:  'https://axis.app',
  icon: 'favicon.png',
};

interface WalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);

  // Wallet connection (Authorize)
  const connect = useCallback(async () => {
    try {
      console.log('Connecting to wallet...');
      await transact(async (wallet) => {
        const authResult = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY,
        });

        setAuthToken(authResult.auth_token);

        // Decode the Base64 address and create a PublicKey
        const account = authResult.accounts[0];
        const addressBuffer = Buffer.from(account.address, 'base64');
        const pubKey = new PublicKey(addressBuffer);

        setPublicKey(pubKey);
        console.log('Connected:', pubKey.toBase58());
      });
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  }, []);

  // Wallet disconnect
  const disconnect = useCallback(() => {
    setAuthToken(null);
    setPublicKey(null);
  }, []);

  // Transaction signing
  const signTransaction = useCallback(async (transaction: Transaction | VersionedTransaction) => {
    if (!authToken || !publicKey) throw new Error('Wallet not connected');

    let signedTransaction: Transaction | VersionedTransaction | null = null;

    try {
      await transact(async (wallet) => {
        await wallet.reauthorize({
          auth_token: authToken,
          identity: APP_IDENTITY,
        });

        const [result] = await wallet.signTransactions({
          transactions: [transaction],
        });

        // Convert the signed transaction to Web3.js format
        signedTransaction = toWeb3JsTransaction(result);
      });
    } catch (error) {
      console.error('Sign transaction failed:', error);
      throw error;
    }

    if (!signedTransaction) throw new Error('Failed to sign transaction');
    return signedTransaction;
  }, [authToken, publicKey]);

  // Message signing
  const signMessage = useCallback(async (message: Uint8Array) => {
    if (!authToken || !publicKey) throw new Error('Wallet not connected');

    let signedMessage: Uint8Array | null = null;
    try {
        await transact(async (wallet) => {
            await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY });
            const [result] = await wallet.signMessages({
                messages: [message],
                // Address must be passed as Base64 (use toBase64() on PublicKey, or convert via Buffer)
                addresses: [publicKey.toBase64()]
            });
            // Per MWA spec, the result contains the signed payload.
            // Note: signed_payload may contain signature data rather than the signed message itself;
            // check the MWA documentation for details.
            signedMessage = result.signed_payload;
        });
    } catch (e) {
        console.error(e);
        throw e;
    }
    if (!signedMessage) throw new Error("Failed to sign");
    return signedMessage;
  }, [authToken, publicKey]);

  const value = useMemo(() => ({
    publicKey,
    connected: !!publicKey,
    connect,
    disconnect,
    signTransaction,
    signMessage
  }), [publicKey, connect, disconnect, signTransaction, signMessage]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
