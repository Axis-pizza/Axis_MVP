/**
 * Kagemusha Smart Contract Services
 * Handles all blockchain interactions for strategy vault deployment
 */

import { 
  Connection, 
  PublicKey, 
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import type { GetProgramAccountsFilter } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import type { WalletContextState } from '@solana/wallet-adapter-react';

// Program ID deployed to devnet
const PROGRAM_ID = new PublicKey('2kdDnjHHLmHex8v5pk8XgB7ddFeiuBW4Yp5Ykx8JmBLd');

// Account discriminator for StrategyVault (first 8 bytes of Anchor account)
const STRATEGY_VAULT_DISCRIMINATOR = [159, 204, 238, 219, 38, 201, 136, 177];

// Known token symbols (for displaying composition)
const TOKEN_SYMBOLS = ['SOL', 'BTC', 'ETH', 'USDC', 'JUP', 'BONK', 'WIF', 'JTO', 'PYTH', 'RAY'];

export interface StrategyParams {
  name: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: Array<{ symbol: string; weight: number; address: string }>;
  initialInvestment: number;
}

export interface OnChainStrategy {
  address: string;
  owner: string;
  name: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: Array<{ symbol: string; weight: number }>;
  numTokens: number;
  isActive: boolean;
  tvl: number; // in SOL
  feesCollected: number;
  lastRebalance: Date | null;
  pnl: number;
  pnlPercent: number;
}

export interface UserPosition {
  vault: string;
  user: string;
  lpShares: number;
  depositTime: Date;
  entryValue: number;
}

/**
 * Map strategy type to on-chain enum
 */
function getStrategyTypeIndex(type: string): number {
  switch (type) {
    case 'AGGRESSIVE': return 0;
    case 'BALANCED': return 1;
    case 'CONSERVATIVE': return 2;
    default: return 1;
  }
}

/**
 * Map on-chain enum to strategy type string
 */
function getStrategyTypeName(index: number): 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE' {
  switch (index) {
    case 0: return 'AGGRESSIVE';
    case 1: return 'CONSERVATIVE';
    case 2: return 'BALANCED';
    default: return 'BALANCED';
  }
}

/**
 * Parse StrategyVault account data
 */
function parseStrategyVault(address: PublicKey, data: Buffer): OnChainStrategy | null {
  try {
    // Check discriminator
    const discriminator = Array.from(data.slice(0, 8));
    if (!discriminator.every((v, i) => v === STRATEGY_VAULT_DISCRIMINATOR[i])) {
      return null;
    }

    // Parse fields according to StrategyVault struct
    let offset = 8;
    
    // owner: Pubkey (32 bytes)
    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // name: [u8; 32]
    const nameBytes = data.slice(offset, offset + 32);
    const nameEnd = nameBytes.indexOf(0);
    const name = nameBytes.slice(0, nameEnd > 0 ? nameEnd : 32).toString('utf8').trim();
    offset += 32;
    
    // strategy_type: u8
    const strategyType = data[offset];
    offset += 1;
    
    // target_weights: [u16; 10] (20 bytes)
    const weights: number[] = [];
    for (let i = 0; i < 10; i++) {
      const weight = data.readUInt16LE(offset + i * 2);
      weights.push(weight);
    }
    offset += 20;
    
    // num_tokens: u8
    const numTokens = data[offset];
    offset += 1;
    
    // is_active: bool
    const isActive = data[offset] === 1;
    offset += 1;
    
    // tvl: u64 (8 bytes)
    const tvlLamports = data.readBigUInt64LE(offset);
    const tvl = Number(tvlLamports) / LAMPORTS_PER_SOL;
    offset += 8;
    
    // fees_collected: u64 (8 bytes)
    const feesLamports = data.readBigUInt64LE(offset);
    const feesCollected = Number(feesLamports) / LAMPORTS_PER_SOL;
    offset += 8;
    
    // last_rebalance: i64 (8 bytes)
    const lastRebalanceTs = Number(data.readBigInt64LE(offset));
    const lastRebalance = lastRebalanceTs > 0 ? new Date(lastRebalanceTs * 1000) : null;
    offset += 8;

    // Convert weights to token allocations
    const tokens: Array<{ symbol: string; weight: number }> = [];
    for (let i = 0; i < numTokens && i < 10; i++) {
      if (weights[i] > 0) {
        tokens.push({
          symbol: TOKEN_SYMBOLS[i] || `TOKEN${i}`,
          weight: weights[i] / 100, // Convert from basis points to percentage
        });
      }
    }

    // Mock P&L for now (in production, calculate from price changes)
    const pnl = Math.random() * 2 - 1; // -1 to +1 SOL
    const pnlPercent = tvl > 0 ? (pnl / tvl) * 100 : 0;

    return {
      address: address.toString(),
      owner: owner.toString(),
      name,
      strategyType: getStrategyTypeName(strategyType),
      tokens,
      numTokens,
      isActive,
      tvl,
      feesCollected,
      lastRebalance,
      pnl,
      pnlPercent,
    };
  } catch (error) {
    console.error('Failed to parse strategy vault:', error);
    return null;
  }
}

/**
 * Fetch all strategies owned by a specific wallet
 */
export async function getUserStrategies(
  connection: Connection,
  ownerPubkey: PublicKey
): Promise<OnChainStrategy[]> {
  try {
    // Filter by owner (owner field starts at offset 8)
    const filters: GetProgramAccountsFilter[] = [
      { dataSize: 120 }, // StrategyVault size
      { memcmp: { offset: 8, bytes: ownerPubkey.toBase58() } },
    ];

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters });
    
    const strategies: OnChainStrategy[] = [];
    for (const { pubkey, account } of accounts) {
      const parsed = parseStrategyVault(pubkey, account.data as Buffer);
      if (parsed) {
        strategies.push(parsed);
      }
    }

    return strategies;
  } catch (error) {
    console.error('Failed to fetch user strategies:', error);
    return [];
  }
}

/**
 * Fetch all public strategies (for discover page)
 */
export async function getAllStrategies(
  connection: Connection,
  limit: number = 50
): Promise<OnChainStrategy[]> {
  try {
    const filters: GetProgramAccountsFilter[] = [
      { dataSize: 120 }, // StrategyVault size
    ];

    const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters });
    
    const strategies: OnChainStrategy[] = [];
    for (const { pubkey, account } of accounts) {
      if (strategies.length >= limit) break;
      
      const parsed = parseStrategyVault(pubkey, account.data as Buffer);
      if (parsed && parsed.isActive) {
        strategies.push(parsed);
      }
    }

    // Sort by TVL descending
    strategies.sort((a, b) => b.tvl - a.tvl);

    return strategies;
  } catch (error) {
    console.error('Failed to fetch all strategies:', error);
    return [];
  }
}

/**
 * Get single strategy info
 */
export async function getStrategyInfo(
  connection: Connection,
  strategyPubkey: PublicKey
): Promise<OnChainStrategy | null> {
  try {
    const account = await connection.getAccountInfo(strategyPubkey);
    if (!account) {
      return null;
    }

    return parseStrategyVault(strategyPubkey, account.data as Buffer);
  } catch (error) {
    console.error('Failed to get strategy info:', error);
    return null;
  }
}

/**
 * Initialize a new strategy vault on-chain
 */
export async function initializeStrategy(
  connection: Connection,
  wallet: WalletContextState,
  params: StrategyParams
): Promise<{ signature: string; strategyPubkey: PublicKey }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const [strategyPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('strategy'),
        wallet.publicKey.toBuffer(),
        Buffer.from(params.name.slice(0, 32))
      ],
      PROGRAM_ID
    );

    const targetWeights = params.tokens.map(t => t.weight * 100);

    const nameBytes = Buffer.from(params.name.padEnd(32, '\0').slice(0, 32));
    const strategyType = getStrategyTypeIndex(params.strategyType);
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: strategyPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([
        Buffer.from([0]),
        nameBytes,
        Buffer.from([strategyType]),
        Buffer.from(new Uint16Array(targetWeights).buffer),
      ])
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Strategy initialized: ${strategyPda.toString()}`);

    return {
      signature,
      strategyPubkey: strategyPda
    };
  } catch (error) {
    console.error('Failed to initialize strategy:', error);
    throw error;
  }
}

/**
 * Deposit SOL/tokens into an existing strategy
 */
export async function deposit(
  connection: Connection,
  wallet: WalletContextState,
  strategyPubkey: PublicKey,
  amount: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const amountLamports = new BN(amount * 1e9);

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        strategyPubkey.toBuffer(),
        wallet.publicKey.toBuffer()
      ],
      PROGRAM_ID
    );

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: strategyPubkey, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([
        Buffer.from([1]),
        amountLamports.toArrayLike(Buffer, 'le', 8)
      ])
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Deposited ${amount} SOL`);

    return signature;
  } catch (error) {
    console.error('Failed to deposit:', error);
    throw error;
  }
}

/**
 * Send transaction via Jito for MEV protection
 */
export async function sendViaJito(
  transaction: Transaction,
  connection: Connection
): Promise<string> {
  const JITO_URL = 'https://mainnet.block-engine.jito.wtf/api/v1/transactions';
  
  try {
    const serialized = transaction.serialize();
    const response = await fetch(JITO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [serialized.toString('base64')]
      })
    });

    const result = await response.json();
    return result.result || result.signature;
  } catch {
    console.warn('Jito send failed, falling back to regular RPC');
    return await connection.sendRawTransaction(transaction.serialize());
  }
}

/**
 * Withdraw/Redeem funds from a strategy
 */
export async function withdraw(
  connection: Connection,
  wallet: WalletContextState,
  strategyPubkey: PublicKey,
  amountShares: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const shares = new BN(amountShares * 1e9); 

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        strategyPubkey.toBuffer(),
        wallet.publicKey.toBuffer()
      ],
      PROGRAM_ID
    );

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: strategyPubkey, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([
        Buffer.from([2]), // Instruction index 2 for Withdraw
        shares.toArrayLike(Buffer, 'le', 8)
      ])
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Withdrawn shares: ${amountShares}`);

    return signature;
  } catch (error) {
    console.error('Failed to withdraw:', error);
    throw error;
  }
}

/**
 * Rebalance strategy with new weights/tokens
 * Note: Simpler implementation for MVP, in production this would involve swaps
 */
export async function rebalance(
  connection: Connection,
  wallet: WalletContextState,
  strategyPubkey: PublicKey,
  newTokens: Array<{ symbol: string; weight: number }>
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const targetWeights = newTokens.map(t => t.weight * 100);
    // Pad to 10 tokens
    while (targetWeights.length < 10) targetWeights.push(0);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: strategyPubkey, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([
        Buffer.from([3]), // Instruction index 3 for Rebalance
        Buffer.from(new Uint16Array(targetWeights).buffer),
      ])
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Strategy rebalanced: ${strategyPubkey.toString()}`);

    return signature;
  } catch (error) {
    console.error('Failed to rebalance:', error);
    throw error;
  }
}

