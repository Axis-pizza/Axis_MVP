/**
 * API Service - Centralized API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

const API_URL = API_BASE.replace(/\/$/, '').endsWith('/api') 
  ? API_BASE.replace(/\/$/, '') 
  : `${API_BASE.replace(/\/$/, '')}/api`;

// In-memory cache
const _cache: Record<string, { data: any; ts: number }> = {};
const _getCached = (key: string, ttl: number) => {
  const c = _cache[key];
  return c && Date.now() - c.ts < ttl ? c.data : null;
};
const _setCache = (key: string, data: any) => {
  _cache[key] = { data, ts: Date.now() };
};
const _invalidate = (prefix: string) => {
  for (const key of Object.keys(_cache)) {
    if (key.startsWith(prefix)) delete _cache[key];
  }
};



export const api = {

  get: async (endpoint: string) => {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    console.log(`Requesting: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Log error response body
      const text = await response.text();
      console.error(`API Error ${response.status}: ${text}`);
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },
  getUser: async (pubkey: string) => {
    const cacheKey = `user_${pubkey}`;
    const cached = _getCached(cacheKey, 2 * 60 * 1000);
    if (cached) return cached;

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

      

      const result = { success: true, user, is_registered: data.is_registered ?? true };
      _setCache(cacheKey, result);
      return result;
    } catch {
      return { success: false, user: null };
    }
  },

  connectTwitter(wallet: string) {
    const url = this.getTwitterAuthUrl(wallet);
    
    // 簡易的なモバイル判定
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // モバイル: アプリ内ブラウザでスタックしないよう、現在のタブで遷移(リダイレクト)する
      window.location.href = url;
    } else {
      // PC: 既存通りポップアップで開く
      const width = 600;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      window.open(url, 'Twitter Auth', `width=${width},height=${height},top=${top},left=${left}`);
    }
  },

  getTwitterAuthUrl(wallet: string): string {
    // 現在のページURLをコールバック後に戻る場所として指定したい場合、バックエンドの仕様に合わせてクエリパラメータを追加しても良いです
    // 例: return `${API_BASE}/auth/twitter?wallet=${wallet}&redirect=${encodeURIComponent(window.location.href)}`;
    return `${API_BASE}/auth/twitter?wallet=${wallet}`;
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
        return { success: false, error: text || `Error: ${res.status}` };
      }

      const result = await res.json();
      _invalidate('user_');
      return result;
    } catch {
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
    } catch {
      return { success: false, error: 'Upload Failed' };
    }
  },

  async getPredictionMarkets() {
    // キャッシュが必要ならここで実装 (例: 1分間キャッシュ)
    const cacheKey = 'dflow_markets';
    const cached = _getCached(cacheKey, 60 * 1000);
    if (cached) return cached;

    try {
      // axis-api の /api/dflow/markets を叩く
      const res = await fetch(`${API_BASE}/dflow/markets`); 
      if (!res.ok) return [];
      
      const data = await res.json();
      // レスポンスの構造に合わせて調整 (data.markets なのか data そのままなのか確認が必要ですが、一旦そのまま保存)
      const result = Array.isArray(data) ? data : (data.markets || []);
      
      _setCache(cacheKey, result);
      return result;
    } catch (e) {
      console.error("Failed to fetch prediction markets:", e);
      return [];
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
          strategy_id: strategyId
        }),
      });
    } catch {}
  },
  
  // Fetch invested strategies list
  async getInvestedStrategies(pubkey: string) {
    try {
      const res = await fetch(`${API_BASE}/users/${pubkey}/invested`);
      return await res.json();
    } catch {
      return { success: false, strategies: [] };
    }
  },

  async getLeaderboard(sort: 'points' | 'volume' | 'created' = 'points') {
    const cacheKey = `lb_${sort}`;
    const cached = _getCached(cacheKey, 60 * 1000);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_BASE}/leaderboard?sort=${sort}`);
      const result = await res.json();
      _setCache(cacheKey, result);
      return result;
    } catch {
      return { success: false, leaderboard: [] };
    }
  },

  async getSolPrice() {
    const cached = _getCached('sol_price', 30 * 1000);
    if (cached !== null) return cached;

    try {
      const res = await fetch(`${API_BASE}/price/sol`);
      const data = await res.json();
      _setCache('sol_price', data.price);
      return data.price;
    } catch {
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
        return { success: false, error: err };
      }

      const result = await res.json();
      _invalidate('strats_');
      _invalidate('discover_');
      return result;
    } catch {
      return { success: false, error: 'Network Error' };
    }
  },

  async getTokens() {
    const cached = _getCached('tokens', 5 * 60 * 1000);
    if (cached) return cached;

    const res = await fetch(`${API_BASE}/tokens`);
    const result = await res.json();
    _setCache('tokens', result);
    return result;
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
   * Send deployment request to the server (mint token issuance)
   * @param signature Transaction signature from SOL transfer
   * @param metadata Strategy metadata (name, ticker, tokens, tvl...)
   */
  async deploy(signature: string, metadata: any) {
    try {
      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature,
          metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Deployment failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  async requestFaucet(wallet: string) {
    try {
      console.log('[Faucet API] POST /claim', { wallet_address: wallet });
      const res = await fetch(`${API_BASE}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet }),
      });
      const text = await res.text();
      console.log('[Faucet API] Status:', res.status, 'Body:', text);
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return { success: false, error: `Server returned invalid response (${res.status}): ${text.slice(0, 200)}` };
      }
      if (!res.ok) {
        return { success: false, error: data.error || data.message || `Server error (${res.status})` };
      }
      return data;
    } catch (e) {
      console.error('[Faucet API] Exception:', e);
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
    const cacheKey = `strats_${pubkey}`;
    const cached = _getCached(cacheKey, 60 * 1000);
    if (cached) return cached;

    const res = await fetch(`${API_BASE}/strategies/${pubkey}`);
    const result = await res.json();
    _setCache(cacheKey, result);
    return result;
  },

  async getUserWatchlist(pubkey: string) {
    try {
      const res = await fetch(`${API_BASE}/users/${pubkey}/watchlist`);
      
      if (!res.ok) {
        return { success: false, strategies: [] };
      }
      return await res.json();
    } catch {
      return { success: false, strategies: [] };
    }
  },

  async discoverStrategies(limit = 50, offset = 0) {
    const cacheKey = `discover_${limit}_${offset}`;
    const cached = _getCached(cacheKey, 60 * 1000);
    if (cached) return cached;

    const res = await fetch(`${API_BASE}/discover?limit=${limit}&offset=${offset}`);
    const result = await res.json();
    _setCache(cacheKey, result);
    return result;
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
  },

  
};