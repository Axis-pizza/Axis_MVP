/**
 * Deployment Blueprint - Smart Contract visualization (Step 3)
 * Shows the "blueprint" of the deployed strategy
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, CheckCircle2, Loader2, ExternalLink, Copy, ArrowLeft } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { PizzaChart } from '../common/PizzaChart';

interface TokenAllocation {
  symbol: string;
  weight: number;
}

interface DeploymentBlueprintProps {
  strategyName: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: TokenAllocation[];
  onBack: () => void;
  onComplete: () => void;
}

type DeployStatus = 'PREVIEW' | 'SIGNING' | 'BUNDLING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR';

export const DeploymentBlueprint = ({
  strategyName,
  strategyType,
  tokens,
  onBack,
  onComplete,
}: DeploymentBlueprintProps) => {
  const { publicKeyString } = useWallet();
  const [status, setStatus] = useState<DeployStatus>('PREVIEW');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [jitoBundle, setJitoBundle] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!publicKeyString) return;

    setStatus('SIGNING');

    try {
      // Simulate signing delay
      await new Promise(r => setTimeout(r, 1500));
      setStatus('BUNDLING');

      // Call API to deploy via Jito
      const response = await fetch('https://axis-api.yusukekikuta-05.workers.dev/kagemusha/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: 'base64_placeholder', // In real impl, actual signed tx
          metadata: {
            name: strategyName,
            type: strategyType,
            composition: tokens,
            creator: publicKeyString,
          },
        }),
      });

      const data = await response.json();

      await new Promise(r => setTimeout(r, 1000));
      setStatus('CONFIRMING');

      await new Promise(r => setTimeout(r, 1500));

      if (data.success) {
        setJitoBundle(data.bundleId || 'simulated_bundle_id');
        setTxSignature(data.strategyId || 'simulated_tx_sig');
        setStatus('SUCCESS');
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (e) {
      console.error('Deploy error:', e);
      setStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {status === 'PREVIEW' && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-bold">Smart Contract Blueprint</h2>
          <p className="text-xs text-white/50">Review before deployment</p>
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
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded">Jito Bundle</span>
                    <span className="text-white/30">→</span>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">On-Chain</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MEV Protection Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>MEV Protected via Jito Bundle</span>
            </div>

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={status !== 'PREVIEW'}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-70"
            >
              {status === 'PREVIEW' && (
                <>
                  <Zap className="w-5 h-5" />
                  Sign & Deploy
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
                  <span className="text-white">Retry Deployment</span>
                </>
              )}
            </button>
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
}: {
  strategyName: string;
  tokens: TokenAllocation[];
  txSignature: string | null;
  jitoBundle: string | null;
  onComplete: () => void;
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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

      <h1 className="text-3xl font-bold mb-2">Pizza Deployed! 🍕</h1>
      <p className="text-white/50 mb-8">{strategyName} is now live on Solana Devnet</p>

      {/* Pizza Preview */}
      <div className="mb-8">
        <PizzaChart slices={tokens} size={140} showLabels={false} animated={false} />
      </div>

      {/* Transaction Details */}
      <div className="w-full max-w-sm p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-left">
        {txSignature && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Strategy ID</span>
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
      <div className="flex gap-3 mt-8">
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
        >
          Create Another
        </button>
        <a
          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-orange-500 text-black rounded-xl font-medium hover:bg-orange-400 transition-colors flex items-center gap-2"
        >
          View on Explorer
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </motion.div>
  );
};
