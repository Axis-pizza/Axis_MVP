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
  weight: number;
  address?: string;
  token?: TokenInfo;
}

// 一覧と詳細で共通して使う型
export interface Strategy {
  id: string;
  name: string;
  ticker?: string; // 追加: 表示用のティッカー
  type: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  description: string;
  tokens: TokenAllocation[];
  metrics?: { // オプショナルに変更（一覧では計算済みデータを使うため）
    expectedApy: number;
    riskScore: number;
    winRate: number;
    sharpeRatio: number;
  };
  // 一覧表示用にフラット化したプロパティ
  apy?: number; 
  tvl?: number | string;
  price?: number;
  owner?: string;
  
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