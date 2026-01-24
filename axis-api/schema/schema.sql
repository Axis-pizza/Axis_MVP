-- =====================================================
-- 1. リセット (全削除)
-- =====================================================
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS strategies;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS xp_rates;
DROP TABLE IF EXISTS xp_snapshots;
DROP TABLE IF EXISTS xp_ledger;

-- =====================================================
-- 2. ユーザー管理 (XP & Referral統合)
-- =====================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  wallet_address TEXT UNIQUE,
  twitter_id TEXT,
  google_id TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  badges TEXT,
  invite_code TEXT UNIQUE,
  invite_code_used TEXT,
  otp_code TEXT,
  otp_expires INTEGER,
  
  -- ゲーム要素（既存）
  total_xp INTEGER DEFAULT 500,
  rank_tier TEXT DEFAULT 'Novice',
  last_checkin INTEGER DEFAULT 0,

  -- ★追加: 投資成績データ
  pnl_percent REAL DEFAULT 0,       -- 通算損益率 (例: 12.5)
  total_invested_usd REAL DEFAULT 0, -- 総投資額 (USD)
  last_snapshot_at INTEGER,         -- 最終更新日時 (Unix Timestamp)

  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_users_xp ON users(total_xp DESC);

-- =====================================================
-- 3. 戦略 (ETF)
-- =====================================================
CREATE TABLE strategies (
  id TEXT PRIMARY KEY,
  owner_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  config TEXT NOT NULL, -- JSON
  
  -- Hylo型レート区分
  category TEXT DEFAULT 'COMMUNITY', -- 'OFFICIAL', 'VERIFIED', 'COMMUNITY'
  
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- =====================================================
-- 4. XPシステム: レート定義
-- =====================================================
CREATE TABLE xp_rates (
  strategy_id TEXT PRIMARY KEY,
  base_rate REAL NOT NULL DEFAULT 1.0, -- XP per $1 per Day
  is_active BOOLEAN DEFAULT 1
);

-- =====================================================
-- 5. XPシステム: 資産スナップショット (Devnet Cap対応用)
-- =====================================================
CREATE TABLE xp_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,       -- 生の資産額
  capped_usd REAL NOT NULL,       -- キャップ適用後の計算対象額 (Max $5000)
  snapshot_at INTEGER DEFAULT (strftime('%s', 'now')),
  is_processed BOOLEAN DEFAULT 0
);

-- =====================================================
-- 6. XPシステム: 履歴台帳 (Ledger)
-- =====================================================
CREATE TABLE xp_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pubkey TEXT NOT NULL,
  amount REAL NOT NULL,
  action_type TEXT NOT NULL, -- 'HOLDING', 'REFERRAL_BONUS', 'DAILY_CHECKIN'
  description TEXT,
  related_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_xp_ledger_user ON xp_ledger(user_pubkey);

-- その他: ウォッチリストなど
CREATE TABLE watchlist (
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_pubkey, strategy_id)
);