import type { JupiterToken } from '../../../services/jupiter';

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

export interface ManualData {
  tokens: {
    symbol: string;
    weight: number;
    mint: string;
    logoURI: string;
  }[];
  config: StrategyConfig;
}

export interface ManualDashboardProps {
  onDeploySuccess: (data: ManualData) => void;
  onBack: () => void;
  initialConfig?: StrategyConfig;
  initialTokens?: { symbol: string; weight: number }[];
}

export type TabType = 'all' | 'your_tokens' | 'trending' | 'meme' | 'stock' | 'prediction';

import type { ManualDashboardHook } from '../../../hooks/useManualDashboard';
import type { TokenPreferences } from '../../../hooks/useTokenPreferences';
export type ExtendedDashboardHook = ManualDashboardHook;

export interface BuilderProps {
  dashboard: ExtendedDashboardHook;
  preferences: TokenPreferences;
  onBack?: () => void;
}
