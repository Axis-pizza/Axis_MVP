/**
 * API Service - Centralized API calls
 */

// 環境変数からAPIのベースURLを取得
const API_BASE = import.meta.env.VITE_API_URL || 'https://axis-api.yusukekikuta-05.workers.dev';

export const api = {
  /**
   * 1. ユーザー情報取得 (GET /user?wallet=...)
   * バックエンドの仕様に合わせてクエリパラメータ形式に統一
   */
  getUser: async (pubkey: string) => {
    try {
      // ローカルストレージの紹介コードがあれば付与
      const ref = localStorage.getItem('axis_referrer');
      let url = `${API_BASE}/user?wallet=${pubkey}`;
      if (ref && ref !== pubkey) {
        url += `&ref=${ref}`;
      }

      const res = await fetch(url);
      
      if (!res.ok) {
        // 404などの場合は未登録(null)として返す
        return { success: false, user: null };
      }
      
      const data = await res.json();
      
      // データが空の場合のチェック
      if (!data || Object.keys(data).length === 0) {
          return { success: false, user: null };
      }

      // フロントエンド(username) と バックエンド(name) の違いを吸収
      return {
        success: true,
        user: {
            ...data,
            pubkey: pubkey,
            username: data.name || data.username, // nameがあればusernameとして扱う
            avatar_url: data.pfpUrl || data.avatar_url, // 表記揺れ吸収
            total_xp: data.total_xp || 0,
            rank_tier: data.rank_tier || 'Novice'
        }
      };
    } catch (e) {
      console.error("Fetch User Error:", e);
      return { success: false, user: null };
    }
  },

  /**
   * 2. プロフィール更新 (POST /user)
   * UI側の `username` をバックエンド側の `name` に変換して送信
   */
  async updateProfile(data: { wallet_address: string; name?: string; username?: string; bio?: string; avatar_url?: string; pfpUrl?: string }) {
    try {
      const payload = {
        wallet_address: data.wallet_address,
        name: data.username || data.name, // UIで入力された username を優先
        bio: data.bio,
        avatar_url: data.pfpUrl || data.avatar_url // pfpUrl を avatar_url として送信
      };

      const res = await fetch(`${API_BASE}/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (e) {
      console.error("Update Profile Error:", e);
      return { success: false, error: 'Network Error' };
    }
  },

  /**
   * 3. 画像アップロード (ProfileEditModalで使用)
   */
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

  /**
   * 4. 招待コードリクエスト
   */
  async requestInvite(email: string) {
    try {
      const res = await fetch(`${API_BASE}/request-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network Error' };
    }
  },

  /**
   * 5. 新規登録
   */
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

  /**
   * 6. 画像URLのプロキシ (R2キーをURLに変換)
   */
  getProxyUrl(url: string | undefined | null) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('blob:')) return url; // プレビュー用
    if (url.startsWith('data:')) return url;
    
    // R2 Keyだけの場合、API経由で表示
    return `${API_BASE}/upload/image/${url}`;
  },

  // ------------------------------------------------
  // 以下、既存機能 (変更なし)
  // ------------------------------------------------

  /**
   * Generate AI strategies
   */
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
    return res.json();
  },

  async checkWatchlist(id: string, userPubkey: string) {
    const res = await fetch(`${API_BASE}/strategies/${id}/watchlist?user=${userPubkey}`);
    return res.json();
  },

  async dailyCheckIn(pubkey: string) {
    // URLをバックエンドのルート定義 (/users/:wallet/checkin) に合わせる
    const url = `${API_BASE}/users/${pubkey}/checkin`; 
    try {
      const res = await fetch(url, { method: 'POST' });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Server Error: ${text}`);
      }
    } catch (error: any) {
      return { success: false, error: error.message }; 
    }
  },

  async syncUserStats(wallet: string, pnl: number, invested: number) {
    try {
      await fetch(`${API_BASE}/user/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: wallet,
          pnl_percent: pnl,
          total_invested_usd: invested
        }),
      });
    } catch (e) {
      console.error("Sync stats failed", e);
    }
  },

  // ★修正: リーダーボード取得
  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/user/leaderboard`);
    return await res.json();
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
    // ★修正: ここに logoURI?: string を追加してください
    tokens: { symbol: string; mint: string; weight: number; logoURI?: string }[];
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

  async deploy(txSignature: string, strategyData: any) {
    try {
      const response = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: txSignature, ...strategyData }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} - ${responseText}`);
      }
      return JSON.parse(responseText);
    } catch (error) {
      console.error("API Deploy Error:", error);
      throw error;
    }
  },

  async requestFaucet(wallet: string) {
    try {
      // エンドポイントは仮定。必要に応じてバックエンドに合わせてください
      const res = await fetch(`${API_BASE}/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
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

  async discoverStrategies(limit = 50, offset = 0) {
    const res = await fetch(`${API_BASE}/discover?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  // 汎用アップロード (Strategy作成時などに使用)
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