/**
 * DepositFlow - Deposit funds into a deployed strategy
 * Shows strategy details and allows SOL/token deposits
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, ArrowLeft, Wallet, TrendingUp, Shield, 
  Loader2, CheckCircle2, AlertCircle, ExternalLink, ArrowRight
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { PizzaChart } from '../common/PizzaChart';

interface TokenAllocation {
  symbol: string;
  weight: number;
}

interface DepositFlowProps {
  strategyAddress: string;
  strategyName: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: TokenAllocation[];
  onBack: () => void;
  onComplete: () => void;
}

type DepositStatus = 'INPUT' | 'CONFIRMING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

// Quick deposit presets in SOL
const QUICK_AMOUNTS = [0.1, 0.5, 1, 5];

export const DepositFlow = ({
  strategyAddress,
  strategyName,
  strategyType,
  tokens,
  onBack,
  onComplete,
}: DepositFlowProps) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [amount, setAmount] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [status, setStatus] = useState<DepositStatus>('INPUT');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch user's SOL balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return;
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error('Failed to fetch balance:', e);
      }
    };
    fetchBalance();
  }, [publicKey, connection]);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= balance;

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction || !isValidAmount) return;

    setStatus('CONFIRMING');
    setErrorMessage(null);

    try {
      // For devnet demo: Simple SOL transfer to strategy vault
      // In production, this would use the proper deposit instruction with SPL tokens
      const lamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);
      const strategyPubkey = new PublicKey(strategyAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: strategyPubkey,
          lamports,
        })
      );

      setStatus('PROCESSING');
      
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      setTxSignature(signature);
      setStatus('SUCCESS');
    } catch (e: any) {
      console.error('Deposit error:', e);
      setErrorMessage(e.message || 'Deposit failed');
      setStatus('ERROR');
    }
  };

  const handleRetry = () => {
    setStatus('INPUT');
    setErrorMessage(null);
  };

  const strategyTypeColors = {
    AGGRESSIVE: 'from-orange-500 to-red-500',
    BALANCED: 'from-blue-500 to-purple-500',
    CONSERVATIVE: 'from-emerald-500 to-teal-500',
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Deposit Funds</h2>
          <p className="text-xs text-white/50">Fund your strategy vault</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'SUCCESS' ? (
          <DepositSuccess 
            amount={parsedAmount}
            txSignature={txSignature}
            strategyName={strategyName}
            onComplete={onComplete}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto space-y-6"
          >
            {/* Strategy Summary Card */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${strategyTypeColors[strategyType]} bg-opacity-20 border border-white/10`}>
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <PizzaChart slices={tokens} size={80} showLabels={false} animated={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{strategyName}</h3>
                  <p className="text-xs text-white/60">{strategyType} Strategy</p>
                  <div className="flex gap-2 mt-2">
                    {tokens.slice(0, 3).map((t) => (
                      <span key={t.symbol} className="text-xs px-2 py-0.5 bg-black/30 rounded">
                        {t.symbol}
                      </span>
                    ))}
                    {tokens.length > 3 && (
                      <span className="text-xs text-white/40">+{tokens.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Display */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-white/50" />
                <span className="text-sm text-white/50">Available Balance</span>
              </div>
              <span className="font-mono font-bold">{balance.toFixed(4)} SOL</span>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 pr-20 text-3xl font-bold bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-orange-500/50 transition-colors"
                  disabled={status !== 'INPUT' && status !== 'ERROR'}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-lg font-bold text-white/50">SOL</span>
                  <button
                    onClick={() => setAmount(balance.toFixed(4))}
                    className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    disabled={quickAmount > balance}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      quickAmount > balance
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white/70'
                    }`}
                  >
                    {quickAmount} SOL
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit Preview */}
            {parsedAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-white/5 rounded-xl space-y-2"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Deposit Amount</span>
                  <span className="font-mono">{parsedAmount} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Network Fee (est.)</span>
                  <span className="font-mono text-white/70">~0.000005 SOL</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-white/50">Total</span>
                  <span className="font-mono font-bold">{(parsedAmount + 0.000005).toFixed(6)} SOL</span>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{errorMessage}</p>
              </motion.div>
            )}

            {/* Deposit Button */}
            <button
              onClick={status === 'ERROR' ? handleRetry : handleDeposit}
              disabled={!isValidAmount || (status !== 'INPUT' && status !== 'ERROR')}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                status === 'ERROR'
                  ? 'bg-red-500 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black'
              }`}
            >
              {status === 'INPUT' && (
                <>
                  <Coins className="w-5 h-5" />
                  Deposit {parsedAmount > 0 ? `${parsedAmount} SOL` : ''}
                </>
              )}
              {status === 'CONFIRMING' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Waiting for Signature...
                </>
              )}
              {status === 'PROCESSING' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Deposit...
                </>
              )}
              {status === 'ERROR' && (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Retry Deposit
                </>
              )}
            </button>

            {/* Security Note */}
            <div className="flex items-center justify-center gap-2 text-xs text-white/40">
              <Shield className="w-4 h-4" />
              <span>Self-custodial escrow on Solana</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Success View Component
const DepositSuccess = ({
  amount,
  txSignature,
  strategyName,
  onComplete,
}: {
  amount: number;
  txSignature: string | null;
  strategyName: string;
  onComplete: () => void;
}) => {
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

      <h1 className="text-3xl font-bold mb-2">Deposit Complete! 💰</h1>
      <p className="text-white/50 mb-8">
        {amount} SOL deposited to {strategyName}
      </p>

      {/* Transaction Details */}
      <div className="w-full max-w-sm p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 text-left mb-8">
        {txSignature && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Transaction</span>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
            >
              {txSignature.slice(0, 8)}...
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Amount</span>
          <span className="text-xs font-mono text-emerald-400">{amount} SOL</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">Status</span>
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={onComplete}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
        >
          <TrendingUp className="w-5 h-5" />
          View Strategy Dashboard
        </button>
        
        <button
          onClick={onComplete}
          className="w-full py-3 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors text-sm"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
};
