// Core Types for Axis Protocol

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals?: number;
  logoURI?: string;
  sector?: 'L1' | 'DeFi' | 'Meme' | 'DePIN' | 'LST' | 'Oracle' | 'Stable' | 'Gaming';
}

export interface TokenPrice {
  symbol: string;
  price: number;
  priceFormatted: string;
  confidence: number;
  timestamp: number;
  source: 'pyth' | 'jupiter' | 'birdeye' | 'fallback';
}

export interface TokenAllocation {
  symbol: string;
  weight: number;
  address?: string;
}

export interface BacktestData {
  timestamps: number[];
  values: number[];
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export interface StrategyResult {
  id: string;
  name: string;
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  description: string;
  tokens: TokenAllocation[];
  metrics: StrategyMetrics;
  backtest: BacktestData;
  createdAt: number;
}

export interface StrategyMetrics {
  expectedApy: number;
  riskScore: number; // 1-10
  winRate: number;   // percentage
  sharpeRatio: number;
}

export interface VaultData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  tvl: number;
  apy: number;
  composition: TokenAllocation[];
  performance7d: number;
  performance30d: number;
  createdAt: number;
  imageUrl?: string;
}

export interface PriceHistory {
  symbol: string;
  interval: '1h' | '1d' | '1w';
  data: { timestamp: number; price: number }[];
}
