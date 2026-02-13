import { PublicKey } from "@solana/web3.js";

// ★重要: バックエンドの SERVER_PRIVATE_KEY に対応する公開鍵を設定してください
// Phantomからコピーしたアドレスを貼り付けてください
export const SERVER_WALLET_PUBKEY = new PublicKey("BTcWoRe6Z9VaCPCxrcr5dQmn8cA8KNHpFdgJEVopSBsj");

export const MINT_DECIMALS = 9;

// Devnet USDC
export const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
export const USDC_DECIMALS = 6;