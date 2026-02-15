-- =====================================================
-- 0009: Strategy Price Snapshots & Deployment Baseline
-- 5-minute cadence performance tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS strategy_price_snapshots (
  strategy_id TEXT NOT NULL,
  ts_bucket_utc INTEGER NOT NULL,
  index_price REAL NOT NULL,
  prices_json TEXT NOT NULL,
  weights_json TEXT NOT NULL,
  source_json TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('OK','PARTIAL','FAIL')),
  version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (strategy_id, ts_bucket_utc)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_ts
  ON strategy_price_snapshots(ts_bucket_utc);

CREATE INDEX IF NOT EXISTS idx_snapshots_strategy_ts
  ON strategy_price_snapshots(strategy_id, ts_bucket_utc DESC);

CREATE TABLE IF NOT EXISTS strategy_deployment_baseline (
  strategy_id TEXT PRIMARY KEY,
  baseline_ts_bucket_utc INTEGER NOT NULL,
  baseline_price REAL NOT NULL,
  baseline_confidence TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
