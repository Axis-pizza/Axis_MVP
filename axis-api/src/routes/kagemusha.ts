/**
 * Kagemusha Routes - Strategy & Vault API
 * Ultimate Fix: Fresh Blockhash per Step & High Priority
 */

import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { JitoBundleService } from '../services/blockchain';
import { 
    Keypair, Connection, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey, 
    ComputeBudgetProgram, TransactionInstruction
} from '@solana/web3.js';
import { 
    createInitializeMintInstruction, MINT_SIZE, TOKEN_PROGRAM_ID, 
    getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction, createMintToInstruction, 
    createTransferInstruction
} from '@solana/spl-token';
import bs58 from 'bs58';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

const app = new Hono<{ Bindings: Bindings }>();

// 優先手数料 (Devnet混雑対策: 0.0001 SOL)
const PRIORITY_FEE = 100000; 

// --- 🛠 Helper: 強力なトランザクション送信関数 ---
// 確認待ち中に2秒おきに再送信し続ける（Solana推奨パターン）
const MAX_RETRIES = 3;
const RESEND_INTERVAL_MS = 2000;

async function sendSmartTransaction(
    connection: Connection,
    instructions: TransactionInstruction[],
    signers: Keypair[],
    label: string
): Promise<string> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`⏳ [${label}] Attempt ${attempt}/${MAX_RETRIES} - Fetching fresh blockhash...`);

            const latest = await connection.getLatestBlockhash('confirmed');

            const tx = new Transaction();
            tx.recentBlockhash = latest.blockhash;
            tx.lastValidBlockHeight = latest.lastValidBlockHeight;
            tx.feePayer = signers[0].publicKey;

            const priorityIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: PRIORITY_FEE
            });
            tx.add(priorityIx, ...instructions);
            tx.sign(...signers);

            const rawTx = tx.serialize();

            // 初回送信
            console.log(`🚀 [${label}] Sending...`);
            const signature = await connection.sendRawTransaction(rawTx, {
                skipPreflight: true,
                maxRetries: 0 // 自前でリトライするのでSDK側は無効化
            });
            console.log(`📡 [${label}] Signature: ${signature}`);

            // 確認待ち + 並行して再送信し続ける
            const confirmed = await confirmWithResend(
                connection, rawTx, signature, latest, label
            );

            if (confirmed.value.err) {
                throw new Error(`TX Failed: ${JSON.stringify(confirmed.value.err)}`);
            }

            console.log(`✅ [${label}] Success on attempt ${attempt}!`);
            return signature;

        } catch (e: any) {
            const isBlockheightError = e.message?.includes('block height exceeded')
                || e.name === 'TransactionExpiredBlockheightExceededError';

            if (isBlockheightError && attempt < MAX_RETRIES) {
                console.warn(`⚠️ [${label}] Expired on attempt ${attempt}, retrying...`);
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            console.error(`❌ [${label}] Error on attempt ${attempt}: ${e.message}`);
            throw e;
        }
    }
    throw new Error(`[${label}] All ${MAX_RETRIES} attempts failed`);
}

// 確認を待ちながら、2秒おきにトランザクションを再ブロードキャストする
async function confirmWithResend(
    connection: Connection,
    rawTx: Buffer,
    signature: string,
    blockhashInfo: { blockhash: string; lastValidBlockHeight: number },
    label: string
) {
    // 再送信タイマー: 確認されるまで2秒おきに同じTXを投げ続ける
    const resendTimer = setInterval(async () => {
        try {
            await connection.sendRawTransaction(rawTx, {
                skipPreflight: true,
                maxRetries: 0
            });
            console.log(`🔄 [${label}] Resent TX`);
        } catch (_) { /* 再送失敗は無視 */ }
    }, RESEND_INTERVAL_MS);

    try {
        const result = await connection.confirmTransaction({
            signature,
            blockhash: blockhashInfo.blockhash,
            lastValidBlockHeight: blockhashInfo.lastValidBlockHeight
        }, 'confirmed');
        return result;
    } finally {
        clearInterval(resendTimer);
    }
}


app.post('/deploy', async (c) => {
  try {
    const body = await c.req.json();
    const { ownerPubkey, name, ticker, description, type, tokens, config, tvl } = body.metadata || body;
    const depositAmountSOL = tvl || 0;
    const now = Math.floor(Date.now() / 1000);
    const id = body.strategyId || crypto.randomUUID();

    // 1. 環境変数の確認
    if (!c.env.SERVER_PRIVATE_KEY) throw new Error("Critical: SERVER_PRIVATE_KEY is missing.");
    const rpcUrl = c.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com';
    
    // ★デバッグ: どのRPCを使っているか確認 (キーの一部を隠して表示)
    console.log(`🔌 Connecting to RPC: ${rpcUrl.includes('helius') ? 'HELIUS (Paid)' : 'Public (Slow)'}`);

    const connection = new Connection(rpcUrl, 'confirmed');
    const serverWallet = Keypair.fromSecretKey(bs58.decode(c.env.SERVER_PRIVATE_KEY));
    const serverPubkeyStr = serverWallet.publicKey.toString();

    let mintAddress: string | null = null;

    try {
        console.log(`🚀 [Deploy] Starting Sequence for ${ticker}...`);

        // -------------------------------------------------------
        // Step A: Mintアカウント作成 (独立トランザクション)
        // -------------------------------------------------------
        const mintKeypair = Keypair.generate();
        mintAddress = mintKeypair.publicKey.toString();
        const decimals = 9; 
        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        await sendSmartTransaction(
            connection,
            [
                SystemProgram.createAccount({
                    fromPubkey: serverWallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(mintKeypair.publicKey, decimals, serverWallet.publicKey, null)
            ],
            [serverWallet, mintKeypair], // Signers
            "Step A: Create Mint"
        );

        // -------------------------------------------------------
        // Step B: Adminへ 10億枚発行 (独立トランザクション)
        // -------------------------------------------------------
        // ※ Step Aが終わった後、改めてBlockhashを取り直すので期限切れしない
        const serverATA = await getAssociatedTokenAddress(mintKeypair.publicKey, serverWallet.publicKey);
        const initialSupply = 1_000_000_000n * BigInt(10 ** decimals); 

        await sendSmartTransaction(
            connection,
            [
                createAssociatedTokenAccountInstruction(serverWallet.publicKey, serverATA, serverWallet.publicKey, mintKeypair.publicKey),
                createMintToInstruction(mintKeypair.publicKey, serverATA, serverWallet.publicKey, initialSupply)
            ],
            [serverWallet],
            "Step B: Mint to Admin"
        );

        // -------------------------------------------------------
        // Step C: Creatorへ初期配分 (独立トランザクション)
        // -------------------------------------------------------
        if (ownerPubkey) {
            const creatorPubkey = new PublicKey(ownerPubkey);
            const creatorATA = await getAssociatedTokenAddress(mintKeypair.publicKey, creatorPubkey);
            
            const RATE = 1000; 
            const baseAmount = depositAmountSOL > 0 ? depositAmountSOL : 1;
            const creatorShare = BigInt(Math.floor(baseAmount * RATE * (10 ** decimals)));

            // ユーザーのATAがあるかチェック
            const ixs: TransactionInstruction[] = [];
            const accountInfo = await connection.getAccountInfo(creatorATA);
            if (!accountInfo) {
                ixs.push(createAssociatedTokenAccountInstruction(serverWallet.publicKey, creatorATA, creatorPubkey, mintKeypair.publicKey));
            }
            ixs.push(createTransferInstruction(serverATA, creatorATA, serverWallet.publicKey, creatorShare));

            await sendSmartTransaction(
                connection,
                ixs,
                [serverWallet],
                "Step C: Transfer to Creator"
            );
        }

        // -------------------------------------------------------
        // Step D: メタデータ登録 (Metaplex)
        // -------------------------------------------------------
        // MetaplexはUmiを使うため、ここだけはライブラリに任せるが、リトライ設定を入れる
        try {
            console.log(`[Deploy] Registering Metadata...`);
            const umi = createUmi(rpcUrl); // 同じRPCを使う
            const adminKeypair = fromWeb3JsKeypair(serverWallet);
            const adminSigner = createSignerFromKeypair(umi, adminKeypair);
            umi.use(signerIdentity(adminSigner));

            const API_BASE = 'https://axis-api.yusukekikuta-05.workers.dev'; 
            const metadataUri = `${API_BASE}/metadata/${ticker}?name=${encodeURIComponent(name)}`;

            await createMetadataAccountV3(umi, {
                mint: fromWeb3JsPublicKey(mintKeypair.publicKey),
                mintAuthority: adminSigner,
                payer: adminSigner,
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
            }).sendAndConfirm(umi, { 
                send: { skipPreflight: true, maxRetries: 5 }, 
                confirm: { commitment: 'confirmed' } 
            });
            console.log(`✅ [Deploy] Metadata Registered`);
        } catch (metaError) {
            console.warn("⚠️ [Deploy] Metadata Warning (Non-critical):", metaError);
        }

    } catch (e: any) {
        console.error("❌ [Deploy] Minting Process Failed:", e);
        return c.json({ success: false, error: `Mint Failed: ${e.message}` }, 500);
    }

    // -------------------------------------------------------
    // 3. DB保存
    // -------------------------------------------------------
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
        now, depositAmountSOL, depositAmountSOL, mintAddress, serverPubkeyStr 
    ).run();

    await addXP(c.env.axis_db, ownerPubkey, 500, 'STRATEGY_DEPLOY', 'Deployed on-chain strategy');

    return c.json({ 
        success: true, 
        strategyId: id, 
        mintAddress,
        ticker,
        message: `Deployed ${name} ($${ticker})` 
    });

  } catch (error: any) {
    console.error('[Deploy] System Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------
// 💰 Swap Mock (Admin -> User)
// -----------------------------------------------------------
app.post('/swap-mock', async (c) => {
    try {
        const { strategyId, userPubkey, amountUSDC, signature } = await c.req.json();
        
        // Helius RPCを使う
        const rpcUrl = c.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');
        const serverWallet = Keypair.fromSecretKey(bs58.decode(c.env.SERVER_PRIVATE_KEY));

        const strategy = await c.env.axis_db.prepare(
            "SELECT mint_address, ticker FROM strategies WHERE id = ?"
        ).bind(strategyId).first();

        if (!strategy || !strategy.mint_address) return c.json({ success: false, error: "Strategy not found" }, 404);

        const mintAddress = new PublicKey(strategy.mint_address as string);
        const userKey = new PublicKey(userPubkey);

        const RATE = 10;
        const decimals = 9; 
        const tokenAmount = BigInt(Math.floor(amountUSDC * RATE * (10 ** decimals)));
        const serverATA = await getAssociatedTokenAddress(mintAddress, serverWallet.publicKey);
        const userATA = await getAssociatedTokenAddress(mintAddress, userKey);

        const ixs: TransactionInstruction[] = [];
        
        // User ATA作成
        const info = await connection.getAccountInfo(userATA);
        if (!info) {
            ixs.push(createAssociatedTokenAccountInstruction(serverWallet.publicKey, userATA, userKey, mintAddress));
        }
        // 送金
        ixs.push(createTransferInstruction(serverATA, userATA, serverWallet.publicKey, tokenAmount));

        // 汎用関数を使って送信
        const txSig = await sendSmartTransaction(connection, ixs, [serverWallet], "Swap Mock");
        
        return c.json({ success: true, tx: txSig, message: `Sent ${amountUSDC * RATE} ${strategy.ticker} tokens!` });

    } catch (e: any) {
        console.error("Swap Error:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

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