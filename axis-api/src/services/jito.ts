
import { 
    Connection, 
    Transaction, 
    VersionedTransaction, 
    PublicKey, 
    SystemProgram,
    TransactionInstruction
} from '@solana/web3.js';

// Specific Jito Block Engine Endpoint for Mainnet/Testnet.
// NOTE: Jito does not have an official Devnet endpoint. 
// Using Testnet for integration, but if running on Devnet cluster this will likely fail 
// unless a private relayer is used or Jito adds Devnet support.
// We prioritize REAL implementation over mocks.
const BLOCK_ENGINE_URL = 'https://ny.testnet.block-engine.jito.wtf/api/v1/bundles'; 

// Jito Tip Accounts (Testnet/Mainnet vary, these are illustrative of real structure)
// We fetch them dynamically to be precise.
const TIP_ACCOUNTS_ENDPOINT = 'https://ny.testnet.block-engine.jito.wtf/api/v1/bundles'; // Usually uses JSON-RPC

export class JitoService {
    
    constructor() {}

    /**
     * Get a random Jito Tip Account.
     * Uses the JSON-RPC 'getTipAccounts' method.
     */
    async getTipAccount(): Promise<string> {
        try {
            // Real JSON-RPC call to Jito
            const response = await fetch(BLOCK_ENGINE_URL, {
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
                throw new Error(`Jito API Error: ${response.statusText}`);
            }

            const data: any = await response.json();
            if (data.error) {
                 throw new Error(`Jito RPC Error: ${data.error.message}`);
            }

            const result = data.result;
            if (Array.isArray(result) && result.length > 0) {
                // Return a random tip account
                return result[Math.floor(Math.random() * result.length)];
            }
            
            // Fallback for Testnet if empty (Should not happen if service is up)
            return '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'; 
            
        } catch (e) {
            console.error("Failed to fetch Jito tip accounts:", e);
            // Fallback (Testnet Tip Account)
            return '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'; 
        }
    }

    /**
     * Create a Jito Tip Instruction.
     * @param userPublicKey The Payer
     * @param tipAmountLamports Tip amount (e.g. 1000 for low priority)
     */
    async createTipInstruction(userPublicKey: PublicKey, tipAmountLamports: number): Promise<TransactionInstruction> {
        const tipAccountStr = await this.getTipAccount();
        const tipAccount = new PublicKey(tipAccountStr);

        return SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: tipAccount,
            lamports: tipAmountLamports,
        });
    }

    /**
     * Send a Bundle of transactions to Jito.
     * @param encodedTransactions Array of base64 or base58 encoded transactions
     */
    async sendBundle(encodedTransactions: string[]) {
        console.log(`Sending Jito Bundle with ${encodedTransactions.length} txns...`);
        
        try {
            const response = await fetch(BLOCK_ENGINE_URL, {
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
                console.error("Jito Send Bundle Error:", data.error);
                throw new Error(data.error.message);
            }

            console.log("Jito Bundle Sent. Result:", data.result);
            return data.result; // Should be the Bundle ID
        } catch (e: any) {
            console.error("Critical Jito Bundle Failure:", e);
            throw new Error(`Bundle failed: ${e.message}`);
        }
    }
}
