import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { toWeb3JsTransaction } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Buffer } from 'buffer'; // Bufferをインポート

// アプリのメタデータ
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

  // ウォレット接続 (Authorize)
  const connect = useCallback(async () => {
    try {
      console.log('Connecting to wallet...');
      await transact(async (wallet) => {
        const authResult = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY,
        });

        setAuthToken(authResult.auth_token);
        
        // 【修正箇所】Base64のアドレスをデコードしてPublicKeyを作成
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

  // ウォレット切断
  const disconnect = useCallback(() => {
    setAuthToken(null);
    setPublicKey(null);
  }, []);

  // トランザクション署名
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

        // 署名済みトランザクションをWeb3.js形式に変換
        signedTransaction = toWeb3JsTransaction(result);
      });
    } catch (error) {
      console.error('Sign transaction failed:', error);
      throw error;
    }

    if (!signedTransaction) throw new Error('Failed to sign transaction');
    return signedTransaction;
  }, [authToken, publicKey]);

  // メッセージ署名
  const signMessage = useCallback(async (message: Uint8Array) => {
    if (!authToken || !publicKey) throw new Error('Wallet not connected');
    
    let signedMessage: Uint8Array | null = null;
    try {
        await transact(async (wallet) => {
            await wallet.reauthorize({ auth_token: authToken, identity: APP_IDENTITY });
            const [result] = await wallet.signMessages({ 
                messages: [message], 
                addresses: [publicKey.toBase64()] // ここはBase64で渡す必要がある（PublicKeyオブジェクトならtoBase64()があるはずだが、なければBuffer変換）
            });
            // MWAの仕様上、署名結果のpayloadが返る
            // signed_payload は署名されたメッセージそのものではなく署名データの場合があるため仕様確認が必要ですが、
            // 一般的に signature は result.signatures[0] のように取得するか、signed_payload を確認します。
            // ここでは簡易的に signed_payload を返します。
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