/**
 * Jito Bundle Service
 * MEV protection and atomic transaction bundling
 * 
 * NOTE: Jito is mainnet-only. For devnet, we fallback to standard RPC.
 */

import { Connection, PublicKey, SystemProgram, TransactionInstruction, VersionedTransaction, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

// Helper function for base64 to Uint8Array conversion (Workers compatible)
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Jito Block Engine endpoints by region
const JITO_ENDPOINTS = {
  mainnet: {
    ny: 'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
    amsterdam: 'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
    frankfurt: 'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
    tokyo: 'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
  },
};

// Solana RPC endpoints - using Helius free tier for devnet (doesn't block Cloudflare)
// Public Solana RPC blocks cloud providers like Cloudflare Workers
const SOLANA_RPC = {
  // Helius free tier devnet - works with Cloudflare Workers
  devnet: 'https://devnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff',
  // For mainnet, you should use your own Helius/QuickNode API key
  mainnet: 'https://api.mainnet-beta.solana.com',
};

export class JitoBundleService {
  private endpoint: string;
  private network: 'devnet' | 'mainnet';
  private connection: Connection;

  constructor(
    network: 'devnet' | 'mainnet' = 'devnet',
    region: 'ny' | 'amsterdam' | 'frankfurt' | 'tokyo' = 'tokyo',
    customRpcUrl?: string
  ) {
    this.network = network;
    this.endpoint = JITO_ENDPOINTS.mainnet[region];
    // Use custom RPC URL if provided, otherwise use default
    const rpcUrl = customRpcUrl || SOLANA_RPC[network];
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get available tip accounts from Jito
   */
  async getTipAccounts(): Promise<string[]> {
    // For devnet, return a dummy tip account (we won't actually use Jito)
    if (this.network === 'devnet') {
      return ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'];
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTipAccounts',
          params: []
        })
      });

      if (!response.ok) {
        throw new Error(`Jito API error: ${response.status}`);
      }

      const data: any = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.result || [];
    } catch (error) {
      console.error('[Jito] Failed to get tip accounts:', error);
      // Return known tip accounts as fallback
      return [
        '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
        'HFqU5x63VTqvQss8hp11i4bVe4Rb5s5PN37khvGxD4Nj',
        'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
        'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
        'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGdLWRUWXQ',
      ];
    }
  }

  /**
   * Get a random tip account
   */
  async getRandomTipAccount(): Promise<string> {
    const accounts = await this.getTipAccounts();
    return accounts[Math.floor(Math.random() * accounts.length)];
  }

  /**
   * Create a tip instruction
   */
  async createTipInstruction(payer: PublicKey, tipLamports: number = 1000): Promise<TransactionInstruction> {
    const tipAccount = await this.getRandomTipAccount();
    
    return SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: new PublicKey(tipAccount),
      lamports: tipLamports,
    });
  }

  /**
   * Convert base64 encoded transaction to base58
   */
  private base64ToBase58(base64Tx: string): string {
    const bytes = base64ToUint8Array(base64Tx);
    return bs58.encode(bytes);
  }

  /**
   * Send a bundle of transactions
   * @param encodedTransactions Base64 encoded signed transactions (from frontend)
   */
  async sendBundle(encodedTransactions: string[]): Promise<{ bundleId: string }> {
    console.log(`[Jito] Sending bundle with ${encodedTransactions.length} transactions, network: ${this.network}`);

    // For devnet, use standard RPC instead of Jito (Jito is mainnet-only)
    if (this.network === 'devnet') {
      return this.sendViaStandardRpc(encodedTransactions);
    }

    // For mainnet, use Jito with base58 encoding
    return this.sendViaJito(encodedTransactions);
  }

  /**
   * Send transactions via standard Solana RPC (for devnet)
   */
  private async sendViaStandardRpc(encodedTransactions: string[]): Promise<{ bundleId: string }> {
    console.log('[Jito] Using standard RPC for devnet');

    const signatures: string[] = [];

    for (const base64Tx of encodedTransactions) {
      try {
        const bytes = base64ToUint8Array(base64Tx);
        
        // Try to deserialize as VersionedTransaction first, then legacy Transaction
        let signature: string;
        try {
          const tx = VersionedTransaction.deserialize(bytes);
          signature = await this.connection.sendTransaction(tx, {
            skipPreflight: true, // Skip preflight to avoid "already processed" simulation errors
            maxRetries: 3,
          });
        } catch {
          // Fallback to legacy transaction
          const tx = Transaction.from(bytes);
          signature = await this.connection.sendRawTransaction(bytes, {
            skipPreflight: true, // Skip preflight to avoid "already processed" simulation errors
            maxRetries: 3,
          });
        }

        console.log('[RPC] Transaction sent:', signature);
        signatures.push(signature);
      } catch (error: any) {
        console.error('[RPC] Transaction failed:', error);
        throw new Error(`Transaction failed: ${error.message}`);
      }
    }

    // Return first signature as bundle ID
    return { bundleId: signatures[0] || 'devnet-' + Date.now() };
  }

  /**
   * Send transactions via Jito Bundle (for mainnet)
   */
  private async sendViaJito(encodedTransactions: string[]): Promise<{ bundleId: string }> {
    try {
      // Convert base64 to base58 for Jito
      const base58Transactions = encodedTransactions.map(tx => this.base64ToBase58(tx));
      console.log('[Jito] Converted to base58, sending bundle...');

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [base58Transactions]
        })
      });

      const data: any = await response.json();

      if (data.error) {
        console.error('[Jito] Bundle error:', data.error);
        throw new Error(data.error.message);
      }

      console.log('[Jito] Bundle sent successfully:', data.result);
      return { bundleId: data.result };
    } catch (error: any) {
      console.error('[Jito] Bundle send failed:', error);
      throw new Error(`Jito bundle failed: ${error.message}`);
    }
  }

  /**
   * Get bundle status
   */
  async getBundleStatus(bundleId: string): Promise<any> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]]
        })
      });

      const data: any = await response.json();
      return data.result?.value?.[0] || null;
    } catch (error) {
      console.error('[Jito] Status check failed:', error);
      return null;
    }
  }
}
