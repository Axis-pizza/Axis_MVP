/**
 * Strategy Generator Service
 * AI-powered strategy generation with real data integration
 */

import { StrategyResult, TokenAllocation, BacktestData, StrategyMetrics } from '../../types';
import { PriceService } from '../price';

// Curated token universe with sector classifications
export const TOKEN_UNIVERSE = [
  { symbol: 'SOL', name: 'Solana', sector: 'L1', address: 'So11111111111111111111111111111111111111112' },
  { symbol: 'JUP', name: 'Jupiter', sector: 'DeFi', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'JTO', name: 'Jito', sector: 'DeFi', address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL' },
  { symbol: 'PYTH', name: 'Pyth Network', sector: 'Oracle', address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3' },
  { symbol: 'WIF', name: 'dogwifhat', sector: 'Meme', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: 'BONK', name: 'Bonk', sector: 'Meme', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'RAY', name: 'Raydium', sector: 'DeFi', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
  { symbol: 'RENDER', name: 'Render', sector: 'DePIN', address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
  { symbol: 'HNT', name: 'Helium', sector: 'DePIN', address: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux' },
  { symbol: 'IO', name: 'io.net', sector: 'DePIN', address: 'BZLbGTNCSFfoth2GYDtwr7e4imWzpR5jqcUuGEwr646K' },
  { symbol: 'USDC', name: 'USD Coin', sector: 'Stable', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'KMNO', name: 'Kamino', sector: 'DeFi', address: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS' },
  { symbol: 'DRIFT', name: 'Drift', sector: 'DeFi', address: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7' },
  { symbol: 'JitoSOL', name: 'Jito Staked SOL', sector: 'LST', address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn' },
  { symbol: 'mSOL', name: 'Marinade SOL', sector: 'LST', address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So' },
  { symbol: 'W', name: 'Wormhole', sector: 'Infra', address: '85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ' },
  { symbol: 'TNSR', name: 'Tensor', sector: 'NFT', address: 'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6' },
];

export class StrategyGenerator {
  private priceService: PriceService;
  private env: any;

  constructor(env?: any) {
    this.priceService = new PriceService();
    this.env = env;
  }

  /**
   * Generate AI-powered strategy suggestions
   */
  async generateStrategies(directive: string, tags: string[] = [], customInput?: string): Promise<StrategyResult[]> {
    // Fetch real-time prices
    const symbols = TOKEN_UNIVERSE.map(t => t.symbol);
    const prices = await this.priceService.getPrices(symbols);
    
    console.log(`[StrategyGen] Fetched ${Object.keys(prices).length} prices`);

    // Try AI generation first
    if (this.env?.AI) {
      try {
        const aiStrategies = await this.generateWithAI(directive, tags, prices, customInput);
        if (aiStrategies.length >= 3) {
          return aiStrategies;
        }
      } catch (e) {
        console.warn('[StrategyGen] AI generation failed, using algorithmic:', e);
      }
    }

    // Fallback to algorithmic generation
    return this.generateAlgorithmic(directive, tags, prices, customInput);
  }

  /**
   * Generate strategies using Cloudflare AI
   */
  private async generateWithAI(directive: string, tags: string[], prices: Record<string, any>, customInput?: string): Promise<StrategyResult[]> {
    const priceContext = Object.entries(prices)
      .map(([sym, p]) => `${sym}: $${p.priceFormatted}`)
      .join(', ');

    const tokenContext = TOKEN_UNIVERSE.map(t => `${t.symbol} (${t.sector})`).join(', ');

    const prompt = `You are a quantitative crypto strategist. Generate 3 ETF strategies for: "${directive}"

Available tokens: ${tokenContext}
Current prices: ${priceContext}
User preferences: ${tags.join(', ') || 'none'}
User notes: ${customInput || 'none'}

Output ONLY a JSON array with exactly this structure:
[{
  "name": "Strategy Name",
  "type": "AGGRESSIVE" | "BALANCED" | "CONSERVATIVE",
  "description": "Brief strategy thesis",
  "aiSuggestion": "Short, specific advice for this strategy based on user notes (max 20 words)",
  "tokens": [{"symbol": "SOL", "weight": 40}, ...],
  "expectedApy": 25,
  "riskScore": 7
}]

Rules:
- Weights must sum to 100
- Use 3-5 tokens per strategy
- Match user's directive and notes
- Be creative with names`;

    const response: any = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a JSON-only API. Output valid JSON only.' },
        { role: 'user', content: prompt }
      ]
    });

    // Extract JSON
    let jsonStr = response.response;
    const start = jsonStr.indexOf('[');
    const end = jsonStr.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      jsonStr = jsonStr.substring(start, end + 1);
    }

    const parsed = JSON.parse(jsonStr);
    
    return parsed.map((s: any, i: number) => this.formatStrategy(s, i));
  }

  /**
   * Generate strategies algorithmically using market data
   */
  private generateAlgorithmic(directive: string, tags: string[], prices: Record<string, any>, customInput?: string): StrategyResult[] {
    const d = directive.toUpperCase();
    const now = Date.now();

    // Strategy 1: Aggressive (Meme/High Beta)
    const aggressiveTokens = this.selectTokens(['Meme', 'DePIN'], d, 3);
    const aggressive: StrategyResult = {
      id: `agg-${now}`,
      name: this.generateName('AGGRESSIVE', d),
      type: 'AGGRESSIVE',
      description: `High-conviction strategy targeting ${aggressiveTokens.map(t => t.symbol).join(' + ')}`,
      tokens: this.assignWeights(aggressiveTokens, 'front-loaded'),
      metrics: this.generateMetrics('AGGRESSIVE'),
      backtest: this.generateBacktest('AGGRESSIVE'),
      createdAt: now,
      aiSuggestion: 'High risk, high potential upside with meme exposure.',
    };

    // Strategy 2: Balanced (DeFi + L1)
    const balancedTokens = this.selectTokens(['DeFi', 'L1'], d, 4);
    const balanced: StrategyResult = {
      id: `bal-${now}`,
      name: this.generateName('BALANCED', d),
      type: 'BALANCED',
      description: `Balanced exposure to Solana DeFi ecosystem`,
      tokens: this.assignWeights(balancedTokens, 'equal'),
      metrics: this.generateMetrics('BALANCED'),
      backtest: this.generateBacktest('BALANCED'),
      createdAt: now,
      aiSuggestion: 'Balanced blend of DeFi protocols and Layer 1s.',
    };

    // Strategy 3: Conservative (LST + Stable)
    const conservativeTokens = this.selectTokens(['LST', 'Stable', 'DeFi'], d, 3);
    const conservative: StrategyResult = {
      id: `con-${now}`,
      name: this.generateName('CONSERVATIVE', d),
      type: 'CONSERVATIVE',
      description: `Capital preservation with yield generation via JitoSOL`,
      tokens: this.assignWeights(conservativeTokens, 'stable-heavy'),
      metrics: this.generateMetrics('CONSERVATIVE'),
      backtest: this.generateBacktest('CONSERVATIVE'),
      createdAt: now,
      aiSuggestion: 'Focus on capital preservation and steady yield.',
    };

    return [aggressive, balanced, conservative];
  }

  /**
   * Select tokens from universe based on sectors and directive
   */
  private selectTokens(sectors: string[], directive: string, count: number) {
    const pool = TOKEN_UNIVERSE.filter(t => sectors.includes(t.sector as string));
    
    // Check if directive mentions specific tokens
    const mentioned = TOKEN_UNIVERSE.filter(t => 
      directive.includes(t.symbol) || directive.includes(t.name.toUpperCase())
    );

    // Combine mentioned + random from pool
    const selected = [...mentioned];
    const shuffled = pool.sort(() => Math.random() - 0.5);
    
    for (const t of shuffled) {
      if (selected.length >= count) break;
      if (!selected.find(s => s.symbol === t.symbol)) {
        selected.push(t);
      }
    }

    return selected.slice(0, count);
  }

  /**
   * Assign weights to tokens
   */
  private assignWeights(tokens: any[], style: 'equal' | 'front-loaded' | 'stable-heavy'): TokenAllocation[] {
    const n = tokens.length;
    let weights: number[] = [];

    switch (style) {
      case 'equal':
        weights = tokens.map(() => Math.floor(100 / n));
        break;
      case 'front-loaded':
        // First token gets more weight
        weights = tokens.map((_, i) => {
          const base = Math.floor(100 / n);
          return i === 0 ? base + 20 : base - Math.floor(20 / (n - 1));
        });
        break;
      case 'stable-heavy':
        // Stables get 50%+
        weights = tokens.map((t, i) => {
          if (t.sector === 'Stable' || t.sector === 'LST') return 40;
          return Math.floor(60 / (n - 1));
        });
        break;
    }

    // Adjust to sum to 100
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      weights[0] += (100 - sum);
    }

    return tokens.map((t, i) => ({
      symbol: t.symbol,
      weight: weights[i],
      address: t.address,
    }));
  }

  /**
   * Generate creative strategy name
   */
  private generateName(type: string, directive: string): string {
    const prefixes = {
      AGGRESSIVE: ['Alpha', 'Shadow', 'Blitz', 'Surge', 'Phoenix'],
      BALANCED: ['Harmony', 'Equilibrium', 'Nexus', 'Flow', 'Tide'],
      CONSERVATIVE: ['Fortress', 'Shield', 'Anchor', 'Bastion', 'Sentinel'],
    };
    const prefix = prefixes[type as keyof typeof prefixes][Math.floor(Math.random() * 5)];
    
    // Try to extract theme from directive
    if (directive.includes('MEME')) return `${prefix} Degen`;
    if (directive.includes('DEFI')) return `${prefix} Yield`;
    if (directive.includes('AI') || directive.includes('DEPIN')) return `${prefix} Compute`;
    
    return `${prefix} Index`;
  }

  /**
   * Generate realistic metrics
   */
  private generateMetrics(type: string): StrategyMetrics {
    const base = {
      AGGRESSIVE: { apy: 80, risk: 8, win: 55, sharpe: 1.2 },
      BALANCED: { apy: 35, risk: 5, win: 68, sharpe: 1.8 },
      CONSERVATIVE: { apy: 12, risk: 2, win: 85, sharpe: 2.5 },
    };
    const b = base[type as keyof typeof base];
    
    return {
      expectedApy: b.apy + Math.floor(Math.random() * 20 - 10),
      riskScore: b.risk + Math.floor(Math.random() * 2 - 1),
      winRate: b.win + Math.floor(Math.random() * 10 - 5),
      sharpeRatio: +(b.sharpe + (Math.random() * 0.4 - 0.2)).toFixed(2),
    };
  }

  /**
   * Generate simulated backtest data
   */
  private generateBacktest(type: string): BacktestData {
    const volatility = type === 'AGGRESSIVE' ? 0.15 : type === 'BALANCED' ? 0.08 : 0.03;
    const trend = type === 'AGGRESSIVE' ? 0.003 : type === 'BALANCED' ? 0.002 : 0.0005;
    
    const timestamps: number[] = [];
    const values: number[] = [];
    let value = 100;
    
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
      timestamps.push(now - i * 24 * 60 * 60 * 1000);
      value = value * (1 + trend + (Math.random() - 0.5) * volatility);
      values.push(+value.toFixed(2));
    }

    // Calculate metrics
    const returns = values.slice(1).map((v, i) => (v - values[i]) / values[i]);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((a, r) => a + (r - avgReturn) ** 2, 0) / returns.length);
    const sharpe = (avgReturn / stdDev) * Math.sqrt(252);
    const maxDrawdown = Math.min(...values.map((v, i) => 
      (v - Math.max(...values.slice(0, i + 1))) / Math.max(...values.slice(0, i + 1))
    ));

    return {
      timestamps,
      values,
      sharpeRatio: +sharpe.toFixed(2),
      maxDrawdown: +(maxDrawdown * 100).toFixed(2),
      volatility: +(stdDev * Math.sqrt(252) * 100).toFixed(2),
    };
  }

  /**
   * Format AI response to StrategyResult
   */
  private formatStrategy(rawStrategy: any, index: number): StrategyResult {
    return {
      id: `ai-${Date.now()}-${index}`,
      name: rawStrategy.name,
      type: rawStrategy.type,
      description: rawStrategy.description,
      tokens: rawStrategy.tokens,
      metrics: {
        expectedApy: rawStrategy.expectedApy || 20,
        riskScore: rawStrategy.riskScore || 5,
        winRate: 70,
        sharpeRatio: 1.5,
      },
      backtest: this.generateBacktest(rawStrategy.type),
      createdAt: Date.now(),
      aiSuggestion: rawStrategy.aiSuggestion || 'AI generated strategy based on your preferences.',
    };
  }
}
