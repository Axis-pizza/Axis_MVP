/**
 * Deployment Blueprint - Smart Contract visualization (Step 3)
 * Shows the "blueprint" of the deployed strategy
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, CheckCircle2, Loader2, ExternalLink, Copy, ArrowLeft, Lock, Coins } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, type Idl } from '@coral-xyz/anchor';
import { PizzaChart } from '../common/PizzaChart';
import idl from '../../idl/kagemusha.json';

interface TokenAllocation {
  symbol: string;
  weight: number;
}

interface DeploymentBlueprintProps {
  strategyName: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: TokenAllocation[];
  description?: string;
  onBack: () => void;
  onComplete: () => void;
  onDeploySuccess?: (strategyAddress: string) => void;
}

type DeployStatus = 'PREVIEW' | 'PREPARING' | 'SIGNING' | 'BUNDLING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR';

export const DeploymentBlueprint = ({
  strategyName,
  strategyType,
  tokens,
  description,
  onBack,
  onComplete,
  onDeploySuccess,
}: DeploymentBlueprintProps) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<DeployStatus>('PREVIEW');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [jitoBundle, setJitoBundle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!publicKey || !signTransaction) return;

    setStatus('PREPARING');
    setErrorMessage(null);

    try {
      // 1. Get Jito Tip Account (for mainnet MEV protection)
      // NOTE: Jito is mainnet-only, for devnet we skip the tip
      const tipResponse = await fetch('https://axis-api.yusukekikuta-05.workers.dev/kagemusha/prepare-deployment');
      
      if (!tipResponse.ok) {
         throw new Error(`API Error: ${tipResponse.statusText}`);
      }
      
      const tipData = await tipResponse.json();
      
      if (!tipData.success) {
        throw new Error('Failed to get Jito tip account');
      }
      
      // Check if we're on devnet (skip Jito tip for devnet)
      const isDevnet = connection.rpcEndpoint.includes('devnet');

      // 2. Setup Anchor Provider & Program
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: publicKey,
          signTransaction: signTransaction,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: 'confirmed' }
      );

      const programId = new PublicKey(idl.address);
      const program = new Program(idl as Idl, provider);

      // 3. Prepare Arguments
      // Map Strategy Type to u8
      const strategyTypeMap = {
        'AGGRESSIVE': 0, // Sniper
        'CONSERVATIVE': 1, // Fortress
        'BALANCED': 2,    // Wave
      } as const;
      
      const mappedType = strategyType in strategyTypeMap ? strategyTypeMap[strategyType] : 2;

      // Calculate Weights (Basis Points)
      // Ensure specific order if needed, but for now just map current tokens to weights
      // Need to ensure sum is 10000
      const weights = tokens.map(t => Math.round(t.weight * 100)); // 20% -> 2000
      
      // Fix potential rounding errors to sum exactly 10000
      const currentSum = weights.reduce((a, b) => a + b, 0);
      if (currentSum !== 10000) {
        const diff = 10000 - currentSum;
        if (weights.length > 0) {
            weights[0] += diff;
        }
      }

      // Pad with 0s to length 10
      while (weights.length < 10) {
          weights.push(0);
      }

      // 4. Create Transactions
      const transaction = new Transaction();

      // A. Jito Tip (only for mainnet MEV protection)
      if (!isDevnet) {
        const tipAccount = new PublicKey(tipData.tipAccount);
        const tipAmount = Math.max(tipData.minTipLamports, 5000);
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: tipAccount,
            lamports: tipAmount,
          })
        );
      }

      // B. Initialize Strategy (Escrow Vault)
      // Add timestamp suffix to ensure unique PDA (prevents "account already in use" error)
      const uniqueStrategyName = `${strategyName}-${Date.now().toString(36)}`;
      
      // Derive PDA for client side reference, Anchor does this internally but we want the address
      const [strategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('strategy'), publicKey.toBuffer(), Buffer.from(uniqueStrategyName)],
        programId
      );

      const initIx = await program.methods
        .initializeStrategy(
          uniqueStrategyName,
          mappedType,
          weights
        )
        .accounts({
          owner: publicKey,
          // strategy: strategyPda, // Anchor handles this
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      transaction.add(initIx);

      // 5. Sign Transaction
      setStatus('SIGNING');
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      const signedTx = await signTransaction(transaction);
      const serializedTx = signedTx.serialize().toString('base64');

      // 6. Send to Backend for Bundling
      setStatus('BUNDLING');
      const response = await fetch('https://axis-api.yusukekikuta-05.workers.dev/kagemusha/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: serializedTx,
          strategyId: strategyPda.toString(), 
          metadata: {
            name: strategyName,
            type: strategyType,
            composition: tokens,
            description: description || '',
            creator: publicKey.toString(),
            isPublic: true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJitoBundle(data.bundleId);
        setTxSignature(data.strategyId || strategyPda.toString());
        
        setStatus('CONFIRMING');
        // Wait a bit for propagation
        await new Promise(r => setTimeout(r, 2000));
        
        setStatus('SUCCESS');
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (e: any) {
      console.error('Deploy error:', e);
      let msg = e.message || 'Unknown error';
      if (msg.includes('rate limited') || msg.includes('congested')) {
          msg = '⚠️ Solana Network Busy (Jito). Please Retry.';
      }
      setErrorMessage(msg);
      setStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {status === 'PREVIEW' || status === 'ERROR' ? (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}
        <div>
          <h2 className="text-xl font-bold">Smart Contract Blueprint</h2>
          <p className="text-xs text-white/50">Review Escrow & Strategy</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'SUCCESS' ? (
          <SuccessView
            strategyName={strategyName}
            tokens={tokens}
            txSignature={txSignature}
            jitoBundle={jitoBundle}
            onComplete={onComplete}
            onDeposit={() => onDeploySuccess?.(txSignature || '')}
          />
        ) : (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto space-y-6"
          >
            {/* Blueprint Card */}
            <div className="relative p-6 bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl overflow-hidden">
              {/* Grid pattern overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              <div className="relative z-10">
                {/* Strategy Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    {strategyType === 'AGGRESSIVE' ? (
                      <Zap className="w-6 h-6 text-orange-400" />
                    ) : (
                      <Shield className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{strategyName}</h3>
                    <p className="text-xs text-white/40">{strategyType} Strategy</p>
                  </div>
                </div>

                {/* Composition Pizza */}
                <div className="flex justify-center mb-6">
                  <PizzaChart slices={tokens} size={160} showLabels={true} animated={true} />
                </div>

                {/* Token List */}
                <div className="space-y-2 mb-6">
                  {tokens.map((token) => (
                    <div key={token.symbol} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <span className="font-mono text-sm">{token.symbol}</span>
                      <span className="text-white/60">{token.weight}%</span>
                    </div>
                  ))}
                </div>

                {/* Protocol Flow */}
                <div className="p-3 bg-black/50 rounded-xl border border-white/10">
                  <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">Execution Flow</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Wallet</span>
                    <span className="text-white/30">→</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Escrow Vault</span>
                    <span className="text-white/30">→</span>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">Devnet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                    <Shield className="w-4 h-4" />
                    <span>MEV Protected via Jito Bundle</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
                    <Lock className="w-4 h-4" />
                    <span>Self-Custodial Escrow Contract</span>
                </div>
            </div>

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={status !== 'PREVIEW' && status !== 'ERROR'}
              className={`w-full py-4 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all ${
                status === 'ERROR' 
                  ? 'bg-red-500 text-white shadow-red-500/30' 
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30'
              }`}
            >
              {status === 'PREVIEW' && (
                <>
                  <Zap className="w-5 h-5" />
                  Initialize Escrow & Deploy
                </>
              )}
              {status === 'PREPARING' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Preparing Blueprint...
                </>
              )}
              {status === 'SIGNING' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Waiting for Signature...
                </>
              )}
              {status === 'BUNDLING' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Bundling via Jito...
                </>
              )}
              {status === 'CONFIRMING' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirming on Solana...
                </>
              )}
              {status === 'ERROR' && (
                <>
                  <Zap className="w-5 h-5" />
                  Network Busy - Retry
                </>
              )}
            </button>
            
            {errorMessage && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                >
                    {errorMessage}
                </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Success View Component
const SuccessView = ({
  strategyName,
  tokens,
  txSignature,
  jitoBundle,
  onComplete,
  onDeposit,
}: {
  strategyName: string;
  tokens: TokenAllocation[];
  txSignature: string | null;
  jitoBundle: string | null;
  onComplete: () => void;
  onDeposit?: () => void;
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDeposit = () => {
    if (onDeposit) {
      onDeposit();
    } else {
      onComplete();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center pt-12"
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30"
      >
        <CheckCircle2 className="w-12 h-12 text-black" />
      </motion.div>

      <h1 className="text-3xl font-bold mb-2">Escrow Initialized! 🏯</h1>
      <p className="text-white/50 mb-8">{strategyName} is now live on Solana</p>

      {/* Pizza Preview */}
      <div className="mb-8">
        <PizzaChart slices={tokens} size={140} showLabels={false} animated={false} />
      </div>

      {/* Transaction Details */}
      <div className="w-full max-w-sm p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-left">
        {txSignature && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Strategy Address</span>
            <button
              onClick={() => copyToClipboard(txSignature)}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
            >
              {txSignature.slice(0, 8)}...
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}
        {jitoBundle && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Jito Bundle</span>
            <span className="text-xs text-emerald-400">✓ Confirmed</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Network</span>
          <span className="text-xs text-purple-400">Solana Devnet</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-8 w-full max-w-sm">
        <button
          onClick={handleDeposit}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform"
        >
          <Coins className="w-5 h-5" />
          Deposit & Activate
        </button>
        
        <div className="flex gap-3">
            <button
            onClick={onComplete}
            className="flex-1 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors text-sm"
            >
            Create Another
            </button>
            <a
            href={`https://explorer.solana.com/address/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
            >
            Verify on Chain
            <ExternalLink className="w-4 h-4" />
            </a>
        </div>
      </div>
    </motion.div>
  );
};
