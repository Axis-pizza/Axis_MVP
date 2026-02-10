-- =====================================================
-- 1. リセット (全削除: 開発用)
-- =====================================================
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS strategies;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS xp_rates;
DROP TABLE IF EXISTS xp_snapshots;
DROP TABLE IF EXISTS xp_ledger;
DROP TABLE IF EXISTS processed_deposits;

-- =====================================================
-- 2. ユーザー管理
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
  
  -- ゲーム要素
  total_xp INTEGER DEFAULT 500,
  rank_tier TEXT DEFAULT 'Novice',
  last_checkin INTEGER DEFAULT 0,

  -- 投資成績データ (ALTER分をここに統合)
  pnl_percent REAL DEFAULT 0,
  total_invested_usd REAL DEFAULT 0,
  strategies_count INTEGER DEFAULT 0,
  last_snapshot_at INTEGER,

  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_users_xp ON users(total_xp DESC);

-- =====================================================
-- 3. 戦略 (ETF) - ここを完全版に修正
-- =====================================================
CREATE TABLE strategies (
  id TEXT PRIMARY KEY,
  owner_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,          -- ★ 必須
  description TEXT,
  image_url TEXT,
  
  -- システム区分
  type TEXT DEFAULT 'BALANCED',  -- ★ APIが送ってくる 'type' に対応
  category TEXT DEFAULT 'COMMUNITY',
  mint_address TEXT,             -- ★ Mint後に保存されるアドレス
  
  -- 構成データ
  composition TEXT,              -- トークン構成JSON
  config TEXT,                   -- JSON文字列 (設定など)
  vault_address TEXT,            -- サーバーWalletアドレス（Webhook照合に必須）

  -- 統計データ (ダッシュボード表示用)
  tvl REAL DEFAULT 0,
  total_deposited REAL DEFAULT 0,
  roi REAL DEFAULT 0,
  pnl REAL DEFAULT 0,
  pnl_percent REAL DEFAULT 0,
  investors_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',

  is_active BOOLEAN DEFAULT 1,
  last_rebalance INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- =====================================================
-- 4. XPシステム: レート定義
-- =====================================================
CREATE TABLE xp_rates (
  strategy_id TEXT PRIMARY KEY,
  base_rate REAL NOT NULL DEFAULT 1.0,
  is_active BOOLEAN DEFAULT 1
);

-- =====================================================
-- 5. XPシステム: 資産スナップショット
-- =====================================================
CREATE TABLE xp_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  capped_usd REAL NOT NULL,
  snapshot_at INTEGER DEFAULT (strftime('%s', 'now')),
  is_processed BOOLEAN DEFAULT 0
);

-- =====================================================
-- 6. XPシステム: 履歴台帳
-- =====================================================
CREATE TABLE xp_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pubkey TEXT NOT NULL,
  amount REAL NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  related_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_xp_ledger_user ON xp_ledger(user_pubkey);

-- =====================================================
-- 7. ウォッチリスト
-- =====================================================
CREATE TABLE watchlist (
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_pubkey, strategy_id)
);

-- =====================================================
-- 8. 二重Mint防止用
-- =====================================================
CREATE TABLE processed_deposits (
    signature TEXT PRIMARY KEY,
    strategy_id TEXT NOT NULL,
    user_address TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    mint_amount TEXT,
    processed_at INTEGER DEFAULT (unixepoch())
);