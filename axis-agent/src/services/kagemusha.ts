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
} from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import type { WalletContextState } from '@solana/wallet-adapter-react';
// TOKEN_PROGRAM_ID can be used for SPL token operations

// Program ID deployed to devnet
const PROGRAM_ID = new PublicKey('2kdDnjHHLmHex8v5pk8XgB7ddFeiuBW4Yp5Ykx8JmBLd');

export interface StrategyParams {
  name: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: Array<{ symbol: string; weight: number; address: string }>;
  initialInvestment: number; // in SOL
}

/**
 * Map strategy type to on-chain enum
 */
function getStrategyTypeIndex(type: string): number {
  switch (type) {
    case 'AGGRESSIVE': return 0; // Sniper
    case 'BALANCED': return 1; // Fortress  
    case 'CONSERVATIVE': return 2; // Wave
    default: return 1;
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
    // Generate strategy vault PDA
    const [strategyPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('strategy'),
        wallet.publicKey.toBuffer(),
        Buffer.from(params.name.slice(0, 32))
      ],
      PROGRAM_ID
    );

    // Convert weights to basis points (e.g., 50% = 5000)
    const targetWeights = params.tokens.map(t => t.weight * 100);

    // Build instruction data
    const nameBytes = Buffer.from(params.name.padEnd(32, '\0').slice(0, 32));
    const strategyType = getStrategyTypeIndex(params.strategyType);
    
    // Create instruction (simplified - you'll need to match your actual IDL)
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: strategyPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.concat([
        Buffer.from([0]), // initialize_strategy discriminator
        nameBytes,
        Buffer.from([strategyType]),
        Buffer.from(new Uint16Array(targetWeights).buffer),
      ])
    });

    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Sign and send
    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Strategy initialized: ${strategyPda.toString()}`);
    console.log(`📝 Transaction: ${signature}`);

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
  amount: number // in SOL
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const amountLamports = new BN(amount * 1e9);

    // Generate user position PDA
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
        Buffer.from([1]), // deposit discriminator
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
    console.log(`📝 Transaction: ${signature}`);

    return signature;
  } catch (error) {
    console.error('Failed to deposit:', error);
    throw error;
  }
}

/**
 * Send transaction via Jito for MEV protection
 * @param transaction - The transaction to send
 * @param connection - Solana connection
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
  } catch (error) {
    console.warn('Jito send failed, falling back to regular RPC');
    // Fallback to regular connection
    return await connection.sendRawTransaction(transaction.serialize());
  }
}

/**
 * Get strategy vault info
 */
export async function getStrategyInfo(
  connection: Connection,
  strategyPubkey: PublicKey
): Promise<any> {
  try {
    const account = await connection.getAccountInfo(strategyPubkey);
    if (!account) {
      throw new Error('Strategy not found');
    }

    // Parse account data (simplified - match your actual account struct)
    const data = account.data;
    
    return {
      address: strategyPubkey.toString(),
      owner: new PublicKey(data.slice(8, 40)).toString(),
      name: Buffer.from(data.slice(40, 72)).toString('utf8').trim(),
      strategyType: data[72],
      totalValue: new BN(data.slice(73, 81), 'le').toNumber(),
      // ... parse more fields as needed
    };
  } catch (error) {
    console.error('Failed to get strategy info:', error);
    throw error;
  }
}
