import type { JupiterToken } from '../../../services/jupiter';

export interface ManualData {
  tokens: { symbol: string; weight: number; mint: string; logoURI?: string }[];
  config: StrategyConfig;
}

export interface StrategyConfig {
  name: string;
  ticker: string;
  description: string;
}

export interface AssetItem {
  token: JupiterToken;
  weight: number;
  locked: boolean;
  id: string;
}

export interface ManualDashboardProps {
  onDeploySuccess: (data: ManualData) => void;
  onBack?: () => void;
  initialConfig?: Partial<StrategyConfig>;
  initialTokens?: { symbol: string; weight: number }[];
}
