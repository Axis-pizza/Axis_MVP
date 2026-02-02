import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import * as DLMMModule from "@meteora-ag/dlmm";
import BN from "bn.js";
import * as fs from "fs";
import * as os from "os";

// DLMM クラスを取得
const DLMM = (DLMMModule as any).default.default;
const ActivationType = (DLMMModule as any).default.ActivationType;

// --- 設定 ---
const RPC_URL = "https://api.devnet.solana.com";

const USDC_DEV_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

const BIN_STEP = 100;

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  const home = os.homedir();
  const keypairPath = `${home}/.config/solana/id.json`;

  if (!fs.existsSync(keypairPath)) {
    console.error(`Error: Keypair not found at ${keypairPath}`);
    return;
  }

  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
  );

  console.log("🚀 Initializing Pool with Wallet:", keypair.publicKey.toBase58());

  try {
    const tokenXStr = SOL_MINT.toBase58();
    const tokenYStr = USDC_DEV_MINT.toBase58();

    const [tokenX, tokenY] =
      tokenXStr < tokenYStr
        ? [new PublicKey(tokenXStr), new PublicKey(tokenYStr)]
        : [new PublicKey(tokenYStr), new PublicKey(tokenXStr)];

    console.log(`Token X: ${tokenX.toBase58()}`);
    console.log(`Token Y: ${tokenY.toBase58()}`);

    const createPoolTxs = await DLMM.createCustomizablePermissionlessLbPair(
      connection,
      new BN(BIN_STEP),
      tokenX,
      tokenY,
      new BN(10000),
      new BN(200),
      new BN(0),
      keypair.publicKey,
      ActivationType.Slot,
      false,
      {
        cluster: "devnet",
      }
    );

    // Transaction か Transaction[] かを確認
    const txs = Array.isArray(createPoolTxs) ? createPoolTxs : [createPoolTxs];

    for (const tx of txs) {
      const txHash = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log("✅ Tx sent:", txHash);
    }

    console.log("🎉 Pool Created!");
  } catch (e) {
    console.error("Error:", e);
  }
}

main();