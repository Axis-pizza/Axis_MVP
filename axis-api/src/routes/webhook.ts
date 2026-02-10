import { Hono } from 'hono';
import { Bindings } from '../config/env';
import { 
    Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction 
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAccount
} from '@solana/spl-token';
import bs58 from 'bs58';

const app = new Hono<{ Bindings: Bindings }>();

app.post('/', async (c) => {
    try {
        // 1. Heliusからのデータを受け取る
        const transactions = await c.req.json() as any[];
        
        if (!transactions || !Array.isArray(transactions)) {
            return c.json({ message: 'Invalid payload' }, 400);
        }

        // Helius RPCとサーバー鍵の準備
        const connection = new Connection(c.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        const serverWallet = Keypair.fromSecretKey(bs58.decode(c.env.SERVER_PRIVATE_KEY));

        for (const tx of transactions) {
            const signature = tx.signature;
            
            // 2. Native Transfers (SOL移動) を解析
            const nativeTransfers = tx.nativeTransfers;
            if (!nativeTransfers) continue;

            for (const transfer of nativeTransfers) {
                const amountLamports = transfer.amount;
                const fromUser = transfer.fromUserAccount;
                const toVault = transfer.toUserAccount;

                // 3. 入金先(Vault)が、我々のStrategyのものかDBで確認
                // ※ MVPでは vault_address = serverWallet.publicKey になっている場合が多いので、
                // strategyテーブルの vault_address と一致するか確認します。
                const strategy = await c.env.axis_db.prepare(
                    'SELECT id, mint_address, ticker FROM strategies WHERE vault_address = ?'
                ).bind(toVault).first();

                // Strategyが見つからない、またはMintアドレスがない場合はスキップ
                if (!strategy || !strategy.mint_address) {
                    continue; 
                }

                // 4. 二重処理防止 (Idempotency)
                const processed = await c.env.axis_db.prepare(
                    'SELECT signature FROM processed_deposits WHERE signature = ?'
                ).bind(signature).first();

                if (processed) {
                    console.log(`[Webhook] Skipping duplicate: ${signature}`);
                    continue;
                }

                console.log(`[Webhook] Deposit detected! ${amountLamports} lamports from ${fromUser} for ${strategy.ticker}`);

                // 5. Transfer処理 (pre-mintedトークンをサーバーATAからユーザーへ転送)
                const mintPubkey = new PublicKey(strategy.mint_address as string);
                const userPubkey = new PublicKey(fromUser);

                // レート計算 (MVP: 1 SOL = 100 ETF)
                const MINT_RATE = 100;
                const mintAmount = BigInt(amountLamports) * BigInt(MINT_RATE);

                // サーバーATAの残高確認
                const serverATA = await getAssociatedTokenAddress(mintPubkey, serverWallet.publicKey);
                try {
                    const serverATAInfo = await getAccount(connection, serverATA);
                    if (serverATAInfo.amount < mintAmount) {
                        console.error(`[Webhook] Insufficient supply in server ATA: has ${serverATAInfo.amount}, need ${mintAmount}`);
                        continue;
                    }
                } catch (ataErr) {
                    console.error(`[Webhook] Server ATA not found for mint ${strategy.mint_address}:`, ataErr);
                    continue;
                }

                // ユーザーのATA (Token Account) を取得
                const userATA = await getAssociatedTokenAddress(mintPubkey, userPubkey);
                const transaction = new Transaction();

                // ATAが存在するか確認（なければ作成命令を追加：Rentはサーバー負担）
                const accountInfo = await connection.getAccountInfo(userATA);
                if (!accountInfo) {
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            serverWallet.publicKey,
                            userATA,
                            userPubkey,
                            mintPubkey
                        )
                    );
                }

                // サーバーATAからユーザーATAへtransfer (pre-minted supplyから配布)
                transaction.add(
                    createTransferInstruction(
                        serverATA,
                        userATA,
                        serverWallet.publicKey,
                        mintAmount
                    )
                );

                // トランザクション送信
                await sendAndConfirmTransaction(connection, transaction, [serverWallet]);
                console.log(`[Webhook] Transferred ${mintAmount} ${strategy.ticker} to ${fromUser}`);

                // 6. 処理済みとしてDBに記録
                await c.env.axis_db.prepare(
                    `INSERT INTO processed_deposits (signature, strategy_id, user_address, amount_lamports, mint_amount) 
                     VALUES (?, ?, ?, ?, ?)`
                ).bind(signature, strategy.id, fromUser, amountLamports, mintAmount.toString()).run();
            }
        }

        return c.json({ success: true });
    } catch (e: any) {
        console.error('[Webhook] Error:', e);
        // Heliusには200を返してリトライを防ぐ（またはエラーでリトライさせるか要検討）
        return c.json({ success: false, error: e.message }, 500);
    }
});

export default app;