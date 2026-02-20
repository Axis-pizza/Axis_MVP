import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import { USDC_MINT } from "../config/constants";

export async function claimFaucet(privateKey: string, walletAddress: string, rpcUrl: string) {
  if (!walletAddress) throw new Error("Wallet address required");

  const secret = bs58.decode(privateKey);
  const adminKeypair = Keypair.fromSecretKey(secret);

  const connection = new Connection(rpcUrl, "processed");
  const userPublicKey = new PublicKey(walletAddress);

  const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    adminKeypair,
    USDC_MINT,
    adminKeypair.publicKey
  );

  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    adminKeypair,
    USDC_MINT,
    userPublicKey
  );

  const amount = 1000 * 1_000_000; // 1000 USDC

  // SOL転送は廃止 — サーバー自身が fee payer としてガス代を負担する
  const tx = new Transaction().add(
    createTransferInstruction(
      adminTokenAccount.address,
      userTokenAccount.address,
      adminKeypair.publicKey,
      amount
    )
  );

  const latest = await connection.getLatestBlockhash("processed");
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = adminKeypair.publicKey;
  tx.sign(adminKeypair);

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  return {
    signature: sig,
    latestBlockhash: latest,
    connection,
  };
}

// フロントエンドが作成したトランザクションにサーバーを fee payer として部分署名して返す
export async function signAsFeePayer(
  privateKey: string,
  transactionBase64: string
): Promise<string> {
  const secret = bs58.decode(privateKey);
  const feePayerKeypair = Keypair.fromSecretKey(secret);

  // クライアントの tx から blockhash と instructions を取り出す
  const clientTx = Transaction.from(Buffer.from(transactionBase64, 'base64'));

  // fee payer をサーバーに差し替えて新しい tx を構築
  const serverTx = new Transaction({
    feePayer: feePayerKeypair.publicKey,
    recentBlockhash: clientTx.recentBlockhash,
  });
  serverTx.add(...clientTx.instructions);

  // fee payer として部分署名（ユーザー署名はフロントで後から追加）
  serverTx.partialSign(feePayerKeypair);

  return serverTx.serialize({ requireAllSignatures: false }).toString('base64');
}

export async function confirmTransaction(connection: Connection, signature: string, latestBlockhash: any) {
    try {
        await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
        );
    } catch (e) {
        console.warn("confirm failed (non-fatal):", e);
    }
}
