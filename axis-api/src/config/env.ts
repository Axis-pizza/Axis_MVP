import { D1Database, R2Bucket, VectorizeIndex } from '@cloudflare/workers-types';

export type Bindings = {
  // Main Database
  axis_db: D1Database
  
  // ★追加: VIPリスト管理用 Database
  whitelist_db: D1Database

  // Storage
  IMAGES: R2Bucket
  
  // Email
  EMAIL: { send: (message: any) => Promise<void> } // Cloudflare Email Binding
  
  // Environment Variables
  FAUCET_PRIVATE_KEY: string
  SOLANA_RPC_URL?: string
  
  TWITTER_CLIENT_ID: string
  TWITTER_CLIENT_SECRET: string
  FRONTEND_URL: string
  ADMIN_EMAIL: string
  SENDER_EMAIL: string
  
  // AI & Vector
  AI: any
  VECTOR_INDEX: VectorizeIndex

  SERVER_PRIVATE_KEY: string // Base58形式の秘密鍵文字列
  HELIUS_RPC_URL: string     // トランザクション配信用
  WEBHOOK_AUTH_SECRET?: string // (任意) Webhookのセキュリティ用
}