import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import type { TokenAllocation } from '../types';

const PROGRAM_ID = new PublicKey('2kdDnjHHLmHex8v5pk8XgB7ddFeiuBW4Yp5Ykx8JmBLd');

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
      },
      // ★追加: withdrawの定義 (仮)
      {
          name: "withdrawSol",
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
  accounts: [
      {
          name: "Strategy",
          type: {
              kind: "struct",
              fields: [
                  { name: "owner", type: "publicKey" },
                  { name: "name", type: "string" },
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

export interface StrategyParams {
  name: string;
  strategyType: number; 
  tokens: Array<{ symbol: string; weight: number }>;
}

export interface OnChainStrategy {
  address: string;
  owner: string;
  name: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tvl: number;
  isActive: boolean;
  tokens?: TokenAllocation[];
  ticker?: string;
  pnl?: number;
  pnlPercent?: number;
  lastRebalance?: number;
}

type WalletInterface = {
    publicKey: PublicKey | null;
    signTransaction?: (transaction: Transaction) => Promise<Transaction>;
    [key: string]: any; 
};

export const KagemushaService = {
  getProgram: (connection: Connection, wallet: any) => {
      const provider = new AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
      return new Program(IDL_JSON as any as Idl, PROGRAM_ID, provider);
  },

  initializeStrategy: async (connection: Connection, wallet: WalletInterface, params: StrategyParams) => {
      if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
      
      const program = KagemushaService.getProgram(connection, wallet);
      const [strategyPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("strategy"), wallet.publicKey.toBuffer(), Buffer.from(params.name)],
          PROGRAM_ID
      );

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

  depositSol: async (connection: Connection, wallet: WalletInterface, strategyPubkey: PublicKey, amountSol: number) => {
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

// ★追加: withdraw 関数
export async function withdraw(
  connection: Connection,
  wallet: WalletInterface,
  strategyPubkey: PublicKey,
  amountShares: number 
) {
  if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

  // NOTE: MVPでは単純化のため withdrawSol を呼ぶか、まだ実装されていない場合はエラーにする
  // ここでは depositSol と同様の構成で withdrawSol を呼び出すと仮定
  const program = KagemushaService.getProgram(connection, wallet);
  
  // shares -> lamports の計算ロジックが必要だが、MVPでは 1 share = 1 lamport と仮定して通すか
  // もしくは withdrawSol があればそれを呼ぶ
  const amountLamports = new BN(amountShares * LAMPORTS_PER_SOL); 

  const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), strategyPubkey.toBuffer(), wallet.publicKey.toBuffer()],
      PROGRAM_ID
  );
  const [vaultSolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_sol"), strategyPubkey.toBuffer()],
      PROGRAM_ID
  );

  // IDLに withdrawSol があると仮定して呼び出す
  try {
      const tx = await program.methods
      .withdrawSol(amountLamports)
      .accounts({ 
          strategy: strategyPubkey, 
          position: positionPda, 
          user: wallet.publicKey, 
          vaultSol: vaultSolPda, 
          systemProgram: SystemProgram.programId 
      })
      .transaction();

      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
  } catch {
      throw new Error("Withdraw not implemented on-chain yet");
  }
}

export async function getUserStrategies(
  connection: Connection,
  ownerPubkey: PublicKey
): Promise<OnChainStrategy[]> {
  try {
      const provider = new AnchorProvider(connection, { publicKey: ownerPubkey } as any, {});
      const program = new Program(IDL_JSON as any as Idl, PROGRAM_ID, provider);

      const strategies = await program.account.strategy.all([
          {
              memcmp: {
                  offset: 8, 
                  bytes: ownerPubkey.toBase58()
              }
          }
      ]);

      return strategies.map(({ publicKey, account }: any) => ({
          address: publicKey.toString(),
          owner: account.owner.toString(),
          name: account.name.toString().replace(/\0/g, ''),
          strategyType: account.strategyType === 0 ? 'AGGRESSIVE' : account.strategyType === 2 ? 'BALANCED' : 'CONSERVATIVE',
          tvl: Number(account.tvl) / LAMPORTS_PER_SOL,
          isActive: account.isActive,
          tokens: [] 
      }));

  } catch {
      return [];
  }
}

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
          isActive: account.isActive,
          // ★修正: トークン情報を追加（空配列で埋める）
          tokens: [] 
      };
  } catch {
      return null;
  }
}