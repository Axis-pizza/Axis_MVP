# Token情報取得システム ドキュメント

## 概要

Axis MVPのToken情報取得は、**Backend (BFF)** + **Frontend Services** + **外部API** の3層構造で構成されている。
フロントエンドの `useManualDashboard` フックが各サービスを統合し、Create画面のトークン選択UIにデータを供給する。

```
┌─────────────────────────────────────────────────────────────────┐
│  useManualDashboard (統合フック)                                   │
│  ┌───────────┬───────────┬──────────────┬───────────────────┐   │
│  │ Jupiter   │ dFlow     │ CoinGecko    │ DexScreener       │   │
│  │ Service   │ Service   │ Service      │ Service           │   │
│  └─────┬─────┴─────┬─────┴──────┬───────┴─────────┬─────────┘   │
│        │           │            │                 │              │
│ Frontend Services Layer                                          │
└────────┼───────────┼────────────┼─────────────────┼──────────────┘
         │           │            │                 │
    ┌────▼────┐      │     ┌──────▼──────┐  ┌──────▼──────┐
    │ Axis API│      │     │ CoinGecko   │  │ DexScreener │
    │  (BFF)  │      │     │   API       │  │   API       │
    └────┬────┘      │     └─────────────┘  └─────────────┘
         │           │
    ┌────▼─────────────▼────┐
    │   Jupiter Lite API     │
    │   Solana Token List    │
    └────────────────────────┘
```

---

## 1. データソース一覧

| データソース | 用途 | エンドポイント | キャッシュTTL |
|---|---|---|---|
| **Axis API (BFF)** | トークンリスト・価格取得 | `axis-api.workers.dev/api/jupiter/*` | サーバー: 1h, HTTP: 1h/30s |
| **Jupiter Lite API** | 個別トークン検索 (CA) | `lite-api.jup.ag/tokens/v1/{mint}` | メモリ (追加のみ) |
| **Jupiter Price API v2** | 価格取得 (BFF経由) | `api.jup.ag/price/v2` | HTTP Cache-Control: 30s |
| **CoinGecko** | Market Cap, 24h変動率 | `api.coingecko.com/api/v3/*` | 5分 (リスト), 3分 (価格) |
| **DexScreener** | Meme/新規トークン価格 | `api.dexscreener.com/latest/dex/*` | 30秒 |
| **GeckoTerminal** | OHLCVチャートデータ | `api.geckoterminal.com/api/v2/*` | なし |
| **Solana Token List** | トークンメタデータ (BFF経由) | `token-list-api.solana.cloud/v1/list` | サーバー: 1h |

---

## 2. Backend (BFF) — `axis-api`

### 2.1 トークンリスト取得

**ルート:** `GET /api/jupiter/tokens`
**ファイル:** `axis-api/src/routes/jupiter.ts` + `axis-api/src/services/jupiter.ts`

```
Client → GET /api/jupiter/tokens
       → JupiterService.getTokens()
       → fetch("https://token-list-api.solana.cloud/v1/list")
       → Solana Mainnet (chainId=101) のみフィルタ
       → Cache-Control: public, max-age=3600 で返却
```

- **サーバーメモリキャッシュ:** 1時間TTL (`tokenListCache`)
- **HTTPキャッシュ:** `Cache-Control: public, max-age=3600`
- Cloudflare Workersのウォームスタート間でメモリキャッシュが共有される可能性あり

### 2.2 価格取得

**ルート:** `GET /api/jupiter/prices?ids=MINT1,MINT2,...`
**ファイル:** `axis-api/src/routes/jupiter.ts` + `axis-api/src/services/jupiter.ts`

```
Client → GET /api/jupiter/prices?ids=So11...,EPjFW...
       → JupiterService.getPrices(ids, apiKey)
       → fetch("https://api.jup.ag/price/v2?ids=...")
       → Cache-Control: public, max-age=30 で返却
```

- **レスポンス形式:** `{ data: { "So11...": { price: "123.45" } } }` → `{ prices: { "So11...": 123.45 } }`
- `JUPITER_API_KEY` 環境変数があればPro APIアクセス可能（現在コメントアウト）

---

## 3. Frontend Services

### 3.1 JupiterService (`src/services/jupiter.ts`)

メインのトークンデータ供給源。Backend BFF経由でリストと価格を取得。

#### `getLiteList(): Promise<JupiterToken[]>`
- BFF (`/jupiter/tokens`) からトークンリスト全量を取得
- **メモリキャッシュ:** `liteCache` — 一度取得したらアプリ存続中キャッシュ
- **重複リクエスト防止:** `pendingListPromise` で同時リクエストをデデュプ
- **フォールバック:** API失敗時は `CRITICAL_FALLBACK` (SOL + USDC のみ)
- `isVerified` を `tags.includes('verified')` から導出

#### `searchTokens(query: string): Promise<JupiterToken[]>`
- クエリ長 > 30文字 → **CA (Contract Address) 検索**
  1. キャッシュ内でアドレス一致を検索
  2. 見つからなければ `fetchTokenByMint()` でJupiter APIから直接取得
- クエリ長 ≤ 30文字 → `symbol` / `name` の `includes` フィルタ（最大50件）

#### `fetchTokenByMint(mint: string): Promise<JupiterToken | null>`
- **直接API呼び出し:** `https://lite-api.jup.ag/tokens/v1/{mint}`
- キャッシュにないトークンのフォールバック用
- 取得成功時、`liteCache` に追加して以後のルックアップを高速化
- BFF非経由（フロントエンドから直接）

#### `getPrices(mintAddresses: string[]): Promise<Record<string, number>>`
- BFF (`/jupiter/prices?ids=...`) 経由で価格を取得
- 30文字未満のアドレスはフィルタアウト

#### `getTrendingTokens(): Promise<string[]>`
- DexScreener API (`/latest/dex/search?q=solana`) から直接取得
- Solanaチェーンのトレンドペアのmintアドレスを返す

### 3.2 WalletService (`src/services/jupiter.ts`)

#### `getUserTokens(connection, walletPublicKey): Promise<JupiterToken[]>`
- Solana RPCで `getParsedTokenAccountsByOwner` を実行
- SOL残高も取得して追加
- 各トークンの残高をJupiterのメタデータとマージ
- 残高降順でソート

### 3.3 CoinGeckoService (`src/services/coingecko.ts`)

Market CapデータとSolanaエコシステムトークンのランキング。

#### `fetchSolanaTokens(perPage=250): Promise<TokenInfo[]>`
- `GET /coins/markets?category=solana-ecosystem&order=market_cap_desc`
- **メモリキャッシュ:** 5分TTL (`tokenCache` + `rawCache`)
- Solanaアドレスは `platforms.solana` から取得
- 同じデータが `fetchMarketCapMap` でも利用される

#### `getMarketData(mints: string[]): Promise<Record<string, { price, change24h }>>`
- `GET /simple/token_price/solana?contract_addresses=...`
- **Base58バリデーション:** 不正なアドレス (USDC等の文字列) をフィルタ
- **メモリキャッシュ:** 3分TTL (`priceCache`)
- **バッチ処理:** 50件ずつチャンク分割

#### `fetchMarketCapMap(): Promise<{ byAddress, bySymbol }>`
- `fetchSolanaTokens` のキャッシュを共有
- address → marketCap と symbol → marketCap の2つのMapを返す
- `useManualDashboard` の初期化時にトークンを enrichする

### 3.4 DexScreenerService (`src/services/dexscreener.ts`)

Meme/Pump.funトークン向け。CoinGeckoにないトークンの価格取得に有用。

#### `getMarketData(mints: string[]): Promise<Record<string, { price, change24h }>>`
- `GET /latest/dex/tokens/{MINT1,MINT2,...}`
- **メモリキャッシュ:** 30秒TTL
- **バッチ処理:** 30件ずつチャンク分割
- **API制限:** 300リクエスト/分

### 3.5 GeckoTerminalService (`src/services/geckoterminal.ts`)

チャート表示用のOHLCVデータ。

#### `getOHLCV(tokenAddress, timeframe): Promise<CandlestickData[]>`
1. トークンのトップPoolを取得: `GET /tokens/{address}/pools?limit=1`
2. Pool のOHLCVを取得: `GET /pools/{poolAddress}/ohlcv/{timeframe}?limit=100`
3. Lightweight Charts形式にフォーマット（time, open, high, low, close）

### 3.6 dFlowService (`src/services/dflow.ts`)

**Mock Phase 1** — 予測市場トークン、株式トークン、コモディティトークン。

#### `fetchPredictionTokens(): Promise<JupiterToken[]>`
- ハードコードされたモックイベント（BTC $150K, Fed Rate, SOL ATH, US Senate等）
- YES/NOペアの仮想トークンを生成（`isMock: true`, `source: 'dflow'`）

#### `fetchStockTokens(): Promise<JupiterToken[]>`
- xStocksシンボル（AAPLx, TSLAx, NVDAx等）をJupiterで検索
- 実在トークンをJupiterの `searchTokens` で取得
- `source: 'stock'` タグ付き、`isMock: false`

#### `fetchCommodityTokens(): Promise<JupiterToken[]>`
- Remoraメタルトークン（GLDr, SLVr, CPERr等）
- ハードコードされたmintアドレスでJupiterから取得
- フォールバック: メタデータ取得失敗時はローカル定義を使用
- `source: 'commodity'` タグ付き、`isMock: false`

---

## 4. 統合フック — `useManualDashboard`

`src/hooks/useManualDashboard.ts`

### 4.1 初期化フロー

`useEffect` で以下を **並列実行**:

```typescript
const [list, predictionTokens, stockTokens, commodityTokens, mcMaps] = await Promise.all([
  JupiterService.getLiteList(),           // メインのトークンリスト
  fetchPredictionTokens(),                // 予測市場トークン (mock)
  fetchStockTokens(),                     // 株式トークン (real)
  fetchCommodityTokens(),                 // コモディティトークン (real)
  fetchMarketCapMap(),                    // CoinGecko Market Cap
]);
```

### 4.2 マージ順序

```
1. POPULAR_SYMBOLS (SOL, USDC, USDT, JUP, etc.) — 上位固定
2. predictionTokens (dFlow mock)
3. stockTokens (xStocks)
4. commodityTokens (Remora)
5. その他のJupiterトークン
```

マージ後、CoinGeckoの `marketCap` データで enrichする:
- `byAddress` (アドレス一致) → `bySymbol` (シンボル一致) のフォールバック

### 4.3 検索アルゴリズム

**スコアベースランキング:**

| スコア | 条件 |
|---|---|
| 100 | アドレス完全一致 |
| 90 | アドレス前方一致 |
| 80 | シンボル完全一致 |
| 60 | シンボル前方一致 |
| 40 | シンボル部分一致 |
| 35 | 名前完全一致 |
| 30 | 名前前方一致 |
| 20 | 名前部分一致 |

- クエリ長 ≥ 32文字 → **アドレス検索モード**（name/symbol マッチングをスキップ）
- **CA フォールバック:** キャッシュにないアドレスは `fetchTokenByMint()` で非同期取得し、結果を先頭に挿入

### 4.4 タブ別表示ロジック

| タブ | データソース | 備考 |
|---|---|---|
| **All** | `allTokens` (マージ済み全データ) | カテゴリフィルタ (crypto/stock/commodity/prediction) 対応 |
| **Your Tokens** | `WalletService.getUserTokens()` | ウォレット接続 + タブ選択時にオンデマンド取得 |
| **Trending** | `trendingIds` (DexScreener) + `allTokens` | トレンドID一致トークン優先、verified上位20件を補完 |
| **Meme** | `allTokens` フィルタ | `tags.includes('meme')` + ハードコード有名ミームリスト |

### 4.5 カテゴリフィルタ (Allタブ内)

| フィルタ | 条件 |
|---|---|
| `crypto` | `!source` or `source === 'jupiter'` |
| `stock` | `source === 'stock'` |
| `commodity` | `source === 'commodity'` |
| `prediction` | `source === 'dflow'` |

---

## 5. JupiterToken インターフェース

```typescript
interface JupiterToken {
  address: string;        // Solana mint address
  chainId: number;        // 101 (Solana Mainnet)
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags: string[];          // ['verified', 'meme', 'prediction', etc.]
  isVerified?: boolean;    // tags.includes('verified') から導出
  price?: number;
  balance?: number;        // ウォレット残高 (WalletService使用時)
  source?: string;         // 'jupiter' | 'stock' | 'commodity' | 'dflow'
  dailyVolume?: number;
  marketCap?: number;      // CoinGecko enrichment
  isMock?: boolean;        // 予測市場トークン用
  predictionMeta?: {       // dFlow予測市場メタデータ
    eventId: string;
    eventTitle: string;
    marketId: string;
    marketQuestion: string;
    side: 'YES' | 'NO';
    expiry: string;
  };
}
```

---

## 6. キャッシュ戦略まとめ

| 層 | キャッシュ方式 | TTL | 備考 |
|---|---|---|---|
| Backend Token List | メモリ (`tokenListCache`) | 1時間 | Workers warm start間で共有可能 |
| Backend Token List | HTTP `Cache-Control` | 1時間 | CDN/ブラウザキャッシュ |
| Backend Prices | HTTP `Cache-Control` | 30秒 | 価格変動を考慮した短TTL |
| Frontend Token List | メモリ (`liteCache`) | 無期限 | アプリ存続中有効、リロードでクリア |
| Frontend Token List | 重複防止 (`pendingListPromise`) | - | 同時リクエストのデデュプ |
| CoinGecko Token List | メモリ (`tokenCache`) | 5分 | `rawCache` と共有 |
| CoinGecko Prices | メモリ (`priceCache`) | 3分 | mintアドレス単位 |
| DexScreener Prices | メモリ (`cache`) | 30秒 | mintアドレス単位 |
| CA Fallback | `liteCache` に追加 | 無期限 | 取得成功時にキャッシュへ永続追加 |

---

## 7. エラーハンドリング

- **Jupiter BFF失敗:** `CRITICAL_FALLBACK` (SOL + USDC) を返す
- **CoinGecko失敗:** 古いキャッシュがあればそれを使用、なければ空配列
- **DexScreener失敗:** 空オブジェクトを返す
- **GeckoTerminal失敗:** 空配列を返す
- **dFlow Stock/Commodity失敗:** 個別 `.catch(() => [])` でサイレント
- **WalletService失敗:** 空配列を返す
- **CA Fallback失敗:** `null` を返しUI上で無視

全サービスが「グレースフルデグラデーション」パターンを採用しており、一部のデータソースが失敗してもアプリは動作し続ける。
