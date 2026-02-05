// Frontend Types

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  logoURI?: string;
  sector?: string;
  price?: number;
  priceFormatted?: string;
  change24h?: number;
}

export interface TokenAllocation {
  symbol: string;
  address?: string;
  mint?: string;
  weight: number;
  logoURI?: string;
  token?: TokenInfo;
}

export interface Strategy {
  id: string;
  name: string;
  ticker?: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  description?: string;
  tokens: TokenAllocation[];
  metrics?: {
    expectedApy: number;
    riskScore: number;
    winRate: number;
    sharpeRatio: number;
  };
  apy?: number;
  tvl?: number | string;
  price?: number;
  owner?: string;
  address?: string;
  config?: {
    strategyPubkey?: string;
    [key: string]: unknown;
  };

  backtest?: {
    timestamps: number[];
    values: number[];
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
  createdAt?: number;
  aiSuggestion?: string;
}

export interface Vault {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  tvl: number;
  apy: number;
  performance7d: number;
  performance30d: number;
  composition: TokenAllocation[];
  imageUrl?: string;
  holders?: number;
  rank?: number;
}

export type CreateStep = 'SELECT' | 'CUSTOMIZE' | 'REVIEW' | 'DEPLOY';