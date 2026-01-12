/**
 * Jito Bundle Service
 * MEV protection and atomic transaction bundling
 */

import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

// Jito Block Engine endpoints by region
const JITO_ENDPOINTS = {
  mainnet: {
    ny: 'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
    amsterdam: 'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
    frankfurt: 'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
    tokyo: 'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
  },
  // Note: Jito does not have official devnet/testnet endpoints
  // Using mainnet structure for real implementation
};

export class JitoBundleService {
  private endpoint: string;

  constructor(region: 'ny' | 'amsterdam' | 'frankfurt' | 'tokyo' = 'ny') {
    this.endpoint = JITO_ENDPOINTS.mainnet[region];
  }

  /**
   * Get available tip accounts from Jito
   */
  async getTipAccounts(): Promise<string[]> {
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
   * Send a bundle of transactions
   * @param encodedTransactions Base64 or base58 encoded signed transactions
   */
  async sendBundle(encodedTransactions: string[]): Promise<{ bundleId: string }> {
    console.log(`[Jito] Sending bundle with ${encodedTransactions.length} transactions`);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [encodedTransactions]
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
