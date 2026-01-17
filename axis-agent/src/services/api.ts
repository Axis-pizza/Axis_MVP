/**
 * API Service - Centralized API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

export const api = {
  /**
   * Generate AI strategies
   */
  async analyze(directive: string, tags: string[] = [], customInput?: string) {
    const res = await fetch(`${API_BASE}/kagemusha/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directive, tags, customInput }),
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
  async deploy(signedTransaction: string, metadata: {
    name?: string;
    type?: string;
    composition?: { symbol: string; weight: number }[];
    creator?: string;
    initialInvestment?: number;
  }) {
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

  /**
   * Discover public strategies
   */
  async discoverStrategies(limit = 50, offset = 0) {
    const res = await fetch(`${API_BASE}/kagemusha/discover?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  /**
   * Upload image to R2 storage
   */
  async uploadImage(file: Blob, walletAddress: string, type: 'strategy' | 'profile' = 'strategy') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('wallet_address', walletAddress);
    formData.append('type', type);

    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  /**
   * Get user profile
   */
  async getUser(walletAddress: string) {
    const res = await fetch(`${API_BASE}/user?wallet=${encodeURIComponent(walletAddress)}`);
    return res.json();
  },

  /**
   * Update user profile
   */
  async updateProfile(data: { 
    wallet_address: string; 
    name?: string; 
    bio?: string; 
    avatar_url?: string;
  }) {
    const res = await fetch(`${API_BASE}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * Generate pizza-style artwork for a strategy
   */
  async generatePizzaArt(tokens: string[], strategyType: string, walletAddress: string) {
    const res = await fetch(`${API_BASE}/art/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, strategyType, walletAddress }),
    });
    return res.json();
  },

  async requestInvite(email: string) {
    const res = await fetch(`${API_BASE}/request-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  /**
   * Register new user
   */
  async register(data: { email: string; wallet_address: string; invite_code_used: string; avatar_url?: string; name?: string; bio?: string }) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * Get proxy URL for R2 images
   * Converts direct R2 links to API proxy links if needed
   */
  getProxyUrl(url: string | undefined | null) {
    if (!url) return '';
    // If it's already a proxy URL or local blob, return as is
    if (url.includes('/upload/image/') || url.startsWith('blob:')) return url;
    
    // If it's an R2 URL, convert to proxy
    if (url.includes('pub-axis-images.r2.dev')) {
       const key = url.split('pub-axis-images.r2.dev/')[1];
       return `${API_BASE}/upload/image/${key}`;
    }
    
    // If it's just a path/key (legacy), assume it needs proxy
    if (!url.startsWith('http') && (url.includes('/') && url.endsWith('.webp'))) {
        return `${API_BASE}/upload/image/${url}`;
    }

    return url;
  }
};

