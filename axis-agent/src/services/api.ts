/**
 * API Service - Centralized API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

export const api = {
  getUser: async (pubkey: string) => {
    try {
      const ref = localStorage.getItem('axis_referrer');
      let url = `${API_BASE}/user?wallet=${pubkey}`;

      if (ref && ref !== pubkey) {
        url += `&ref=${ref}`;
      }

      const res = await fetch(url);

      if (!res.ok) {
        return { success: false, user: null };
      }

      const data = await res.json();

      // Handle both { user: {...} } and direct {...} response formats
      const userData = data.user || data;

      if (!userData || Object.keys(userData).length === 0) {
        return { success: false, user: null, is_registered: false };
      }

      const user = {
        ...userData,
        pubkey: pubkey,
        username: userData.username || userData.name,
        avatar_url: userData.pfpUrl || userData.avatar_url,
        total_xp: userData.total_xp ?? userData.xp ?? 0,
        rank_tier: userData.rank_tier || 'Novice'
      };

      return { success: true, user, is_registered: data.is_registered ?? true };
    } catch (e) {
      console.error("Fetch User Error:", e);
      return { success: false, user: null };
    }
  },


  async updateProfile(data: { wallet_address: string; name?: string; username?: string; bio?: string; avatar_url?: string; pfpUrl?: string }) {
    try {
      const payload = {
        wallet_address: data.wallet_address,
        name: data.username || data.name,
        bio: data.bio,
        avatar_url: data.pfpUrl || data.avatar_url
      };

      const res = await fetch(`${API_BASE}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[updateProfile] Error response:', text);
        return { success: false, error: text || `Error: ${res.status}` };
      }

      const result = await res.json();
      return result;
    } catch (e) {
      console.error("Update Profile Error:", e);
      return { success: false, error: 'Network Error' };
    }
  },

  async uploadProfileImage(file: File, walletAddress: string) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('wallet_address', walletAddress);
    formData.append('type', 'profile'); 

    try {
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    } catch (e) {
      console.error("Upload Error:", e);
      return { success: false, error: 'Upload Failed' };
    }
  },

  async requestInvite(email: string) {
    try {
      const res = await fetch(`${API_BASE}/request-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 409) {
        return { success: false, error: 'This email has already been registered' };
      }

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: text || `Error: ${res.status}` };
      }

      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network Error' };
    }
  },


  async register(data: { email: string; wallet_address: string; invite_code_used: string; avatar_url?: string; name?: string; bio?: string }) {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network Error' };
    }
  },


  getProxyUrl(url: string | undefined | null) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('blob:')) return url;
    if (url.startsWith('data:')) return url;
    
    return `${API_BASE}/upload/image/${url}`;
  },

  
  async analyze(directive: string, tags: string[] = [], customInput?: string) {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directive, tags, customInput }),
    });
    return res.json();
  },

  async toggleWatchlist(id: string, userPubkey: string) {
    const res = await fetch(`${API_BASE}/strategies/${id}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPubkey })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[toggleWatchlist] Error:', data);
      throw new Error(data.error || `Error: ${res.status}`);
    }

    return data;
  },

  async checkWatchlist(id: string, userPubkey: string) {
    const res = await fetch(`${API_BASE}/strategies/${id}/watchlist?user=${userPubkey}`);
    return res.json();
  },

  async dailyCheckIn(pubkey: string) {
    const url = `${API_BASE}/users/${pubkey}/checkin`;
    try {
      const res = await fetch(url, { method: 'POST' });
      const text = await res.text();

      if (!res.ok) {
        return { success: false, error: text || `Error: ${res.status}` };
      }

      try {
        const data = JSON.parse(text);
        return data;
      } catch (e) {
        return { success: false, error: `Server Error: ${text}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async syncUserStats(wallet: string, pnl: number, invested: number, strategyId?: string) {
    try {
      await fetch(`${API_BASE}/user/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: wallet,
          pnl_percent: pnl,
          total_invested_usd: invested,
          strategy_id: strategyId // ★追加
        }),
      });
    } catch (e) {
      console.error("Sync stats failed", e);
    }
  },
  
  // 投資済みリスト取得APIを新規追加
  async getInvestedStrategies(pubkey: string) {
    try {
      const res = await fetch(`${API_BASE}/users/${pubkey}/invested`);
      return await res.json();
    } catch (e) {
      console.error("Fetch invested error:", e);
      return { success: false, strategies: [] };
    }
  },

  async getLeaderboard(sort: 'points' | 'volume' | 'created' = 'points') {
    try {
      const res = await fetch(`${API_BASE}/leaderboard?sort=${sort}`);
      return await res.json();
    } catch (e) {
      console.error("Leaderboard fetch error:", e);
      return { success: false, leaderboard: [] };
    }
  },
  async getSolPrice() {
    try {
      const res = await fetch(`${API_BASE}/price/sol`); 
      const data = await res.json();
      return data.price;
    } catch (e) {
      console.error("Price fetch failed", e);
      return 0;
    }
  },

  createStrategy: async (data: {
    owner_pubkey: string;
    name: string;
    ticker: string;
    description?: string;
    type: string;
    tokens: { symbol: string; mint: string; weight: number; logoURI?: string }[];
    address: string; 
    config?: any; 
  }) => {
    try {
      const res = await fetch(`${API_BASE}/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error("Create Strategy Failed:", err);
        return { success: false, error: err };
      }

      return await res.json();
    } catch (e) {
      console.error("Network Error:", e);
      return { success: false, error: 'Network Error' };
    }
  },
  

  async getTokens() {
    const res = await fetch(`${API_BASE}/tokens`);
    return res.json();
  },

  async searchTokens(query: string, limit = 20) {
    const res = await fetch(`${API_BASE}/tokens/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return res.json();
  },

  async getTokenHistory(address: string, interval: '1h' | '1d' | '1w' = '1d') {
    const res = await fetch(`${API_BASE}/tokens/${address}/history?interval=${interval}`);
    return res.json();
  },

  async prepareDeployment() {
    const res = await fetch(`${API_BASE}/prepare-deployment`);
    return res.json();
  },

  /**
   * サーバーへのデプロイリクエスト (Mint発行依頼)
   * @param signature SOL送金のトランザクション署名
   * @param metadata Strategyのメタデータ (name, ticker, tokens, tvl...)
   */
  async deploy(signature: string, metadata: any) {
    try {
      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature, // バックエンドはこれを 'signedTransaction' or 'signature' として受け取る
          metadata,  // 作成するETFの中身
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Deployment failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('[API] Deploy Error:', error);
      throw error;
    }
  },

  async requestFaucet(wallet: string) {
    try {
      const res = await fetch(`${API_BASE}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network Error' };
    }
  },

  async getVaults() {
    const res = await fetch(`${API_BASE}/vaults`);
    return res.json();
  },

  async getStrategyChart(id: string, period = '7d', type: 'line' | 'candle' = 'line') {
    const res = await fetch(`${API_BASE}/strategies/${id}/chart?period=${period}&type=${type}`);
    return res.json();
  },

  async getUserStrategies(pubkey: string) {
    const res = await fetch(`${API_BASE}/strategies/${pubkey}`);
    return res.json();
  },

  async getUserWatchlist(pubkey: string) {
    try {
      const res = await fetch(`${API_BASE}/users/${pubkey}/watchlist`);
      
      if (!res.ok) {
        return { success: false, strategies: [] };
      }
      return await res.json();
    } catch (e) {
      console.error("Fetch Watchlist Error:", e);
      return { success: false, strategies: [] };
    }
  },

  async discoverStrategies(limit = 50, offset = 0) {
    const res = await fetch(`${API_BASE}/discover?limit=${limit}&offset=${offset}`);
    return res.json();
  },

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

  async generatePizzaArt(tokens: string[], strategyType: string, walletAddress: string) {
    const res = await fetch(`${API_BASE}/art/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, strategyType, walletAddress }),
    });
    return res.json();
  }
};