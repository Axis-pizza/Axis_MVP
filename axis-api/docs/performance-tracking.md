# Strategy Performance Tracking

## Overview

5-minute cadence price snapshot system that calculates and persists a weighted index price for every deployed strategy.

## Scope (MVP)

- Record index price snapshots every 5 minutes to D1
- Establish a deployment baseline (first recorded snapshot) per strategy
- No chart generation, no API endpoint changes, no frontend changes

## Architecture

```
Cloudflare Cron Trigger (*/5 * * * *)
  -> scheduled() handler in app.ts
    -> runPriceSnapshot(db)
      -> SELECT all strategies
      -> Collect unique mints from composition/config
      -> fetchPrices(mints)
        -> DexScreener (primary, 30 mints/batch)
        -> Jupiter Price API v2 (fallback)
      -> Calculate index_price per strategy
      -> INSERT OR REPLACE into strategy_price_snapshots
      -> INSERT OR IGNORE into strategy_deployment_baseline
```

## DB Schema

### `strategy_price_snapshots`

| Column | Type | Description |
|--------|------|-------------|
| strategy_id | TEXT | FK to strategies.id |
| ts_bucket_utc | INTEGER | `floor(epoch_s / 300) * 300` |
| index_price | REAL | Weighted average price |
| prices_json | TEXT | `{mint: price_usd}` |
| weights_json | TEXT | `{mint: normalized_weight}` |
| source_json | TEXT | `{mint: "dexscreener"\|"jupiter"\|"none"}` |
| confidence | TEXT | `OK` \| `PARTIAL` \| `FAIL` |
| version | INTEGER | Schema version (1) |
| metadata_json | TEXT | `{missing_mints: [...]}` or null |
| created_at | INTEGER | Unix epoch seconds |

**PK**: `(strategy_id, ts_bucket_utc)` -- guarantees idempotent upsert.

### `strategy_deployment_baseline`

| Column | Type | Description |
|--------|------|-------------|
| strategy_id | TEXT PK | FK to strategies.id |
| baseline_ts_bucket_utc | INTEGER | Bucket of first snapshot |
| baseline_price | REAL | Index price at deployment |
| baseline_confidence | TEXT | Confidence of baseline snapshot |
| created_at | INTEGER | Unix epoch seconds |

Uses `INSERT OR IGNORE` so only the first snapshot becomes the baseline.

## Index Price Calculation

```
index_price = SUM( normalized_weight_i * token_price_usd_i )

normalized_weight_i = weight_i / SUM(all weights)
```

- If `SUM(weights) == 0`: index_price = 0, confidence = FAIL
- If any token price is missing (0): that token contributes 0 to the sum
- Confidence: OK (all resolved), PARTIAL (some missing), FAIL (all missing or no tokens)

## Price Sources

1. **DexScreener** (primary): `https://api.dexscreener.com/latest/dex/tokens/{mints}`
   - Batch: 30 mints per request
   - Rate limit: 300 req/min
   - Selects highest-liquidity pair per mint

2. **Jupiter Price API v2** (fallback): `https://api.jup.ag/price/v2?ids={mints}`
   - Used only for mints that DexScreener couldn't resolve

3. **STRICT_LIST** (symbol resolution): Maps symbol -> mint address for tokens stored without mint

## Missing Data Policy

- No carry-forward or interpolation
- Missing price = 0 in calculation
- confidence = PARTIAL or FAIL recorded
- All snapshots are saved regardless of confidence

## Cron Configuration

```jsonc
// wrangler.jsonc
"triggers": {
  "crons": [
    "*/5 * * * *",  // price snapshot
    "0 * * * *"     // XP distribution (existing)
  ]
}
```

The `scheduled()` handler dispatches based on `event.cron`:
- Both crons trigger price snapshots
- Only `0 * * * *` triggers XP distribution

## Local Verification

```bash
# 1. Apply migration
npx wrangler d1 execute axis-db --local --file=migrations/0009_add_price_snapshots.sql

# 2. Start dev server
pnpm dev

# 3. Trigger cron manually
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"

# 4. Check results
npx wrangler d1 execute axis-db --local \
  --command="SELECT strategy_id, ts_bucket_utc, index_price, confidence FROM strategy_price_snapshots LIMIT 10"

npx wrangler d1 execute axis-db --local \
  --command="SELECT * FROM strategy_deployment_baseline LIMIT 10"
```

## Files Changed

| File | Change |
|------|--------|
| `migrations/0009_add_price_snapshots.sql` | New tables |
| `src/services/snapshot/price-fetcher.ts` | Price fetching (DexScreener + Jupiter) |
| `src/services/snapshot/index.ts` | Snapshot worker logic |
| `src/app.ts` | Replace old snapshotAllStrategies, update scheduled handler |
| `wrangler.jsonc` | Add `*/5 * * * *` cron trigger |
| `docs/performance-tracking.md` | This file |

## Future Work (out of scope)

- Chart generation API from snapshot data
- Data compression / downsampling for old snapshots
- Frontend performance display
- Alerts on consecutive FAIL snapshots
