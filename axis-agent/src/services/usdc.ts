import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { USDC_MINT, USDC_DECIMALS } from '../config/constants';

/**
 * Get the USDC balance for a wallet (returns human-readable amount, e.g. 10.5 USDC)
 */
export async function getUsdcBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey);
    const account = await connection.getTokenAccountBalance(ata);
    return account.value.uiAmount || 0;
  } catch {
    return 0;
  }
}

/**
 * Get the USDC ATA address and an idempotent create instruction.
 * The instruction is safe to include even if the ATA already exists.
 */
export async function getOrCreateUsdcAta(
  _connection: Connection,
  payer: PublicKey,
  owner: PublicKey
): Promise<{ ata: PublicKey; instruction: TransactionInstruction }> {
  const ata = await getAssociatedTokenAddress(USDC_MINT, owner);
  const instruction = createAssociatedTokenAccountIdempotentInstruction(
    payer,
    ata,
    owner,
    USDC_MINT
  );
  return { ata, instruction };
}

/**
 * Create a USDC transfer instruction.
 * @param from - Source ATA
 * @param to - Destination ATA
 * @param owner - Owner of source ATA (signer)
 * @param amountUsdc - Human-readable USDC amount (e.g. 10.5)
 */
export function createUsdcTransferIx(
  from: PublicKey,
  to: PublicKey,
  owner: PublicKey,
  amountUsdc: number
): TransactionInstruction {
  const baseUnits = BigInt(Math.floor(amountUsdc * 10 ** USDC_DECIMALS));
  return createTransferInstruction(from, to, owner, baseUnits, [], TOKEN_PROGRAM_ID);
}
