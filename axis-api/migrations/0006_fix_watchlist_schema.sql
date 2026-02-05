-- Drop any existing misnamed tables
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS watchlists;

-- Create watchlist table matching route handler queries (singular)
CREATE TABLE watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(user_id, strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_strategy ON watchlist(strategy_id);
