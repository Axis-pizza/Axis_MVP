import { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
// 手動アダプターのインポートは不要になるため削除（またはコメントアウト）
// import {
//   PhantomWalletAdapter,
//   SolflareWalletAdapter,
// } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // ★ 修正ポイント: 
  // 主要ウォレット（Phantom, Solflare等）は"Wallet Standard"という仕組みで
  // 自動検出されるため、ここで明示的に new する必要はありません。
  // 配列を空にすることで、ブラウザが検出したものだけを表示するようにし、重複を防ぎます。
  const wallets = useMemo(
    () => [],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};