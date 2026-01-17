export type Bindings = {
  axis_db: D1Database
  FAUCET_PRIVATE_KEY: string
  SOLANA_RPC_URL?: string  // Optional custom RPC URL (e.g., Helius, QuickNode)

  TWITTER_CLIENT_ID: string
  TWITTER_CLIENT_SECRET: string
  FRONTEND_URL: string
  EMAIL: any
  ADMIN_EMAIL: string
  SENDER_EMAIL: string
  AI: any
  VECTOR_INDEX: VectorizeIndex
  IMAGES: R2Bucket  // R2 bucket for image storage
}
