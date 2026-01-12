import { Prompts } from './prompts';

export interface TacticResult {
  id: string;
  name: string;
  type: 'SNIPER' | 'FORTRESS' | 'WAVE';
  description: string;
  tokens: { symbol: string; weight: number }[];
  metrics: {
    winRate: string;
    expectedRoi: string;
    riskLevel: string;
    backtest: number[];
  };
}

const SOLANA_TOP_TOKENS = [
  { symbol: 'SOL', name: 'Solana', sector: 'L1' },
  { symbol: 'JUP', name: 'Jupiter', sector: 'DeFi' },
  { symbol: 'JTO', name: 'Jito', sector: 'DeFi' },
  { symbol: 'PYTH', name: 'Pyth Network', sector: 'Oracle' },
  { symbol: 'WIF', name: 'dogwifhat', sector: 'Meme' },
  { symbol: 'BONK', name: 'Bonk', sector: 'Meme' },
  { symbol: 'RAY', name: 'Raydium', sector: 'DeFi' },
  { symbol: 'RENDER', name: 'Render', sector: 'DePIN' },
  { symbol: 'HNT', name: 'Helium', sector: 'DePIN' },
  { symbol: 'IO', name: 'io.net', sector: 'DePIN' },
  { symbol: 'USDC', name: 'USDC', sector: 'Stable' },
  { symbol: 'KMNO', name: 'Kamino', sector: 'DeFi' },
  { symbol: 'DRIFT', name: 'Drift', sector: 'DeFi' },
  { symbol: 'JitoSOL', name: 'Jito Staked SOL', sector: 'LST' }
];

export class KagemushaService {
  constructor(private env: any) {}

  /**
   * AI QUANT ENGINE: Generates tactical strategies based on Shogun's directive.
   * Integrates Pyth for real-time valuation and Vectorize for historical matching.
   */

  async generateTactics(directive: string, tags: string[]): Promise<TacticResult[]> {
    try {
      // 1. Parallel Fetch: Real-time Prices (Pyth) & Token Universe (Jupiter)
      const [pythPrices, jupTokens] = await Promise.all([
        this.getPythPrices(['SOL', 'BTC', 'ETH', 'JUP']),
        this.fetchJupiterTokens()
      ]);

      // 2. AI Generation
      if (this.env.AI) {
        
        // Prepare Token Context (Limit to 50 to fit Context Window, prioritize by known symbols + randoms)
        // In a real prod, we would sort by Volume/MCap via another API. 
        // Here we take a mix of top known tokens + random selection from strict list for discovery.

        // Extract potential symbols from directive (uppercase words)
        const directiveWords = directive.toUpperCase().split(/[^A-Z0-9]+/);
        const requestedSymbols = new Set(directiveWords.filter(w => w.length >= 2 && w.length <= 6));
        
        const prioritySymbols = new Set(['SOL', 'JUP', 'USDC', 'JTO', 'PYTH', 'WIF', 'BONK', 'RAY', 'RENDER', 'HNT', 'JitoSOL']);
        
        // Ensure requested symbols are treated as priority if they exist in Jupiter list
        const contextTokens = jupTokens
             .filter(t => 
                prioritySymbols.has(t.symbol) || 
                requestedSymbols.has(t.symbol) || // Explicitly requested
                requestedSymbols.has(t.name.toUpperCase()) || // Match by name (e.g. "ETHER")
                (t.symbol === 'WETH' && (requestedSymbols.has('ETH') || requestedSymbols.has('ETHEREUM'))) || // Handle ETH mapping
                Math.random() < 0.2
             ) 
             .slice(0, 60) // Increased context slightly
             .map(t => `${t.symbol} (${t.name})`);

        const prompt = Prompts.getKagemushaPrompt(pythPrices, contextTokens, directive, tags);

        try {
          const response: any = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', { 
            messages: [
              { role: 'system', content: 'You are a JSON-only API. specific strict JSON format.' },
              { role: 'user', content: prompt }
            ] 
          });

          // Extract JSON from response
          let jsonStr = response.response;
          const jsonStart = jsonStr.indexOf('[');
          const jsonEnd = jsonStr.lastIndexOf(']');
          if (jsonStart !== -1 && jsonEnd !== -1) {
             jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
          }
          
          const tactics = JSON.parse(jsonStr);
          if (Array.isArray(tactics) && tactics.length > 0 && tactics[0].tokens) {
            return tactics;
          }
        } catch (aiError) {
          console.warn("AI Generation failed or parsed incorrectly, falling back to heuristics:", aiError);
        }
      }

      // Fallback (Heuristic) -> Uses static list if AI fails
      return [
        {
          id: 'sniper-fallback',
          name: 'SHADOW SNIPER (FALLBACK)',
          type: 'SNIPER',
          description: `Aggressive capture based on ${pythPrices.SOL.price} SOL. (AI Offline)`,
          tokens: [{ symbol: 'SOL', weight: 40 }, { symbol: 'WIF', weight: 30 }, { symbol: 'BONK', weight: 30 }],
          metrics: { winRate: '65%', expectedRoi: '+80%', riskLevel: 'HIGH', backtest: [100, 110, 105, 120, 115, 140, 160] }
        },
        // ... (truncated fallback for brevity in code, but ensuring at least one return)
        {
          id: 'fortress-fallback',
          name: 'IRON SHOGUN (FALLBACK)',
          type: 'FORTRESS',
          description: `Capital preservation.`,
          tokens: [{ symbol: 'USDC', weight: 70 }, { symbol: 'JTO', weight: 30 }],
          metrics: { winRate: '95%', expectedRoi: '+12%', riskLevel: 'LOW', backtest: [100, 101, 102, 103, 104, 105, 106] }
        },
        {
           id: 'wave-fallback',
           name: 'TIDE WALKER (FALLBACK)',
           type: 'WAVE',
           description: 'Balanced exposure.',
           tokens: [{ symbol: 'SOL', weight: 50 }, { symbol: 'JUP', weight: 30 }, { symbol: 'RAY', weight: 20 }],
           metrics: { winRate: '75%', expectedRoi: '+40%', riskLevel: 'MID', backtest: [100, 105, 110, 108, 115, 120, 125] }
        }
      ];

    } catch (e: any) {
      console.error("Critical Kagemusha Error:", e);
      throw new Error(`Tactical generation failed: ${e.message}`);
    }
  }

  async fetchJupiterTokens(): Promise<{symbol: string, name: string, address: string}[]> {
     try {
        const res = await fetch('https://token.jup.ag/strict');
        if (!res.ok) throw new Error('Failed to fetch from Jup');
        const tokens: any[] = await res.json();
        return tokens.map(t => ({
           symbol: t.symbol,
           name: t.name,
           address: t.address
        }));
     } catch (e) {
        console.warn("Jupiter Token Fetch failed, using static fallback", e);
        return SOLANA_TOP_TOKENS.map(t => ({...t, address: 'mock'}));
     }
  }

  async getPythPrices(symbols: string[]) {
    try {
      // Pyth Hermes API v2
      // SOL Price Feed ID: ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
      // JUP Price Feed ID: 0a3f016ab5080077ecba0263309a96f1d3237b679727447d2ce876008639207e
      const response = await fetch('https://hermes.pyth.network/v2/updates/price/latest?ids[]=ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d&ids[]=0a3f016ab5080077ecba0263309a96f1d3237b679727447d2ce876008639207e');
      
      if (!response.ok) throw new Error('Failed to fetch Pyth prices');
      
      const data: any = await response.json();
      const prices: any = {};
      
      // Parse SOL
      if (data.parsed && data.parsed[0]) {
        const solPrice = data.parsed[0].price.price * Math.pow(10, data.parsed[0].price.expo);
        prices.SOL = { price: solPrice.toFixed(2), confidence: "High" };
      } else {
        prices.SOL = { price: "145.20", confidence: "Simulated" };
      }

      // Parse JUP
      if (data.parsed && data.parsed[1]) {
        const jupPrice = data.parsed[1].price.price * Math.pow(10, data.parsed[1].price.expo);
        prices.JUP = { price: jupPrice.toFixed(4), confidence: "High" };
      } else {
        prices.JUP = { price: "1.20", confidence: "Simulated" };
      }

      return prices;
    } catch (e) {
      console.warn('Pyth fetch failed, using fallback:', e);
      return {
        SOL: { price: "145.20", confidence: "Fallback" },
        JUP: { price: "1.20", confidence: "Fallback" }
      };
    }
  }

  async searchVectorSpace(directive: string) {
    if (!this.env.VECTOR_INDEX) return [];
    // Search vector index for similar past strategies to "evolve"
    const search = await this.env.VECTOR_INDEX.query(directive, { topK: 3 });
    return search.matches || [];
  }

  async deployToChain(owner: string, tactic: TacticResult) {
    try {
      // Here we would use Jupiter SDK to prepare rebalance transactions
      // For now, we log the intent and store in D1
      const vaultId = crypto.randomUUID();
      await this.env.axis_db.prepare(
        'INSERT INTO strategies (id, owner_pubkey, name, type, config) VALUES (?, ?, ?, ?, ?)'
      ).bind(vaultId, owner, tactic.name, tactic.type, JSON.stringify(tactic.tokens)).run();
      
      return { success: true, vaultId, address: `KageVault_${vaultId.substring(0,8)}` };
    } catch (e: any) {
      console.error("Deployment failed:", e);
      return { success: false, error: e.message };
    }
  }
}
