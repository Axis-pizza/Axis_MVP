/**
 * API Service - Centralized API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

export const api = {
  /**
   * Generate AI strategies
   */
  async analyze(directive: string, tags: string[] = []) {
    const res = await fetch(`${API_BASE}/kagemusha/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directive, tags }),
    });
    return res.json();
  },

  /**
   * Get token list with prices
   */
  async getTokens() {
    const res = await fetch(`${API_BASE}/kagemusha/tokens`);
    return res.json();
  },

  /**
   * Search tokens
   */
  async searchTokens(query: string, limit = 20) {
    const res = await fetch(`${API_BASE}/kagemusha/tokens/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return res.json();
  },

  /**
   * Get token price history
   */
  async getTokenHistory(address: string, interval: '1h' | '1d' | '1w' = '1d') {
    const res = await fetch(`${API_BASE}/kagemusha/tokens/${address}/history?interval=${interval}`);
    return res.json();
  },

  /**
   * Get Jito deployment info
   */
  async prepareDeployment() {
    const res = await fetch(`${API_BASE}/kagemusha/prepare-deployment`);
    return res.json();
  },

  /**
   * Deploy strategy
   */
  async deploy(signedTransaction: string, metadata: any) {
    const res = await fetch(`${API_BASE}/kagemusha/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedTransaction, metadata }),
    });
    return res.json();
  },

  /**
   * Get all vaults (rankings)
   */
  async getVaults() {
    const res = await fetch(`${API_BASE}/vaults`);
    return res.json();
  },

  /**
   * Get user strategies
   */
  async getUserStrategies(pubkey: string) {
    const res = await fetch(`${API_BASE}/kagemusha/strategies/${pubkey}`);
    return res.json();
  },
};
