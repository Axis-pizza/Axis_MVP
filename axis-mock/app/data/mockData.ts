export type VaultStatus = "BOOTSTRAP" | "PUBLIC" | "AUCTION_LIVE";

export interface Token {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags?: string[];
  extensions?: {
    coingeckoId?: string;
  };

  price?: number;
}

export interface VaultAsset {
  token: Token;
  weight: number;
  amount: number;
}

export interface Vault {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  tvl: number;
  status: VaultStatus;
  apy: number;
  assets: VaultAsset[];
  createdAt: Date;
}

const SOL_TOKEN: Token = {
  address: "So11111111111111111111111111111111111111112",
  chainId: 101,
  decimals: 9,
  name: "Solana",
  symbol: "SOL",
  logoURI:
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  price: 145.5,
};

const USDC_TOKEN: Token = {
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  chainId: 101,
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC",
  logoURI:
    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  price: 1.0,
};

const JUP_TOKEN: Token = {
  address: "JUPyiwrYJFskUPiHa7hkeR8VUtkqj845ZNJ79KWAZC6",
  chainId: 101,
  decimals: 6,
  name: "Jupiter",
  symbol: "JUP",
  logoURI: "https://static.jup.ag/jup/icon.png",
  price: 1.15,
};

const BONK_TOKEN: Token = {
  address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  chainId: 101,
  decimals: 5,
  name: "Bonk",
  symbol: "BONK",
  logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
  price: 0.000024,
};

const WIF_TOKEN: Token = {
  address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  chainId: 101,
  decimals: 6,
  name: "dogwifhat",
  symbol: "WIF",
  logoURI: "https://static.jup.ag/wif/icon.png",
  price: 3.2,
};

export const INITIAL_VAULTS: Vault[] = [
  {
    id: "v1",
    name: "Solana Blue Chip",
    symbol: "SBC",
    creator: "0xAnsem...Fast",
    tvl: 250000,
    status: "PUBLIC",
    apy: 12.4,
    createdAt: new Date("2025-11-01"),
    assets: [
      { token: SOL_TOKEN, weight: 70, amount: 1000 },
      { token: JUP_TOKEN, weight: 30, amount: 50000 },
    ],
  },
  {
    id: "v2",
    name: "Meme Super Cycle",
    symbol: "MEME",
    creator: "MemeLord.sol",
    tvl: 45000,
    status: "BOOTSTRAP",
    apy: 0,
    createdAt: new Date(),
    assets: [
      { token: BONK_TOKEN, weight: 50, amount: 1000000000 },
      { token: WIF_TOKEN, weight: 50, amount: 5000 },
    ],
  },
];
