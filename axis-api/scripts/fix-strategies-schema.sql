-- axis-db-core: strategies テーブルの不足カラムを追加
-- 実行: wrangler d1 execute axis-db-core --file=scripts/fix-strategies-schema.sql --remote
--
-- 背景: 旧 axis-db は手書きマイグレーションで作成されたため
--       schema.ts の以下 3 カラムが live DB に存在しない
--         - jito_bundle_id (TEXT)
--         - is_public      (INTEGER)
--         - updated_at     (INTEGER)

ALTER TABLE strategies ADD COLUMN jito_bundle_id TEXT;
ALTER TABLE strategies ADD COLUMN is_public INTEGER;
ALTER TABLE strategies ADD COLUMN updated_at INTEGER;
