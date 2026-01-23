/**
 * API Service - Centralized API calls
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

export const api = {
  /**
   * Generate AI strategies
   */
  async analyze(directive: string, tags: string[] = [], customInput?: string) {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directive, tags, customInput }),
    });
    return res.json();
  },

  // Watchlistの切り替え
  async toggleWatchlist(id: string, userPubkey: string) {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/strategies/${id}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPubkey })
    });
    return res.json();
  },

  // Watchlistの状態確認
  async checkWatchlist(id: string, userPubkey: string) {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/strategies/${id}/watchlist?user=${userPubkey}`);
    return res.json();
  },

  // ★重要: XP/紹介システム用のユーザー取得
  // (下に同名の getUser があったので、こちらを優先して古い方を削除/コメントアウトしました)
  getUser: async (pubkey: string) => {
    // ローカルストレージの紹介コードを送信
    const ref = localStorage.getItem('axis_referrer');
    let url = `${API_BASE}/users/${pubkey}`;
    if (ref && ref !== pubkey) {
      url += `?ref=${ref}`;
    }
    const res = await fetch(url);
    if (!res.ok) return { success: false }; // エラーハンドリング追加
    return res.json();
  },

  // デイリーチェックイン
  dailyCheckIn: async (pubkey: string) => {
    const url = `${API_BASE}/users/${pubkey}/checkin`;
    console.log(`📡 Sending Request to: ${url}`); // URL確認

    try {
      const res = await fetch(url, {
        method: 'POST'
      });
      
      console.log(`📡 Response Status: ${res.status} ${res.statusText}`); // ステータス確認

      // レスポンスがJSONかどうか確認してテキスト取得
      const text = await res.text();
      console.log(`📡 Raw Response Body:`, text); // 生の中身を確認

      if (!res.ok) {
        throw new Error(`Server Error (${res.status}): ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`JSON Parse Error: Res is not JSON. Body: ${text.slice(0, 50)}...`);
      }

    } catch (error: any) {
      console.error("🚨 Check-in API Error:", error);
      // フロントエンド側で扱いやすい形にして返す
      return { success: false, error: error.message }; 
    }
  },

  // リーダーボード取得
  getLeaderboard: async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      return await res.json();
    } catch (error) {
      return { success: false, leaderboard: [] };
    }
  },

  /**
   * Get token list with prices
   */
  async getTokens() {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/tokens`);
    return res.json();
  },

  /**
   * Search tokens
   */
  async searchTokens(query: string, limit = 20) {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/tokens/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return res.json();
  },

  /**
   * Get token price history
   */
  async getTokenHistory(address: string, interval: '1h' | '1d' | '1w' = '1d') {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/tokens/${address}/history?interval=${interval}`);
    return res.json();
  },

  /**
   * Get Jito deployment info
   */
  async prepareDeployment() {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/prepare-deployment`);
    return res.json();
  },

  /**
   * Deploy strategy
   */
  async deploy(txSignature: string, strategyData: any) {
    console.log("📡 API Calling: /deploy"); 

    try {
      // 修正: /kagemusha を削除
      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: txSignature,
          ...strategyData,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`🚨 Server Error (${response.status}):`, responseText);
        throw new Error(`Server Error: ${response.status} - ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error("API Deploy Error:", error);
      throw error;
    }
  },

  /**
   * Get all vaults (rankings)
   */
  async getVaults() {
    const res = await fetch(`${API_BASE}/vaults`);
    return res.json();
  },

  /**
   * Get strategy performance chart
   */
  async getStrategyChart(id: string, period = '7d', type: 'line' | 'candle' = 'line') {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/strategies/${id}/chart?period=${period}&type=${type}`);
    return res.json();
  },

  /**
   * Get user strategies
   */
  async getUserStrategies(pubkey: string) {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/strategies/${pubkey}`);
    return res.json();
  },

  /**
   * Discover public strategies
   */
  async discoverStrategies(limit = 50, offset = 0) {
    // 修正: /kagemusha を削除
    const res = await fetch(`${API_BASE}/discover?limit=${limit}&offset=${offset}`);
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

  // ⚠️ 注意: 元のコードに getUser が2つありました。
  // 上部で定義したXP版（getUser）が上書きされないよう、古い方はコメントアウトまたは削除します。
  // async getUser(walletAddress: string) { ... }, 

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
   */
  getProxyUrl(url: string | undefined | null) {
    if (!url) return '';
    if (url.includes('/upload/image/') || url.startsWith('blob:')) return url;
    
    if (url.includes('pub-axis-images.r2.dev')) {
       const key = url.split('pub-axis-images.r2.dev/')[1];
       return `${API_BASE}/upload/image/${key}`;
    }
    
    if (!url.startsWith('http') && (url.includes('/') && url.endsWith('.webp'))) {
        return `${API_BASE}/upload/image/${url}`;
    }

    return url;
  }
};