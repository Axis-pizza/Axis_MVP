import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import { USDC_MINT } from "../config/constants";

export async function claimFaucet(privateKey: string, walletAddress: string, rpcUrl: string) {
  if (!walletAddress) throw new Error("Wallet address required");

  // Decode private key
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

  const SOL_AMOUNT = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL for gas fees

  const tx = new Transaction()
    .add(
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: userPublicKey,
        lamports: SOL_AMOUNT,
      })
    )
    .add(
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
      connection
  };
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
