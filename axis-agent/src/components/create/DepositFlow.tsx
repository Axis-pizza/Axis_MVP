import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Wallet, TrendingUp, Shield, 
  Loader2, CheckCircle2, AlertCircle, ExternalLink, ArrowRight, 
  Sparkles, Lock
} from 'lucide-react';
import { useWallet, useConnection } from '../../hooks/useWallet';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { PizzaChart } from '../common/PizzaChart';
import { api } from '../../services/api';
import { Buffer } from 'buffer';

// ★修正: ここに mint と logoURI を追加して受け取れるようにする
interface TokenAllocation {
  symbol: string;
  weight: number;
  mint?: string;
  logoURI?: string;
}

interface DepositFlowProps {
  strategyAddress: string;
  strategyName: string;
  strategyType: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  tokens: TokenAllocation[];
  onBack: () => void;
  onComplete: () => void;
  initialAmount?: number;
}

type DepositStatus = 'INPUT' | 'CONFIRMING' | 'PROCESSING' | 'SAVING' | 'SUCCESS' | 'ERROR';

const QUICK_AMOUNTS = [0.5, 1.0, 5.0];

export const DepositFlow = ({
  strategyAddress,
  strategyName,
  strategyType,
  tokens,
  onBack,
  onComplete,
  initialAmount,
}: DepositFlowProps) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [amount, setAmount] = useState<string>(initialAmount ? initialAmount.toString() : '');
  const [balance, setBalance] = useState<number>(0);
  const [status, setStatus] = useState<DepositStatus>('INPUT');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      // --- 1. Solana Transaction ---
      const lamports = Math.floor(parsedAmount * LAMPORTS_PER_SOL);
      let strategyPubkey;
      try {
         strategyPubkey = new PublicKey(strategyAddress);
      } catch {
         strategyPubkey = new PublicKey("So11111111111111111111111111111111111111112");
      }

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
      const serializedTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(serializedTx);
      
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      setTxSignature(signature);
      
      // --- 2. API Saving ---
      setStatus('SAVING');

      const base64Tx = Buffer.from(serializedTx).toString('base64');

      const payload = {
        name: String(strategyName).trim(),
        description: `${strategyType} Strategy created by ${publicKey.toBase58().slice(0, 6)}...`, 
        type: strategyType,
        
        // ★修正: ここで mint と logoURI をバックエンドへ送る
        tokens: tokens.map(t => ({
          symbol: String(t.symbol),
          weight: Math.floor(Number(t.weight)),
          mint: t.mint || "So11111111111111111111111111111111111111112",
          logoURI: t.logoURI
        })),
        
        // composition も同様に
        composition: tokens.map(t => ({
          symbol: String(t.symbol),
          weight: Math.floor(Number(t.weight)),
          mint: t.mint || "So11111111111111111111111111111111111111112",
          logoURI: t.logoURI
        })),

        ownerPubkey: publicKey.toBase58(),
        creator: publicKey.toBase58(),
        tvl: Number(parsedAmount),
        initialInvestment: Number(parsedAmount),
        image: "", 
        signedTransaction: base64Tx 
      };

      console.log("🚀 Payload aligned for Discover:", JSON.stringify(payload, null, 2));

      try {
        await api.deploy(signature, payload);
      } catch (apiError: any) {
        console.error("🔥 API Error (Saving failed but tx successful):", apiError);
      }

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

  const getTypeColor = () => {
    switch (strategyType) {
      case 'AGGRESSIVE': return '#F97316';
      case 'BALANCED': return '#3B82F6';
      case 'CONSERVATIVE': return '#10B981';
      default: return '#D97706';
    }
  };
  const themeColor = getTypeColor();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div 
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ backgroundColor: themeColor }}
      />

      <div className="relative z-10 px-4 py-6 pb-32 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md border border-white/5">
            <ArrowLeft className="w-5 h-5 text-[#E7E5E4]" />
          </button>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
            <span className="text-xs font-bold tracking-wider text-[#E7E5E4]">{strategyType} MODE</span>
          </div>
          <div className="w-11" />
        </div>

        <AnimatePresence mode="wait">
          {status === 'SUCCESS' ? (
            <DepositSuccess 
              amount={parsedAmount}
              txSignature={txSignature}
              strategyName={strategyName}
              onComplete={onComplete}
              themeColor={themeColor}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center relative">
                <motion.div 
                  className="relative inline-block mb-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                >
                  <div className="relative z-10 p-2 bg-[#0C0A09] rounded-full border border-white/10 shadow-2xl">
                    <PizzaChart slices={tokens} size={140} showLabels={false} />
                  </div>
                  <div className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse" style={{ backgroundColor: themeColor }} />
                </motion.div>

                <h1 className="text-3xl font-serif font-bold text-[#E7E5E4] mb-2">{strategyName}</h1>
                <div className="flex flex-wrap justify-center gap-2">
                  {tokens.map(t => (
                    <span key={t.symbol} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-[#A8A29E] font-mono">
                      {t.symbol} {t.weight}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#1C1917]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4 text-xs">
                  <span className="text-[#78716C] flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Balance
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#E7E5E4] font-mono">{balance.toFixed(4)} SOL</span>
                    <button 
                      onClick={() => setAmount((balance - 0.01).toFixed(4))}
                      className="text-[#D97706] hover:text-[#fbbf24] font-bold transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="relative mb-6 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#D97706]/0 via-[#D97706]/10 to-[#D97706]/0 opacity-0 group-focus-within:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0C0A09] border border-white/10 rounded-2xl py-6 px-4 text-4xl font-bold text-center text-white focus:outline-none focus:border-[#D97706]/50 transition-all placeholder:text-[#292524]"
                    disabled={status !== 'INPUT' && status !== 'ERROR'}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="text-sm font-bold text-[#78716C]">SOL</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {QUICK_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-[#A8A29E] hover:text-[#E7E5E4] transition-all"
                    >
                      {val} SOL
                    </button>
                  ))}
                </div>

                {errorMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">{errorMessage}</span>
                  </motion.div>
                )}

                <button
                  onClick={status === 'ERROR' ? handleRetry : handleDeposit}
                  disabled={!isValidAmount || (status !== 'INPUT' && status !== 'ERROR')}
                  className="w-full py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] rounded-xl font-bold text-[#0C0A09] shadow-lg shadow-orange-900/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  {status === 'INPUT' && (
                    <>
                      <Lock className="w-4 h-4" /> Seed Liquidity
                    </>
                  )}
                  {(status === 'CONFIRMING' || status === 'PROCESSING' || status === 'SAVING') && (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> 
                      {status === 'CONFIRMING' ? 'Sign in Wallet...' : 'Processing...'}
                    </>
                  )}
                  {status === 'ERROR' && 'Retry Transaction'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const DepositSuccess = ({
  amount,
  txSignature,
  strategyName,
  onComplete,
  themeColor
}: {
  amount: number;
  txSignature: string | null;
  strategyName: string;
  onComplete: () => void;
  themeColor: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center pt-8"
    >
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20" />
        <div className="w-24 h-24 bg-[#1C1917] border-2 border-green-500 rounded-full flex items-center justify-center relative z-10 shadow-2xl">
          <Sparkles className="w-10 h-10 text-green-500" />
        </div>
        <motion.div 
          className="absolute -top-2 -right-2 bg-green-500 text-[#0C0A09] text-xs font-bold px-2 py-1 rounded-full border-4 border-[#030303]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          LIVE
        </motion.div>
      </div>

      <h1 className="text-4xl font-serif font-bold text-[#E7E5E4] mb-2">Strategy Live</h1>
      <p className="text-[#A8A29E] mb-8 max-w-xs mx-auto text-sm leading-relaxed">
        Your liquidity has been seeded. <br/>
        <span className="text-white font-bold">{strategyName}</span> is now active on-chain.
      </p>

      <div className="w-full bg-[#E7E5E4] text-[#0C0A09] rounded-lg p-6 mb-8 relative overflow-hidden font-mono text-xs">
        <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: themeColor }} />
        <div className="flex justify-between mb-2">
          <span className="opacity-60">INITIAL DEPOSIT</span>
          <span className="font-bold">{amount} SOL</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="opacity-60">STATUS</span>
          <span className="font-bold flex items-center gap-1 text-green-700">
            <CheckCircle2 className="w-3 h-3" /> CONFIRMED
          </span>
        </div>
        <div className="border-t border-[#0C0A09]/10 pt-3 text-center">
          {txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              VIEW ON EXPLORER <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-4 bg-[#1C1917] border border-white/10 rounded-xl font-bold text-[#E7E5E4] hover:bg-white/5 transition-all flex items-center justify-center gap-2"
      >
        <TrendingUp className="w-4 h-4" />
        Go to Dashboard
      </button>
    </motion.div>
  );
};