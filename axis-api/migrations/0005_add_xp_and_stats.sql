
ALTER TABLE users ADD COLUMN total_invested_usd REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_snapshot_at INTEGER;

-- 新規テーブルの作成
CREATE TABLE IF NOT EXISTS xp_rates (
  strategy_id TEXT PRIMARY KEY,
  base_rate REAL NOT NULL DEFAULT 1.0,
  is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS xp_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  capped_usd REAL NOT NULL,
  snapshot_at INTEGER DEFAULT (strftime('%s', 'now')),
  is_processed BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS xp_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pubkey TEXT NOT NULL,
  amount REAL NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  related_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON xp_ledger(user_pubkey);

CREATE TABLE IF NOT EXISTS watchlist (
  user_pubkey TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_pubkey, strategy_id)
);