-- 既存のテーブルを一度リセット（構造変更のため）
DROP TABLE IF EXISTS invite_codes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS vaults;
DROP TABLE IF EXISTS strategies;

-- 1. 招待コードテーブル
-- バックエンドに合わせてテーブル名を 'invites' -> 'invite_codes' に変更
-- カラム名もコード内のロジック (is_used, used_by) に統一
CREATE TABLE invite_codes (
  code TEXT PRIMARY KEY,
  creator_id TEXT,           -- 発行者ID (NULLなら運営発行)
  is_used INTEGER DEFAULT 0, -- 0:未使用, 1:使用済み
  used_by TEXT,              -- 使用したユーザーID
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 2. ユーザーテーブル
-- プロフィール編集API (bio, badges) に対応するためカラムを追加
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  wallet_address TEXT UNIQUE,
  twitter_id TEXT,
  google_id TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,                  -- プロフィール用
  badges TEXT,               -- バッジ情報 (JSON文字列)
  invite_code TEXT UNIQUE,   -- 自分が発行する招待コード
  invite_code_used TEXT,     -- 自分が登録に使ったコード
  otp_code TEXT,
  otp_expires INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 3. Vaultテーブル (変更なし)
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

-- 4. AI Strategies (Kagemusha)
CREATE TABLE strategies (
  id TEXT PRIMARY KEY,
  owner_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- SNIPER, FORTRESS, WAVE
  config TEXT NOT NULL, -- JSON weights
  description TEXT,
  jito_bundle_id TEXT,
  is_public INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  total_deposited REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 初期データ投入
-- テスト用の招待コードを作成 (これがないとInviteGateを通過できません)
INSERT INTO invite_codes (code, creator_id, is_used) VALUES ('AXIS-TEST', 'admin', 0);
INSERT INTO invite_codes (code, creator_id, is_used) VALUES ('AXIS-ALPHA', 'admin', 0);