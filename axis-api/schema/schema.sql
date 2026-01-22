-- Users Table (認証・プロファイル・招待機能対応版)
DROP TABLE IF EXISTS users;
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
DROP TABLE IF EXISTS invites;
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
DROP TABLE IF EXISTS vaults;
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

DROP TABLE IF EXISTS strategies;
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