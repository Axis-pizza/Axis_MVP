/**
 * Strategy Price Snapshot Worker
 *
 * Runs every 5 minutes via Cloudflare Cron Trigger.
 * Calculates weighted index price for each strategy and persists to D1.
 */

import { fetchPrices, resolveMint, PriceResult } from './price-fetcher';

const BUCKET_SECONDS = 300; // 5 minutes
const D1_BATCH_LIMIT = 50;  // conservative limit for D1 batch

interface TokenEntry {
  symbol: string;
  weight: number;
  mint: string | null;
}

interface StrategyRow {
  id: string;
  composition: string | null;
  config: string | null;
}

/**
 * Main entry point. Called by the scheduled handler.
 */
export async function runPriceSnapshot(db: any): Promise<void> {
  const startMs = Date.now();
  const tsBucket = Math.floor(startMs / 1000 / BUCKET_SECONDS) * BUCKET_SECONDS;

  // 1. Fetch all strategies
  const { results: rows } = await db.prepare(
    'SELECT id, composition, config FROM strategies'
  ).all();

  if (!rows || rows.length === 0) {
    console.log('[Snapshot] No strategies found.');
    return;
  }

  // 2. Parse tokens and collect all unique mints
  const strategyTokens = new Map<string, TokenEntry[]>();
  const allMints = new Set<string>();

  for (const row of rows) {
    const tokens = parseTokens(row);
    strategyTokens.set(row.id, tokens);
    for (const t of tokens) {
      if (t.mint) allMints.add(t.mint);
    }
  }

  // 3. Batch fetch all prices (deduplicated by mint)
  const priceMap = await fetchPrices([...allMints]);

  // 4. Build snapshot statements
  const snapshotStmts: any[] = [];
  const baselineStmts: any[] = [];

  for (const row of rows) {
    const tokens = strategyTokens.get(row.id)!;
    const snapshot = buildSnapshot(row.id, tsBucket, tokens, priceMap);

    snapshotStmts.push(
      db.prepare(`
        INSERT OR REPLACE INTO strategy_price_snapshots
          (strategy_id, ts_bucket_utc, index_price, prices_json, weights_json,
           source_json, confidence, version, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        snapshot.strategy_id,
        snapshot.ts_bucket_utc,
        snapshot.index_price,
        snapshot.prices_json,
        snapshot.weights_json,
        snapshot.source_json,
        snapshot.confidence,
        snapshot.metadata_json,
        snapshot.created_at
      )
    );

    // Baseline: INSERT OR IGNORE ensures only the first snapshot becomes baseline
    baselineStmts.push(
      db.prepare(`
        INSERT OR IGNORE INTO strategy_deployment_baseline
          (strategy_id, baseline_ts_bucket_utc, baseline_price, baseline_confidence, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        snapshot.strategy_id,
        snapshot.ts_bucket_utc,
        snapshot.index_price,
        snapshot.confidence,
        snapshot.created_at
      )
    );
  }

  // 5. Execute in batches (D1 batch limit)
  await batchExecute(db, [...snapshotStmts, ...baselineStmts]);

  const elapsed = Date.now() - startMs;
  console.log(
    `[Snapshot] Done: ${rows.length} strategies, ${allMints.size} mints, ` +
    `bucket=${tsBucket}, ${elapsed}ms`
  );
}

/**
 * Parse token entries from a strategy's composition or config column.
 */
function parseTokens(row: StrategyRow): TokenEntry[] {
  // Try composition first (array of {symbol, weight, mint, ...})
  // Then fall back to config
  const raw = row.composition || row.config;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    // If parsed is an array, treat as token list
    if (Array.isArray(parsed)) {
      return parsed
        .filter((t: any) => t.symbol && typeof t.weight === 'number')
        .map((t: any) => ({
          symbol: t.symbol.toUpperCase(),
          weight: t.weight,
          mint: resolveMint(t),
        }));
    }

    // If config is an object (not an array), check if composition has the array
    if (row.config && row.config !== raw) {
      try {
        const configParsed = JSON.parse(row.config);
        if (Array.isArray(configParsed)) {
          return configParsed
            .filter((t: any) => t.symbol && typeof t.weight === 'number')
            .map((t: any) => ({
              symbol: t.symbol.toUpperCase(),
              weight: t.weight,
              mint: resolveMint(t),
            }));
        }
      } catch { /* ignore */ }
    }

    return [];
  } catch {
    return [];
  }
}

interface SnapshotRecord {
  strategy_id: string;
  ts_bucket_utc: number;
  index_price: number;
  prices_json: string;
  weights_json: string;
  source_json: string;
  confidence: 'OK' | 'PARTIAL' | 'FAIL';
  metadata_json: string;
  created_at: number;
}

/**
 * Build a snapshot record for a single strategy.
 */
function buildSnapshot(
  strategyId: string,
  tsBucket: number,
  tokens: TokenEntry[],
  priceMap: Map<string, PriceResult>
): SnapshotRecord {
  const now = Math.floor(Date.now() / 1000);

  // Handle empty token list
  if (tokens.length === 0) {
    return {
      strategy_id: strategyId,
      ts_bucket_utc: tsBucket,
      index_price: 0,
      prices_json: '{}',
      weights_json: '{}',
      source_json: '{}',
      confidence: 'FAIL',
      metadata_json: JSON.stringify({ error: 'no_tokens' }),
      created_at: now,
    };
  }

  // Normalize weights
  const totalWeight = tokens.reduce((sum, t) => sum + t.weight, 0);

  if (totalWeight === 0) {
    return {
      strategy_id: strategyId,
      ts_bucket_utc: tsBucket,
      index_price: 0,
      prices_json: '{}',
      weights_json: '{}',
      source_json: '{}',
      confidence: 'FAIL',
      metadata_json: JSON.stringify({ error: 'zero_total_weight' }),
      created_at: now,
    };
  }

  const prices: Record<string, number> = {};
  const weights: Record<string, number> = {};
  const sources: Record<string, string> = {};
  const missingMints: string[] = [];
  let indexPrice = 0;
  let missingCount = 0;

  for (const token of tokens) {
    const normalizedWeight = token.weight / totalWeight;
    const key = token.mint || token.symbol;

    weights[key] = normalizedWeight;

    if (!token.mint) {
      // No mint resolved — treat as missing
      prices[key] = 0;
      sources[key] = 'no_mint';
      missingMints.push(token.symbol);
      missingCount++;
      continue;
    }

    const priceResult = priceMap.get(token.mint);
    const priceUsd = priceResult?.price_usd ?? 0;
    const source = priceResult?.source ?? 'none';

    prices[token.mint] = priceUsd;
    sources[token.mint] = source;

    if (priceUsd === 0) {
      missingMints.push(token.symbol);
      missingCount++;
    }

    indexPrice += normalizedWeight * priceUsd;
  }

  // Determine confidence
  let confidence: 'OK' | 'PARTIAL' | 'FAIL';
  if (missingCount === 0) {
    confidence = 'OK';
  } else if (missingCount < tokens.length) {
    confidence = 'PARTIAL';
  } else {
    confidence = 'FAIL';
  }

  const metadata: Record<string, any> = {};
  if (missingMints.length > 0) {
    metadata.missing_mints = missingMints;
  }

  return {
    strategy_id: strategyId,
    ts_bucket_utc: tsBucket,
    index_price: indexPrice,
    prices_json: JSON.stringify(prices),
    weights_json: JSON.stringify(weights),
    source_json: JSON.stringify(sources),
    confidence,
    metadata_json: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null!,
    created_at: now,
  };
}

/**
 * Execute D1 prepared statements in batches to respect D1 limits.
 */
async function batchExecute(db: any, stmts: any[]): Promise<void> {
  for (let i = 0; i < stmts.length; i += D1_BATCH_LIMIT) {
    const chunk = stmts.slice(i, i + D1_BATCH_LIMIT);
    await db.batch(chunk);
  }
}
