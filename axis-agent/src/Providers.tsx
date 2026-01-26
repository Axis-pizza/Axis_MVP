import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PrivyProvider } from '@privy-io/react-auth';

// ウォレット接続UIのスタイルシート
import '@solana/wallet-adapter-react-ui/styles.css';

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Solana Wallet Adapterの設定
  const network = WalletAdapterNetwork.Devnet; // 本番なら Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  // 2. Privyの設定
  const privyAppId = "cmk3fq74f03ugif0c83tghcr7";

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#D97706", // Axisのブランドカラーに合わせる
          logo: "https://your-logo-url.png",
        },
        // ソーシャルログインのみを有効化（ウォレット接続はAdapterに任せるためシンプルに）
        loginMethods: ['email', 'google', 'twitter', 'discord'], 
      }}
    >
      {/* ★重要: Privyの下にSolana標準のProviderを配置 
        これにより、StrategyDetailViewなどで `useWallet()` が正常に動作します。
      */}
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  );
};