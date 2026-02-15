-- 既存のテーブルをリセット
DROP TABLE IF EXISTS invite_codes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS vaults;
DROP TABLE IF EXISTS strategies;

-- 1. 招待コードテーブル (★修正: emailカラムを追加)
CREATE TABLE invite_codes (
  code TEXT PRIMARY KEY,
  creator_id TEXT,
  email TEXT,                -- ★追加: 誰宛の招待コードかを記録
  is_used INTEGER DEFAULT 0,
  used_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 2. ユーザーテーブル
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
  total_xp INTEGER DEFAULT 500,
  rank_tier TEXT DEFAULT 'Novice',
  last_checkin INTEGER DEFAULT 0,
  last_faucet_at INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 3. Vaultテーブル
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
  tvl REAL DEFAULT 0,
  apy REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 4. AI Strategies
CREATE TABLE strategies (
  id TEXT PRIMARY KEY,
  owner_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, 
  config TEXT NOT NULL,
  description TEXT,
  jito_bundle_id TEXT,
  is_public INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  total_deposited REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 初期データ
INSERT INTO invite_codes (code, creator_id, is_used) VALUES ('AXIS-TEST', 'admin', 0);
INSERT INTO invite_codes (code, creator_id, is_used) VALUES ('AXIS-ALPHA', 'admin', 0);