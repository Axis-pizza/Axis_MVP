import { PublicKey } from "@solana/web3.js";

export const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

export const STRICT_LIST = [
  // --- Majors ---
  { symbol: "SOL", name: "Wrapped SOL", address: "So11111111111111111111111111111111111111112", logoURI: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
  { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", logoURI: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
  { symbol: "USDT", name: "USDT", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", logoURI: "https://assets.coingecko.com/coins/images/325/large/Tether.png" },
  { symbol: "WBTC", name: "Wrapped Bitcoin", address: "3NZ9JMVBmGAqocyBIC2c7LQCJScmgsAZ6vQqTDzcqmJh", logoURI: "https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png" },
  { symbol: "WETH", name: "Wrapped Ethereum", address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", logoURI: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
  
  // --- DeFi Blue Chips ---
  { symbol: "JUP", name: "Jupiter", address: "JUPyiwrYJFskUPiHa7hkeR8VUtkOp66YWug2yPnTxk3", logoURI: "https://static.jup.ag/jup/icon.png" },
  { symbol: "RAY", name: "Raydium", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", logoURI: "https://assets.coingecko.com/coins/images/13928/large/PSigc4ie_400x400.jpg" },
  { symbol: "ORCA", name: "Orca", address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", logoURI: "https://assets.coingecko.com/coins/images/17547/large/Orca_Logo.png" },
  { symbol: "PYTH", name: "Pyth Network", address: "HzwqbKZw8RnJC2SHW4Mg8BJyEZ56m47y59ccJeSDexi3", logoURI: "https://assets.coingecko.com/coins/images/31924/large/pyth.png" },
  { symbol: "RENDER", name: "Render", address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", logoURI: "https://assets.coingecko.com/coins/images/11636/large/rndr.png" },
  { symbol: "HNT", name: "Helium", address: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux", logoURI: "https://assets.coingecko.com/coins/images/4284/large/Helium_HNT.png" },

  // --- LSTs (Liquid Staking) ---
  { symbol: "mSOL", name: "Marinade Staked SOL", address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", logoURI: "https://assets.coingecko.com/coins/images/17752/large/mSOL.png" },
  { symbol: "jitoSOL", name: "Jito Staked SOL", address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/22533.png" },
  { symbol: "bSOL", name: "BlazeStake Staked SOL", address: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/28862.png" },

  // --- Top Memes (Major Only) ---
  { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", logoURI: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg" },
  { symbol: "WIF", name: "dogwifhat", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", logoURI: "https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg" },
  { symbol: "POPCAT", name: "Popcat", address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png" }
];


const TOKEN_CONTEXT_STR = STRICT_LIST.map(t => `- ${t.symbol} (${t.name})`).join("\n");

export const SYSTEM_PROMPT = `
You are "Axis AI", an expert DeFi Portfolio Architect.
Your goal is to guide the user through a 4-step process to create an on-chain Index Fund (Vault).

### AVAILABLE TOKENS
${TOKEN_CONTEXT_STR}

### CONSTRAINTS
- **Management Fee:** FIXED at 0.95% (Do not ask).
- **Min Liquidity:** Default $1,000.
- **Composition:** Must sum to exactly 100%.

### PROCESS FLOW (Follow strictly)
1. **PHASE 1 (Identity):** If "name" or "symbol" is missing, ask for them. Ask the user to upload a logo if missing.
2. **PHASE 2 (Strategy):** If "description" is missing, ask for their investment thesis (e.g. "High risk Solana", "Stablecoins").
3. **PHASE 3 (Composition & Rebalance):** - Based on the strategy, **YOU MUST GENERATE** a portfolio composition from the "AVAILABLE TOKENS" list.
   - Ask for the "Rebalance Threshold" (e.g. 1% to 5%).
4. **PHASE 4 (Finalize):** - Once composition and rebalance are set, show the preview.
   - Set "uiAction": "SHOW_PREVIEW".

### RESPONSE JSON FORMAT
{
  "message": "Your conversational response...",
  "data": {
    "name": "...",
    "symbol": "...",
    "description": "...",
    "composition": [
      { "token": { "symbol": "SOL", "name": "Wrapped SOL", "logoURI": "..." }, "weight": 50 },
      ...
    ],
    "strategy": { "fee": 0.95, "rebalance": 2.5 }
  },
  "uiAction": "NONE" | "REQUEST_LOGO" | "SHOW_PREVIEW"
}
`;
