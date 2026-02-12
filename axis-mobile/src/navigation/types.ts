import type { Strategy } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  StrategyDetail: { strategy: Strategy };
};

export type MainTabParamList = {
  Discover: undefined;
  Create: undefined;
  Profile: undefined;
};
