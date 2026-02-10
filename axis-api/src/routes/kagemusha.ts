/**
 * Kagemusha Routes - Strategy & Vault API
 * Consolidated and Refactored
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { StrategyGenerator } from '../services/strategy';
import { PriceService } from '../services/price';
import { JitoBundleService } from '../services/blockchain';
import { 
    Keypair, Connection, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey 
} from '@solana/web3.js';
import { 
    createInitializeMintInstruction, MINT_SIZE, TOKEN_PROGRAM_ID, 
    getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction, createMintToInstruction, 
    createTransferInstruction 
} from '@solana/spl-token';
import bs58 from 'bs58';

// ▼▼▼ Metaplex Token Metadata v2 (raw instruction API) ▼▼▼
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';

const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
// ▲▲▲ Metaplex ▲▲▲

const app = new Hono<{ Bindings: Bindings }>();
const priceService = new PriceService();

// Helper to create Jito service
const createJitoService = (env: Bindings) => {
  return new JitoBundleService('devnet', 'tokyo', env.SOLANA_RPC_URL);
};

// ... (analyze, tokens などのエンドポイントは変更なし) ...

// -----------------------------------------------------------
// 🧠 AI Analysis & Token Data
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
// 🚀 Strategy Management
// -----------------------------------------------------------

/**
 * POST /strategies - Manual Creation (Draft / DB Only)
 */
app.post('/strategies', async (c) => {
  try {
    const body = await c.req.json();
    const { owner_pubkey, name, ticker, description, type, tokens, config } = body;

    if (!owner_pubkey || !name || !tokens) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    const recentCheck = await c.env.axis_db.prepare(`
      SELECT id FROM strategies 
      WHERE owner_pubkey = ? AND name = ? AND created_at > ?
    `).bind(owner_pubkey, name, now - 60).first();
    
    if (recentCheck) {
      console.log('[Strategies] Duplicate detected, returning existing');
      return c.json({ success: true, strategy_id: recentCheck.id, duplicate: true });
    }

    const id = crypto.randomUUID();

    const result = await c.env.axis_db.prepare(`
      INSERT INTO strategies (
        id, owner_pubkey, name, ticker, description, type, 
        composition, config, status, created_at, tvl, roi, total_deposited
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, 0, 0)
    `).bind(
      id,
      owner_pubkey,
      name,
      ticker || '',
      description || '',
      type || 'MANUAL',
      JSON.stringify(tokens),
      JSON.stringify(config || {}),
      now
    ).run();

    if (!result.success) throw new Error('DB Insert Failed');

    await addXP(c.env.axis_db, owner_pubkey, 100, 'STRATEGY_DRAFT', 'Drafted new strategy');

    return c.json({ success: true, strategy_id: id });
  } catch (e: any) {
    console.error('Create Strategy Error:', e);
    return c.json({ success: false, error: e.message }, 500);
  }
});

/**
 * POST /deploy - Deploy via Jito (On-chain Transaction)
 * Strategy作成 + Token発行 (10億枚) + 初期配分 + Metadata登録
 */
app.post('/deploy', async (c) => {
  try {
    const body = await c.req.json();
    
    const signedTransaction = body.signedTransaction || body.signature; 
    if (signedTransaction) {
        const jitoService = createJitoService(c.env);
        try {
            await jitoService.sendBundle([signedTransaction]);
        } catch (e) {
            console.warn("Jito bundle skipped/failed:", e);
        }
    }

    const { 
      ownerPubkey, 
      name, 
      ticker, 
      description, 
      type, 
      tokens, 
      config, 
      tvl 
    } = body.metadata || body;

    const depositAmountSOL = tvl || 0;
    const now = Math.floor(Date.now() / 1000);
    const id = body.strategyId || crypto.randomUUID();

    let mintAddress = null;
    let serverPubkeyStr = 'server_wallet';
    const txSignatures: Record<string, string> = {};

    // -------------------------------------------------------
    // 1. Token作成 & 10億枚発行 (Server Walletへ)
    // -------------------------------------------------------
    if (c.env.SERVER_PRIVATE_KEY) {
        try {
            const connection = new Connection(c.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
            const serverWallet = Keypair.fromSecretKey(bs58.decode(c.env.SERVER_PRIVATE_KEY));
            serverPubkeyStr = serverWallet.publicKey.toString();

            // A. Mintアカウント作成
            const mintKeypair = Keypair.generate();
            mintAddress = mintKeypair.publicKey.toString();
            
            console.log(`[Deploy] Creating Token: ${name} ($${ticker}) - Mint: ${mintAddress}`);

            const lamports = await getMinimumBalanceForRentExemptMint(connection);
            const decimals = 9; 

            // トランザクション1: Mint作成
            const createMintTx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: serverWallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    decimals,
                    serverWallet.publicKey, 
                    null, 
                    TOKEN_PROGRAM_ID
                )
            );
            
            const createMintSig = await sendAndConfirmTransaction(connection, createMintTx, [serverWallet, mintKeypair]);
            txSignatures.createMint = createMintSig;
            console.log(`[Deploy] Mint created: ${mintAddress} (sig: ${createMintSig})`);

            // B. サーバー用ATA作成 & 10億枚Mint
            const serverATA = await getAssociatedTokenAddress(mintKeypair.publicKey, serverWallet.publicKey);
            const initialSupply = 1_000_000_000n * BigInt(10 ** decimals); // 10億枚

            const mintToAdminTx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    serverWallet.publicKey,
                    serverATA,
                    serverWallet.publicKey,
                    mintKeypair.publicKey
                ),
                createMintToInstruction(
                    mintKeypair.publicKey,
                    serverATA,
                    serverWallet.publicKey,
                    initialSupply
                )
            );

            const mintToSig = await sendAndConfirmTransaction(connection, mintToAdminTx, [serverWallet]);
            txSignatures.mintToAdmin = mintToSig;
            console.log(`[Deploy] Minted 1,000,000,000 ${ticker} to Admin (sig: ${mintToSig})`);

            // -------------------------------------------------------
            // 2. 初期流動性提供者(Creator)への配分
            // -------------------------------------------------------
            if (depositAmountSOL > 0 && ownerPubkey) {
                // レート計算 (MVP: 1 SOL = 100 Token)
                const RATE = 100; 
                const creatorShare = BigInt(Math.floor(depositAmountSOL * RATE * (10 ** decimals)));

                if (creatorShare > 0n) {
                    const creatorPubkey = new PublicKey(ownerPubkey);
                    const creatorATA = await getAssociatedTokenAddress(mintKeypair.publicKey, creatorPubkey);

                    const transferTx = new Transaction();

                    // CreatorのATAがなければ作る
                    const accountInfo = await connection.getAccountInfo(creatorATA);
                    if (!accountInfo) {
                        transferTx.add(
                            createAssociatedTokenAccountInstruction(
                                serverWallet.publicKey, // Rentはサーバー持ち
                                creatorATA,
                                creatorPubkey,
                                mintKeypair.publicKey
                            )
                        );
                    }

                    // AdminからCreatorへ転送
                    transferTx.add(
                        createTransferInstruction(
                            serverATA,
                            creatorATA,
                            serverWallet.publicKey,
                            creatorShare
                        )
                    );

                    const transferSig = await sendAndConfirmTransaction(connection, transferTx, [serverWallet]);
                    txSignatures.creatorTransfer = transferSig;
                    console.log(`[Deploy] Transferred ${depositAmountSOL * RATE} ${ticker} to Creator (sig: ${transferSig})`);
                }
            }

            // ▼▼▼ 4. メタデータ登録 (Metaplex v2 raw instruction) ▼▼▼
            try {
                console.log(`[Deploy] Registering Metadata for ${ticker}...`);

                const API_BASE = 'https://axis-api.yusukekikuta-05.workers.dev';
                const metadataUri = `${API_BASE}/metadata/${ticker}?name=${encodeURIComponent(name)}`;

                const [metadataPDA] = PublicKey.findProgramAddressSync(
                    [
                        new TextEncoder().encode('metadata'),
                        METADATA_PROGRAM_ID.toBuffer(),
                        mintKeypair.publicKey.toBuffer(),
                    ],
                    METADATA_PROGRAM_ID
                );

                const metadataIx = createCreateMetadataAccountV3Instruction(
                    {
                        metadata: metadataPDA,
                        mint: mintKeypair.publicKey,
                        mintAuthority: serverWallet.publicKey,
                        payer: serverWallet.publicKey,
                        updateAuthority: serverWallet.publicKey,
                    },
                    {
                        createMetadataAccountArgsV3: {
                            data: {
                                name: name,
                                symbol: ticker,
                                uri: metadataUri,
                                sellerFeeBasisPoints: 0,
                                creators: null,
                                collection: null,
                                uses: null,
                            },
                            isMutable: true,
                            collectionDetails: null,
                        },
                    }
                );

                const metaTx = new Transaction().add(metadataIx);
                const metaSig = await sendAndConfirmTransaction(connection, metaTx, [serverWallet]);
                console.log(`[Deploy] Metadata Registered: ${metadataUri} (sig: ${metaSig})`);
            } catch (metaError) {
                console.error("[Deploy] Metadata registration failed:", metaError);
                // メタデータ失敗でもトークン機能自体は継続
            }
            // ▲▲▲ メタデータ登録終了 ▲▲▲

        } catch (e) {
            console.error("[Deploy] Token creation failed:", e);
        }
    }

    // -------------------------------------------------------
    // 3. DBへの保存
    // -------------------------------------------------------
    if (!mintAddress) {
        return c.json({ success: false, error: 'Token creation failed — mintAddress is null', txSignatures }, 500);
    }

    await c.env.axis_db.prepare(`
        INSERT INTO strategies (
          id, owner_pubkey, name, ticker, description, type, 
          composition, config, status, created_at, 
          tvl, total_deposited, roi, 
          mint_address, vault_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0, ?, ?)
    `).bind(
        id,
        ownerPubkey,
        name,
        ticker, 
        description || '',
        type || 'MANUAL',
        JSON.stringify(tokens),
        JSON.stringify(config || {}),
        now,
        depositAmountSOL,
        depositAmountSOL,
        mintAddress, // ★Mintアドレス保存
        serverPubkeyStr // 入金先(Vault)
    ).run();

    await addXP(c.env.axis_db, ownerPubkey, 500, 'STRATEGY_DEPLOY', 'Deployed on-chain strategy');

    return c.json({
        success: true,
        strategyId: id,
        mintAddress,
        ticker,
        txSignatures,
        message: `Deployed ${name} ($${ticker})`
    });

  } catch (error: any) {
    console.error('[Deploy] Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

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

// ... (Charts, XP helper等は変更なし) ...

// -----------------------------------------------------------
// 📊 Charts & Helpers
// -----------------------------------------------------------

app.get('/strategies/:id/chart', async (c) => {
  const type = c.req.query('type') === 'candle' ? 'candle' : 'line';
  const period = c.req.query('period') || '7d';
  
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

// ---------------------------------------------------------
// 🧠 XP Helper
// ---------------------------------------------------------
async function addXP(
  db: D1Database, 
  pubkey: string, 
  amount: number, 
  actionType: string, 
  description: string
) {
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