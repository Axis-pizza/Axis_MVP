
import { create } from 'zustand';

export interface Token {
  symbol: string;
  weight: number;
  name?: string;
  value?: number; // USD value
}

export interface Tactic {
  id: string;
  name: string;
  type: 'SNIPER' | 'FORTRESS' | 'WAVE';
  description: string;
  tokens: Token[];
  metrics: {
    winRate: string;
    expectedRoi: string;
    riskLevel: string;
    backtest: number[];
  };
}

interface TacticalStore {
  step: 'DIRECTIVE' | 'MATRIX' | 'SIMULATION' | 'ASSEMBLY' | 'DEPLOYMENT';
  directive: string;
  selectedTags: string[];
  generatedTactics: Tactic[];
  selectedTactic: Tactic | null;
  pizzaComposition: Token[];
  
  setStep: (step: 'DIRECTIVE' | 'MATRIX' | 'SIMULATION' | 'ASSEMBLY' | 'DEPLOYMENT') => void;
  setDirective: (d: string) => void;
  toggleTag: (t: string) => void;
  setTactics: (t: Tactic[]) => void;
  selectTactic: (t: Tactic) => void;
  updatePizza: (tokens: Token[]) => void;
  addToken: (token: Token) => void;
}

export const useTacticalStore = create<TacticalStore>((set) => ({
  step: 'DIRECTIVE',
  directive: '',
  selectedTags: [],
  generatedTactics: [],
  selectedTactic: null,
  pizzaComposition: [],

  setStep: (step) => set({ step }),
  setDirective: (directive) => set({ directive }),
  toggleTag: (tag) => set((state) => ({
    selectedTags: state.selectedTags.includes(tag) 
      ? state.selectedTags.filter(t => t !== tag)
      : [...state.selectedTags, tag]
  })),
  setTactics: (tactics) => set({ generatedTactics: tactics }),
  selectTactic: (tactic) => set({ selectedTactic: tactic, pizzaComposition: tactic.tokens }),
  updatePizza: (tokens) => set({ pizzaComposition: tokens }),
  addToken: (token) => set((state) => ({
    pizzaComposition: [...state.pizzaComposition, token]
  })),
}));
