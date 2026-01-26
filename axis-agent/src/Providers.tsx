import type { FC, ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  const appId = "cmk3fq74f03ugif0c83tghcr7";

  return (
    <PrivyProvider
  appId={appId}
  config={{
    appearance: {
      theme: "dark",
      accentColor: "#ff5f00",
      showWalletLoginFirst: false,

      walletChainType: "solana-only",
      walletList: ["detected_solana_wallets", "wallet_connect_qr"],
    },
    externalWallets: {
      solana: { connectors: solanaConnectors },
    },
  }}
>
  {children}
</PrivyProvider>
  );
};
