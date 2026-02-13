import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ShieldCheck, Wallet, ArrowRight, Info, X, Loader2 } from 'lucide-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useWallet } from '../../hooks/useWallet';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { SERVER_WALLET_PUBKEY } from '../../config/constants';
import { getOrCreateUsdcAta, createUsdcTransferIx } from '../../services/usdc';

interface DeploymentBlueprintProps {
  strategyName: string;
  strategyType: string;
  tokens: { symbol: string; weight: number; logoURI?: string; address?: string; mint?: string }[];
  description: string;
  settings?: any;
  info?: {
    symbol: string; 
    imagePreview?: string;
  };
  initialTvl?: number; 

  onBack: () => void;
  onComplete: () => void;
  onDeploySuccess?: (address: string, amount: number, asset: 'SOL' | 'USDC') => void;
}

export const DeploymentBlueprint = ({ 
  // ★ デフォルト値を徹底的に設定してクラッシュを防ぐ
  strategyName = 'Untitled Strategy', 
  strategyType = 'BALANCED',
  tokens = [], 
  description = '',
  settings = {},
  info = { symbol: 'TEMP' },
  initialTvl = 1.0,
  onBack, 
  onComplete,
  onDeploySuccess 
}: DeploymentBlueprintProps) => {
  if (!tokens) {
  }
  const { connection } = useConnection();
  const wallet = useWallet();
  const { showToast } = useToast();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(initialTvl ? initialTvl.toString() : "1.0");
  const [depositAsset, setDepositAsset] = useState<'SOL' | 'USDC'>('USDC');
  const [isDeploying, setIsDeploying] = useState(false);

  // 安全な表示用変数の作成
  const safeSymbol = info?.symbol || 'ETF';
  const safeSymbolChar = safeSymbol[0] || 'E';
  const safeTokens = Array.isArray(tokens) ? tokens : [];

  const handleInitialDeployClick = () => {
    setIsDepositModalOpen(true);
  };

  const handleConfirmDeploy = async () => {
    if (!depositAmount) return;
    if (!wallet.publicKey || !wallet.signTransaction) {
        showToast("Wallet not connected", "error");
        return;
    }

    setIsDeploying(true);

    try {
        const amountUsdc = parseFloat(depositAmount);

        // 1. USDC送金
        let txSignature = '';
        if (amountUsdc > 0) {
            showToast(`Sending ${amountUsdc} USDC to Vault...`, "info");
            const transaction = new Transaction();

            const { ata: fromAta, instruction: createFromIx } = await getOrCreateUsdcAta(connection, wallet.publicKey, wallet.publicKey);
            const { ata: toAta, instruction: createToIx } = await getOrCreateUsdcAta(connection, wallet.publicKey, SERVER_WALLET_PUBKEY);
            if (createFromIx) transaction.add(createFromIx);
            if (createToIx) transaction.add(createToIx);

            transaction.add(createUsdcTransferIx(fromAta, toAta, wallet.publicKey, amountUsdc));

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            const signedTx = await wallet.signTransaction(transaction);
            txSignature = await connection.sendRawTransaction(signedTx.serialize());
            showToast("Confirming Transaction...", "info");
            await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed');
        }

        // 2. APIコール
        showToast("🚀 Minting ETF Tokens...", "info");
        const strategyData = {
            ownerPubkey: wallet.publicKey.toBase58(),
            name: strategyName,
            ticker: safeSymbol,
            description: description,
            type: 'BALANCED',
            tokens: safeTokens.map(t => ({
                symbol: t.symbol,
                weight: t.weight,
                logoURI: t.logoURI
            })),
            tvl: amountUsdc
        };

        const result = await api.deploy(txSignature, strategyData);

        if (!result.success) throw new Error(result.error || "Deployment API failed");

        showToast(`✅ ${safeSymbol} Deployed Successfully!`, "success");
        setIsDepositModalOpen(false);
        setIsDeploying(false);

        // ナビゲーションは最後に（state更新完了後）
        if (onDeploySuccess) {
            onDeploySuccess(result.mintAddress || result.strategyId, amountUsdc, depositAsset);
        } else {
            onComplete();
        }

    } catch (e: any) {
        showToast(`Failed: ${e.message}`, "error");
        setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-8 duration-500 text-white">
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold text-[#F2E0C8] mb-2">This is Your ETF-Token</h2>
        <p className="text-[#B89860]">Review your ETF specifications.</p>
      </div>

      <div className="bg-gradient-to-b from-[#F2E0C8] to-[#D4A261] text-[#080503] rounded-sm p-8 shadow-2xl relative overflow-hidden mb-8 font-serif">
        <div className="relative border-b-2 border-[#080503] pb-6 mb-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 border-2 border-[#080503] flex items-center justify-center bg-white overflow-hidden">
             <img 
                  src='/ETFtoken.png' 
                  alt="Strategy Icon" 
                  className="w-full h-full object-cover" 
                />
             </div>
             <div>
               <h1 className="text-3xl font-bold uppercase tracking-wide">{strategyName}</h1>
               <div className="flex items-center gap-2 mt-1">
                 <span className="px-2 py-0.5 border border-[#080503] text-xs font-bold bg-[#080503] text-[#F2E0C8]">{safeSymbol}</span>
                 <span className="text-sm font-mono text-[#080503]/70">TYPE: {strategyType}</span>
               </div>
             </div>
          </div>
        </div>

        <div className="relative grid md:grid-cols-2 gap-8 mb-8">
           <div>
             <h4 className="text-xs font-bold uppercase tracking-widest border-b border-[#080503]/20 pb-2 mb-3 flex items-center gap-2">
               <FileText className="w-3 h-3" /> Composition
             </h4>
             <ul className="space-y-2">
               {safeTokens.length > 0 ? safeTokens.map((t, i) => (
                 <li key={i} className="flex justify-between items-center text-sm">
                   <span className="font-bold flex items-center gap-2">{t.symbol}</span>
                   <span className="font-mono">{t.weight}%</span>
                 </li>
               )) : <li className="text-sm italic opacity-50">No tokens selected</li>}
             </ul>
           </div>

           <div>
             <h4 className="text-xs font-bold uppercase tracking-widest border-b border-[#080503]/20 pb-2 mb-3 flex items-center gap-2">
               <ShieldCheck className="w-3 h-3" /> Parameters
             </h4>
             <ul className="space-y-3 text-sm">
               <li className="flex justify-between">
                 <span className="text-[#080503]/70">Ticker</span>
                 <span className="font-bold">${safeSymbol}</span>
               </li>
               <li className="flex justify-between">
                 <span className="text-[#080503]/70">Total Assets</span>
                 <span className="font-bold">{safeTokens.length}</span>
               </li>
             </ul>
           </div>
        </div>
      </div>

      <div className="flex gap-4 pb-20">
        <button onClick={onBack} disabled={isDeploying} className="px-8 py-4 bg-[#140E08] rounded-xl font-bold text-[#7A5A30] hover:text-[#F2E0C8]">
          Modify
        </button>
        <button onClick={handleInitialDeployClick} disabled={isDeploying} className="flex-1 py-4 bg-gradient-to-r from-[#6B4420] via-[#B8863F] to-[#E8C890] text-[#080503] font-bold rounded-xl flex items-center justify-center gap-2">
          <Wallet className="w-5 h-5" /> Deposit & Mint
        </button>
      </div>

      <AnimatePresence>
        {isDepositModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDepositModalOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#140E08] border border-[rgba(184,134,63,0.15)] rounded-3xl p-6 z-50 shadow-2xl">
              <h3 className="text-xl font-bold text-[#F2E0C8] mb-4">Initial Liquidity</h3>
              <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full p-4 bg-[#080503] border border-[rgba(184,134,63,0.15)] rounded-xl text-xl font-bold text-[#F2E0C8] mb-6" />
              <button onClick={handleConfirmDeploy} disabled={isDeploying} className="w-full py-4 bg-gradient-to-b from-[#F2E0C8] to-[#D4A261] text-[#080503] font-bold rounded-xl flex justify-center gap-2">
                {isDeploying ? <Loader2 className="animate-spin" /> : "Confirm & Mint"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};