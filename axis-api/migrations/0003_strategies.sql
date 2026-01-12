-- Strategies Table (Kagemusha deployed strategies)
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  owner_pubkey TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT,  -- JSON of token composition
  jito_bundle_id TEXT,
  status TEXT DEFAULT 'active',
  total_deposited REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for faster lookups by owner
CREATE INDEX IF NOT EXISTS idx_strategies_owner ON strategies(owner_pubkey);
