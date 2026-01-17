export type Bindings = {
  axis_db: D1Database
  IMAGES: R2Bucket
  EMAIL: { send: (message: any) => Promise<void> } // Cloudflare Email Binding
  FAUCET_PRIVATE_KEY: string
  SOLANA_RPC_URL?: string  // Optional custom RPC URL (e.g., Helius, QuickNode)

  TWITTER_CLIENT_ID: string
  TWITTER_CLIENT_SECRET: string
  FRONTEND_URL: string
  ADMIN_EMAIL: string
  SENDER_EMAIL: string
  AI: any
  VECTOR_INDEX: VectorizeIndex

}
