import { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet; 
  const endpoint = useMemo(
    () => import.meta.env.VITE_RPC_URL || clusterApiUrl(network),
    [network]
  );

  const appId = import.meta.env.VITE_PRIVY_APP_ID || '';

  const solanaConnectors = useMemo(() => toSolanaWalletConnectors({
    shouldAutoConnect: true,
  }), []);

  // Solanaチェーン設定オブジェクト
  const solanaChain = useMemo(() => ({
    id: 101, // Privy内部識別ID (Solana Mainnet)
    network: 'mainnet-beta',
    name: 'Solana',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: {
      default: {
        http: [endpoint],
      },
      public: {
        http: [endpoint],
      },
    },
    blockExplorers: {
      default: {
        name: 'Solscan',
        url: 'https://solscan.io',
      },
    },
  }), [endpoint]);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#F22B2B',
          logo: '/AxisLogoo.png',
          walletList: ['phantom', 'solflare', 'backpack'],
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        externalWallets: {
            solana: {
                connectors: solanaConnectors,
            },
        },
        // 重要: supportedChains に solanaChain を含め、それを defaultChain に指定
        supportedChains: [solanaChain],
        defaultChain: solanaChain,
        solanaClusters: [
            {
                name: 'mainnet-beta',
                rpcUrl: endpoint
            }
        ]
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
          {children}
      </ConnectionProvider>
    </PrivyProvider>
  );
};