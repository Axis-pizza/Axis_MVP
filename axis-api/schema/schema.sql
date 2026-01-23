-- Users Table (認証・プロファイル・招待機能対応版)

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,         -- Walletログイン用にNULL許可に変更
  wallet_address TEXT UNIQUE,
  name TEXT,                 -- 表示名 (Twitter等から取得)
  avatar_url TEXT,           -- アイコン画像
  twitter_id TEXT,           -- Twitter連携用
  google_id TEXT,            -- Google連携用
  invite_code TEXT UNIQUE,   -- 自分が誰かを招待するためのコード
  invite_code_used TEXT,     -- 自分が登録時に使用したコード
  otp_code TEXT,             -- メール認証用OTP
  otp_expires INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Invites Table (変更なし: そのままでOK)

CREATE TABLE invites (
  code TEXT PRIMARY KEY,       
  creator_id TEXT NOT NULL,    
  used_by_user_id TEXT,        
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Admin Codes (変更なし)
INSERT OR IGNORE INTO invites (code, creator_id) VALUES ('AXIS-ALPHA', 'admin-id');
INSERT OR IGNORE INTO invites (code, creator_id) VALUES ('AXIS-BETA', 'admin-id');

-- Vaults Table (変更なし: 完璧です)

CREATE TABLE vaults (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  creator TEXT NOT NULL, 
  strategy_type TEXT DEFAULT 'yield_max',
  management_fee REAL DEFAULT 0.95,
  min_liquidity REAL DEFAULT 0,
  composition TEXT NOT NULL, 
  image_url TEXT,
  tvl REAL DEFAULT 0,          -- デフォルト0でGood
  apy REAL DEFAULT 0,          -- デフォルト0でGood
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);


CREATE TABLE strategies (
  id TEXT PRIMARY KEY,
  owner_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  config TEXT,           -- 構成銘柄 (JSON文字列)
  description TEXT,
  jito_bundle_id TEXT,
  is_public INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  total_deposited REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE strategy_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id TEXT NOT NULL,       -- 戦略ID
  nav REAL NOT NULL,               -- 純資産価値 (Net Asset Value) - 基準価格
  tvl REAL,                        -- その時点のTVL
  timestamp INTEGER NOT NULL       -- 記録日時 (Unix Time)
);

-- 高速化のためのインデックス
CREATE INDEX idx_snapshots_strategy_time ON strategy_snapshots(strategy_id, timestamp);

CREATE TABLE IF NOT EXISTS watchlist (
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_pubkey, strategy_id)
);