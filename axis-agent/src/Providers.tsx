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

  const solanaChain = useMemo(() => ({
    id: 101,
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
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
            solana: {
                connectors: solanaConnectors,
            },
        },
        // solanaChain オブジェクトでRPC設定も行っているため、
        // 古い solanaClusters プロパティは削除します。
        supportedChains: [solanaChain],
        defaultChain: solanaChain,
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
          {children}
      </ConnectionProvider>
    </PrivyProvider>
  );
};