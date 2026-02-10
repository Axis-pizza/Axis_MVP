/**
 * Kagemusha Routes - Full Version
 * Includes: AI Analysis, Token Fetching, Strategy List (GET), and Hybrid Deploy (POST)
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { StrategyGenerator } from '../services/strategy';
import { PriceService } from '../services/price';
import { JitoBundleService } from '../services/blockchain';
import { 
    Keypair, Connection, Transaction, PublicKey, 
    ComputeBudgetProgram 
} from '@solana/web3.js';
import { 
    getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction 
} from '@solana/spl-token';
import bs58 from 'bs58';

const app = new Hono<{ Bindings: Bindings }>();
const priceService = new PriceService();

// ★★★ あなたのAxis ETF Token (在庫) ★★★
const MASTER_MINT_ADDRESS = new PublicKey("2JiisncKr8DhvA68MpszFDjGAVu2oFtqJJC837LLiKdT");

// 優先手数料
const PRIORITY_FEE = 500000;

// Helper to create Jito service
const createJitoService = (env: Bindings) => {
  return new JitoBundleService('devnet', 'tokyo', env.SOLANA_RPC_URL);
};

// -----------------------------------------------------------
// 🧠 AI Analysis & Token Data (復活)
// -----------------------------------------------------------

app.post('/analyze', async (c) => {
  try {
    const { directive, tags, customInput } = await c.req.json();
    if (!directive) return c.json({ success: false, error: 'Directive required' }, 400);

    const generator = new StrategyGenerator(c.env);
    const strategies = await generator.generateStrategies(directive, tags || [], customInput);
    
    return c.json({ success: true, strategies });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

let tokenCache: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; 

app.get('/tokens', async (c) => {
  try {
    const now = Date.now();
    if (tokenCache.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
      return c.json({ success: true, tokens: tokenCache, source: 'cache' });
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=50&page=1&sparkline=false',
      { headers: { 'User-Agent': 'Axis-App/1.0' } }
    );

    if (!response.ok) throw new Error('CoinGecko API Error');
    const data: any[] = await response.json();

    const formattedTokens = data.map((t: any) => ({
      symbol: t.symbol.toUpperCase(),
      name: t.name,
      address: t.id,
      price: t.current_price,
      change24h: t.price_change_percentage_24h,
      logoURI: t.image,
      marketCap: t.market_cap
    }));

    tokenCache = formattedTokens;
    lastFetchTime = now;

    return c.json({ success: true, tokens: formattedTokens, source: 'api' });
  } catch (error: any) {
    if (tokenCache.length > 0) return c.json({ success: true, tokens: tokenCache, source: 'stale' });
    return c.json({ success: true, tokens: [] });
  }
});

app.get('/tokens/search', async (c) => {
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  const tokens = await priceService.searchTokens(query, limit);
  return c.json({ success: true, tokens });
});

app.get('/tokens/:address/history', async (c) => {
  try {
    const address = c.req.param('address');
    const interval = (c.req.query('interval') as '1h' | '1d' | '1w') || '1d';
    const history = await priceService.getPriceHistory(address, interval);
    if (!history) return c.json({ success: false, error: 'History not available' }, 404);
    return c.json({ success: true, history });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------
// 🚀 Strategy Management (Read) - (復活)
// -----------------------------------------------------------

/**
 * GET /strategies/:pubkey - Get user's strategies
 */
app.get('/strategies/:pubkey', async (c) => {
  try {
    const pubkey = c.req.param('pubkey');
    const { results } = await c.env.axis_db.prepare(
      `SELECT * FROM strategies WHERE owner_pubkey = ? ORDER BY created_at DESC`
    ).bind(pubkey).all();
    
    const strategies = results.map((s: any) => ({
      id: s.id,
      ownerPubkey: s.owner_pubkey,
      name: s.name,
      ticker: s.ticker,
      type: s.type,
      tokens: s.composition ? JSON.parse(s.composition) : (s.config ? JSON.parse(s.config) : []),
      config: s.config ? JSON.parse(s.config) : {},
      description: s.description || '',
      tvl: s.tvl || s.total_deposited || 0,
      totalDeposited: s.total_deposited || 0,
      status: s.status,
      mintAddress: s.mint_address,
      vaultAddress: s.vault_address,
      createdAt: s.created_at,
    }));
    
    return c.json({ success: true, strategies });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * GET /discover - Public strategies
 */
app.get('/discover', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const { results } = await c.env.axis_db.prepare(
      `SELECT * FROM strategies 
       WHERE status = 'active' 
       ORDER BY tvl DESC, total_deposited DESC, created_at DESC 
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
    
    const strategies = results.map((s: any) => ({
      id: s.id,
      ownerPubkey: s.owner_pubkey,
      name: s.name,
      ticker: s.ticker,
      tokens: s.composition ? JSON.parse(s.composition) : (s.config ? JSON.parse(s.config) : []),
      config: s.config ? JSON.parse(s.config) : {},
      tvl: s.tvl || s.total_deposited || 0,
      mintAddress: s.mint_address,
      vaultAddress: s.vault_address,
      createdAt: s.created_at,
    }));
    
    return c.json({ success: true, strategies });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// -----------------------------------------------------------
// 🚀 Strategy Deployment (Hybrid CEX Model)
// -----------------------------------------------------------

app.post('/deploy', async (c) => {
  try {
    const body = await c.req.json();
    
    // フロントエンドから送られてきた情報
    const { signature } = body; 
    const { ownerPubkey, name, ticker, description, type, tokens, config, tvl } = body.metadata || body;
    const depositAmountSOL = tvl || 0;
    const now = Math.floor(Date.now() / 1000);
    const id = body.strategyId || crypto.randomUUID();

    // 1. 環境設定
    if (!c.env.SERVER_PRIVATE_KEY) throw new Error("Missing SERVER_PRIVATE_KEY");
    // Helius RPC
    const rpcUrl = c.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const adminWallet = Keypair.fromSecretKey(bs58.decode(c.env.SERVER_PRIVATE_KEY));
    const adminPubkeyStr = adminWallet.publicKey.toString();

    let transferTxId = "";

    // 2. トークン配給ロジック (Admin在庫 -> User)
    if (depositAmountSOL > 0 && ownerPubkey) {
        console.log(`🚀 Distributing AXIS tokens to ${ownerPubkey}...`);
        
        try {
            const userPubkey = new PublicKey(ownerPubkey);
            const RATE = 1000;
            const amount = BigInt(Math.floor(depositAmountSOL * RATE * 1_000_000_000)); // 9 decimals

            const adminATA = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, adminWallet.publicKey);
            const userATA = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, userPubkey);

            const tx = new Transaction();
            tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE }));

            const info = await connection.getAccountInfo(userATA);
            if (!info) {
                tx.add(createAssociatedTokenAccountInstruction(
                    adminWallet.publicKey, userATA, userPubkey, MASTER_MINT_ADDRESS
                ));
            }

            tx.add(createTransferInstruction(
                adminATA, userATA, adminWallet.publicKey, amount
            ));

            const latest = await connection.getLatestBlockhash('confirmed');
            tx.recentBlockhash = latest.blockhash;
            tx.feePayer = adminWallet.publicKey;
            tx.sign(adminWallet);

            // シミュレーションをスキップして即座に投げる
            transferTxId = await connection.sendRawTransaction(tx.serialize(), { 
                skipPreflight: true,
                maxRetries: 5
            });
            
            console.log(`✅ Tokens Sent! TX: ${transferTxId}`);

        } catch (e: any) {
            console.error("⚠️ Token Transfer Failed (Non-critical for DB):", e);
        }
    }

    // 3. DB保存
    await c.env.axis_db.prepare(`
        INSERT INTO strategies (
          id, owner_pubkey, name, ticker, description, type, 
          composition, config, status, created_at, 
          tvl, total_deposited, roi, 
          mint_address, vault_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, ?, ?)
    `).bind(
        id, ownerPubkey, name, ticker, description || '', type || 'MANUAL',
        JSON.stringify(tokens), JSON.stringify(config || {}),
        now, depositAmountSOL, depositAmountSOL,
        MASTER_MINT_ADDRESS.toString(), // ★共通トークン
        adminPubkeyStr
    ).run();

    // XP付与
    await addXP(c.env.axis_db, ownerPubkey, 500, 'STRATEGY_DEPLOY', 'Deployed Strategy');

    return c.json({ 
        success: true, 
        strategyId: id, 
        mintAddress: MASTER_MINT_ADDRESS.toString(),
        transferTxId,
        message: `Strategy Deployed! Sent ${depositAmountSOL * 1000} AXIS tokens.` 
    });

  } catch (error: any) {
    console.error('[Deploy] Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------
// 💰 Swap / Invest (USDC -> AXIS)
// -----------------------------------------------------------
app.post('/trade', async (c) => {
  try {
      const body = await c.req.json();
      const { userPubkey, amount, mode, signature, strategyId } = body;
      // mode: 'BUY' (User sends SOL, gets AXIS) or 'SELL' (User sends AXIS, gets SOL)

      console.log(`💰 Trade Request: [${mode}] ${amount} from ${userPubkey}`);

      // 1. 環境設定
      const rpcUrl = c.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');
      const adminWallet = Keypair.fromSecretKey(bs58.decode(c.env.SERVER_PRIVATE_KEY));
      
      const MASTER_MINT_ADDRESS = new PublicKey("2JiisncKr8DhvA68MpszFDjGAVu2oFtqJJC837LLiKdT");
      const PRIORITY_FEE = 500000;

      let txSig = "";

      if (mode === 'BUY') {
          // --- BUY: User wants AXIS (Admin sends AXIS) ---
          const userPubkeyObj = new PublicKey(userPubkey);
          // Rate 1:1 -> 1 SOL = 1 AXIS
          const tokenAmount = BigInt(Math.floor(amount * 1_000_000_000)); // 9 decimals

          const adminATA = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, adminWallet.publicKey);
          const userATA = await getAssociatedTokenAddress(MASTER_MINT_ADDRESS, userPubkeyObj);

          const tx = new Transaction();
          tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE }));

          // ユーザーの受取口座がなければ作る(運営負担)
          const info = await connection.getAccountInfo(userATA);
          if (!info) {
              tx.add(createAssociatedTokenAccountInstruction(
                  adminWallet.publicKey, userATA, userPubkeyObj, MASTER_MINT_ADDRESS
              ));
          }

          // AXIS送付
          tx.add(createTransferInstruction(adminATA, userATA, adminWallet.publicKey, tokenAmount));

          const latest = await connection.getLatestBlockhash('confirmed');
          tx.recentBlockhash = latest.blockhash;
          tx.feePayer = adminWallet.publicKey;
          tx.sign(adminWallet);

          txSig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
          console.log(`✅ Sent AXIS to User: ${txSig}`);

      } else {
          // --- SELL: User wants SOL (Admin sends SOL) ---
          const userPubkeyObj = new PublicKey(userPubkey);
          const solAmount = Math.floor(amount * 1_000_000_000); // Lamports

          const tx = new Transaction();
          tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE }));
          
          // SOL送付 (SystemProgram)
          tx.add(
              SystemProgram.transfer({
                  fromPubkey: adminWallet.publicKey,
                  toPubkey: userPubkeyObj,
                  lamports: solAmount
              })
          );

          const latest = await connection.getLatestBlockhash('confirmed');
          tx.recentBlockhash = latest.blockhash;
          tx.feePayer = adminWallet.publicKey;
          tx.sign(adminWallet);

          txSig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
          console.log(`✅ Sent SOL to User: ${txSig}`);
      }

      // DB更新 (TVL等)
      if (strategyId) {
           // 簡易的なTVL更新 (BUYなら増える、SELLなら減る)
           const change = mode === 'BUY' ? amount : -amount;
           await c.env.axis_db.prepare(
              "UPDATE strategies SET tvl = tvl + ? WHERE id = ?"
          ).bind(change, strategyId).run();
      }

      return c.json({ success: true, tx: txSig, message: `Trade Complete: ${mode} ${amount}` });

  } catch (e: any) {
      console.error("Trade Error:", e);
      return c.json({ success: false, error: e.message }, 500);
  }
});
// -----------------------------------------------------------
// 📊 Charts & Helpers (復活)
// -----------------------------------------------------------

app.get('/strategies/:id/chart', async (c) => {
  const type = c.req.query('type') === 'candle' ? 'candle' : 'line';
  
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  let val = 100;
  
  for(let i=0; i<30; i++) {
    val = val * (1 + (Math.random() * 0.1 - 0.04));
    data.push(type === 'line' 
      ? { time: now - (29-i)*86400, value: val }
      : { time: now - (29-i)*86400, open: val, high: val*1.02, low: val*0.98, close: val*1.01 }
    );
  }
  return c.json({ success: true, data, type });
});

app.get('/prepare-deployment', async (c) => {
  const jitoService = createJitoService(c.env);
  const tipAccount = await jitoService.getRandomTipAccount();
  return c.json({ success: true, tipAccount });
});

// Helper function for XP
async function addXP(db: D1Database, pubkey: string, amount: number, actionType: string, description: string) {
  try {
    await db.prepare(
      `INSERT INTO xp_ledger (user_pubkey, amount, action_type, description) VALUES (?, ?, ?, ?)`
    ).bind(pubkey, amount, actionType, description).run();
    await db.prepare(
      `UPDATE users SET total_xp = total_xp + ? WHERE pubkey = ?`
    ).bind(amount, pubkey).run();
  } catch(e) { /* ignore */ }
}

export default app;