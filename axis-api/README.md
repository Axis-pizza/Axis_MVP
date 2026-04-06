```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

// Drizzle ORMを用いたmigrationsによるDB管理の流れ
``` txt
// 1. migrationsファイルの作成
// schema.ts の変更を検知して新しいSQLファイルを生成する
pnpm drizzle-kit generate

// 2. ローカルのD1データベースへの適用(開発・テスト用)
// 作成したSQLをローカル環境のDBに反映させる
pnpm wrangler d1 migrations apply <db_name> --local

// 3. 本番のCloudflare D1へのDeploy(本番環境への適用)
// テストが終わったSQLを本番環境のDBに反映させる
pnpm wrangler d1 migrations apply <db_name> --remote
```