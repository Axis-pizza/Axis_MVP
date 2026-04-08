import { int, integer, primaryKey, real, sqliteTable, text, customType } from "drizzle-orm/sqlite-core";

// ──────────────────────────────────────────────────────────
// DBの型定義とテーブルスキーマ
// （Drizzle ORMを使用してSQLiteのテーブルを定義）
// ──────────────────────────────────────────────────────────
// Drizzleのカスタム型：ISO 8601形式の日時をDBに保存するための型変換ロジック
const customTimestamp = customType<
    {
        data: Date; // TypeScript上の型
        driverData: string; // DB上の型
    }
>({
    // DB上の型
    dataType: (): string => "text",

    // TypeScript -> DBの変換
    toDriver: (value: Date): string => value.toISOString(),

    // DB -> TypeScriptの変換
    fromDriver: (value: string): Date => new Date(value),
});

// ──────────────────────────────────────────────────────────
// ユーザー（認証・プロフィール・投資サマリー）
// ──────────────────────────────────────────────────────────
export const usersTable = sqliteTable("users", {
    id:                 text("id").primaryKey(),
    email:              text("email").unique(),
    wallet_address:     text("wallet_address").unique().notNull(),
    name:               text("name"),
    bio:                text("bio"),
    avatar_url:         text("avatar_url"),
    twitter_id:         text("twitter_id"),
    google_id:          text("google_id"),
    invite_code:        text("invite_code").unique(),
    invite_code_used:   text("invite_code_used"),
    badges:             text("badges"),
    otp_code:           text("otp_code"),
    otp_expires:        int("otp_expires"),
    total_xp:           int("total_xp").default(0),
    rank_tier:          text("rank_tier").default("Novice"),
    pnl_percent:        real("pnl_percent").default(0),
    last_checkin:       int("last_checkin").default(0),
    last_faucet_at:     int("last_faucet_at"),
    total_invested_usd: real("total_invested_usd"),
    last_snapshot_at:   int("last_snapshot_at"),
    created_at:         int("created_at"),
});

// ──────────────────────────────────────────────────────────
// 招待コード管理
// ──────────────────────────────────────────────────────────
export const invitesTable = sqliteTable("invites", {
    code:             text("code").primaryKey(),
    creator_id:       text("creator_id").notNull(),
    used_by_user_id:  text("used_by_user_id"),
    created_at:       int("created_at"),
});

// ──────────────────────────────────────────────────────────
// Vault（ファンド商品）
// ──────────────────────────────────────────────────────────
export const vaultsTable = sqliteTable("vaults", {
    id:             text("id").primaryKey(),
    name:           text("name"),
    symbol:         text("symbol"),
    description:    text("description"),
    creator:        text("creator"),
    strategy_type:  text("strategy_type"),
    management_fee: real("management_fee"),
    min_liquidity:  real("min_liquidity"),
    composition:    text("composition"),
    image_url:      text("image_url"),
    tvl:            real("tvl"),
    apy:            real("apy"),
    created_at:     int("created_at"),
});

// ──────────────────────────────────────────────────────────
// 戦略（自動売買ロジック）
// ──────────────────────────────────────────────────────────
export const strategiesTable = sqliteTable("strategies", {
    id:              text("id").primaryKey(),
    owner_pubkey:    text("owner_pubkey"),
    name:            text("name"),
    ticker:          text("ticker"),
    type:            text("type"),
    description:     text("description"),
    composition:     text("composition"),
    config:          text("config"),
    jito_bundle_id:  text("jito_bundle_id"),
    status:          text("status"),
    total_deposited: real("total_deposited"),
    tvl:             real("tvl"),
    roi:             real("roi"),
    mint_address:    text("mint_address"),
    vault_address:   text("vault_address"),
    is_public:       int("is_public"),
    created_at:      int("created_at"),
    updated_at:      int("updated_at"),
});

// ──────────────────────────────────────────────────────────
// ウォッチリスト（ユーザーが注目する戦略）
// ──────────────────────────────────────────────────────────
export const watchlistTable = sqliteTable("watchlist", {
    id:          text("id").primaryKey(),
    user_id:     text("user_id").notNull(),
    strategy_id: text("strategy_id").notNull(),
    created_at:  int("created_at").notNull(),
});

// ──────────────────────────────────────────────────────────
// XP レート設定（戦略ごとの付与レート）
// ──────────────────────────────────────────────────────────
export const xpRatesTable = sqliteTable("xp_rates", {
    strategy_id: text("strategy_id").primaryKey(),
    base_rate:   real("base_rate"),
    is_active:   int("is_active"),
});

// ──────────────────────────────────────────────────────────
// XP スナップショット（定期的な残高記録）
// ──────────────────────────────────────────────────────────
export const xpSnapshotsTable = sqliteTable("xp_snapshots", {
    id:           integer("id").primaryKey({ autoIncrement: true }),
    user_pubkey:  text("user_pubkey"),
    strategy_id:  text("strategy_id"),
    amount_usd:   real("amount_usd"),
    capped_usd:   real("capped_usd"),
    snapshot_at:  int("snapshot_at"),
    is_processed: int("is_processed"),
});

// ──────────────────────────────────────────────────────────
// XP 台帳（XP の増減履歴）
// ──────────────────────────────────────────────────────────
export const xpLedgerTable = sqliteTable("xp_ledger", {
    id:          integer("id").primaryKey({ autoIncrement: true }),
    user_pubkey: text("user_pubkey"),
    amount:      real("amount"),
    action_type: text("action_type"),
    description: text("description"),
    related_id:  text("related_id"),
    created_at:  int("created_at"),
});

// ──────────────────────────────────────────────────────────
// 戦略価格スナップショット（時系列インデックス価格・複合PK）
// ──────────────────────────────────────────────────────────
export const strategyPriceSnapshotsTable = sqliteTable("strategy_price_snapshots", {
    strategy_id:   text("strategy_id").notNull(),
    ts_bucket_utc: int("ts_bucket_utc").notNull(),
    index_price:   real("index_price"),
    prices_json:   text("prices_json"),
    weights_json:  text("weights_json"),
    source_json:   text("source_json"),
    confidence:    text("confidence"),
    version:       int("version"),
    metadata_json: text("metadata_json"),
    created_at:    int("created_at"),
}, (t) => [
    primaryKey({ columns: [t.strategy_id, t.ts_bucket_utc] }),
]);

// ──────────────────────────────────────────────────────────
// 戦略デプロイ基準値（パフォーマンス計算の原点）
// ──────────────────────────────────────────────────────────
export const strategyDeploymentBaselineTable = sqliteTable("strategy_deployment_baseline", {
    strategy_id:            text("strategy_id").primaryKey(),
    baseline_ts_bucket_utc: int("baseline_ts_bucket_utc"),
    baseline_price:         real("baseline_price"),
    baseline_confidence:    text("baseline_confidence"),
    created_at:             int("created_at"),
});

// ──────────────────────────────────────────────────────────
// 各時刻の主要通貨のUSD価格
// ──────────────────────────────────────────────────────────
export const strategyTokenPricesTable = sqliteTable("token_prices", {
    token_name:   text("token_name").notNull(),
    recorded_at:  customTimestamp( "recorded_at" ).notNull(),
    price_usd:    real("price_usd"),
}, (t) => [
    primaryKey({ columns: [t.token_name, t.recorded_at] }),
]);