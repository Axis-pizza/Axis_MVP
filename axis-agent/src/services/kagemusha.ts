import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import type { WalletContextState } from '../hooks/useWallet';

// Devnet Program ID
const PROGRAM_ID = new PublicKey('2kdDnjHHLmHex8v5pk8XgB7ddFeiuBW4Yp5Ykx8JmBLd');

// Rustプログラムの仕様書 (IDL定義)
// アカウント読み取り用に `accounts` 定義を追加しました
const IDL_JSON = {
  version: "0.1.0",
  name: "kagemusha",
  instructions: [
      {
          name: "initializeStrategy",
          accounts: [
              { name: "strategy", isMut: true, isSigner: false },
              { name: "owner", isMut: true, isSigner: true },
              { name: "systemProgram", isMut: false, isSigner: false }
          ],
          args: [
              { name: "name", type: "string" },
              { name: "strategyType", type: "u8" },
              { name: "targetWeights", type: { vec: "u16" } }
          ]
      },
      {
          name: "depositSol",
          accounts: [
              { name: "strategy", isMut: true, isSigner: false },
              { name: "position", isMut: true, isSigner: false },
              { name: "user", isMut: true, isSigner: true },
              { name: "vaultSol", isMut: true, isSigner: false },
              { name: "systemProgram", isMut: false, isSigner: false }
          ],
          args: [
              { name: "amount", type: "u64" }
          ]
      }
  ],
  // ★追加: アカウント構造の定義 (読み取り用)
  accounts: [
      {
          name: "Strategy", // Rust側の構造体名 (Strategy or StrategyVault)
          type: {
              kind: "struct",
              fields: [
                  { name: "owner", type: "publicKey" },
                  { name: "name", type: "string" }, // RustがStringならこれでOK。[u8;32]なら要調整
                  { name: "strategyType", type: "u8" },
                  { name: "targetWeights", type: { vec: "u16" } },
                  { name: "numTokens", type: "u8" },
                  { name: "isActive", type: "bool" },
                  { name: "tvl", type: "u64" },
                  { name: "feesCollected", type: "u64" },
                  { name: "lastRebalance", type: "i64" }
              ]
          }
      }
  ]
};

// 型定義
export interface StrategyParams {
  name: string;
  strategyType: number; // 0: Sniper, 1: Fortress, 2: Wave
  tokens: Array<{ symbol: string; weight: number }>;
}

export interface OnChainStrategy {
  address: string;
  owner: string;
  name: string;
  strategyType: string;
  tvl: number;
  isActive: boolean;
}

export const KagemushaService = {
  getProgram: (connection: Connection, wallet: any) => {
      const provider = new AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
      return new Program(IDL_JSON as any as Idl, PROGRAM_ID, provider);
  },

  // 1. Create Strategy
  initializeStrategy: async (connection: Connection, wallet: WalletContextState, params: StrategyParams) => {
      if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
      
      const program = KagemushaService.getProgram(connection, wallet);
      const [strategyPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("strategy"), wallet.publicKey.toBuffer(), Buffer.from(params.name)],
          PROGRAM_ID
      );

      // Convert weights to bps (Total 10000)
      const targetWeights = new Array(10).fill(0);
      params.tokens.forEach((t, i) => { if (i < 10) targetWeights[i] = Math.floor(t.weight * 100); });
      
      const sum = targetWeights.reduce((a, b) => a + b, 0);
      if (sum !== 10000 && params.tokens.length > 0) targetWeights[0] += (10000 - sum);

      const tx = await program.methods
          .initializeStrategy(params.name, params.strategyType, targetWeights)
          .accounts({ strategy: strategyPda, owner: wallet.publicKey, systemProgram: SystemProgram.programId })
          .transaction();
          
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      return { signature, strategyPubkey: strategyPda };
  },

  // 2. Deposit SOL
  depositSol: async (connection: Connection, wallet: WalletContextState, strategyPubkey: PublicKey, amountSol: number) => {
      if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

      const program = KagemushaService.getProgram(connection, wallet);
      const amountLamports = new BN(amountSol * LAMPORTS_PER_SOL);
      
      const [positionPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), strategyPubkey.toBuffer(), wallet.publicKey.toBuffer()],
          PROGRAM_ID
      );
      const [vaultSolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault_sol"), strategyPubkey.toBuffer()],
          PROGRAM_ID
      );

      const tx = await program.methods
          .depositSol(amountLamports)
          .accounts({ strategy: strategyPubkey, position: positionPda, user: wallet.publicKey, vaultSol: vaultSolPda, systemProgram: SystemProgram.programId })
          .transaction();

      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
  }
};

// ★ここから下を追加: 削除されてしまった読み取り関数を復活 & 互換性維持

/**
* Fetch all strategies owned by a specific wallet
* (KagemushaFlow.tsx がこれをインポートしようとしています)
*/
export async function getUserStrategies(
  connection: Connection,
  ownerPubkey: PublicKey
): Promise<OnChainStrategy[]> {
  try {
      // Anchorを使ってデータを取得
      // Note: IDLのアカウント名が "Strategy" なので、Anchorでは program.account.strategy となります
      const provider = new AnchorProvider(connection, { publicKey: ownerPubkey } as any, {});
      const program = new Program(IDL_JSON as any as Idl, PROGRAM_ID, provider);

      // フィルタリング: ownerフィールド(先頭8バイトの次)が ownerPubkey と一致するもの
      const strategies = await program.account.strategy.all([
          {
              memcmp: {
                  offset: 8, // Discriminator(8)の後
                  bytes: ownerPubkey.toBase58()
              }
          }
      ]);

      return strategies.map(({ publicKey, account }: any) => ({
          address: publicKey.toString(),
          owner: account.owner.toString(),
          name: account.name.toString().replace(/\0/g, ''), // Null文字除去
          strategyType: account.strategyType === 0 ? 'AGGRESSIVE' : account.strategyType === 2 ? 'BALANCED' : 'CONSERVATIVE',
          tvl: Number(account.tvl) / LAMPORTS_PER_SOL,
          isActive: account.isActive
      }));

  } catch (error) {
      console.error('Failed to fetch user strategies:', error);
      return [];
  }
}

// 互換性のために他の関数もエクスポートしておきます
export async function getStrategyInfo(connection: Connection, strategyPubkey: PublicKey) {
  try {
      const provider = new AnchorProvider(connection, {} as any, {});
      const program = new Program(IDL_JSON as any as Idl, PROGRAM_ID, provider);
      const account: any = await program.account.strategy.fetch(strategyPubkey);
      
      return {
          address: strategyPubkey.toString(),
          owner: account.owner.toString(),
          name: account.name.toString().replace(/\0/g, ''),
          tvl: Number(account.tvl) / LAMPORTS_PER_SOL,
          isActive: account.isActive
      };
  } catch {
      return null;
  }
}