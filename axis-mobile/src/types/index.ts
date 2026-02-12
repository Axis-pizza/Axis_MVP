// ==========================================
// 1. Prediction Market & Axis Token Types
// ==========================================

export interface PredictionMeta {
  eventId: string;
  eventTitle: string;
  marketId: string;
  marketQuestion: string;
  side: 'YES' | 'NO';
  expiry: string;
}

export interface StandardToken {
  source: 'jupiter';
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  price?: number;
  tags?: string[];
  isVerified?: boolean;
}

export interface PredictionToken {
  source: 'dflow';
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  price?: number;
  isMock?: boolean;
  tags?: string[];
  isVerified?: boolean;
  predictionMeta: PredictionMeta;
}

export type AxisToken = StandardToken | PredictionToken;

export function isPredictionToken(token: any): token is PredictionToken {
  return token && token.source === 'dflow' && 'predictionMeta' in token;
}

// ==========================================
// 2. User & Profile Types
// ==========================================

export interface UserProfile {
  username: string;
  referralCode?: string;
  totalPoints: number;
  totalVolume: number;
  rankTier: string;
  pnlPercent: number;
  referralCount?: number;
  is_vip?: boolean;
}

// ==========================================
// 3. Strategy & Vault Types
// ==========================================

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
  ownerPubkey?: string;
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
