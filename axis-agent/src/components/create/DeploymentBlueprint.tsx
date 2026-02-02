
  import { useState } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { FileText, ShieldCheck, Wallet, ArrowRight, Info, X, Loader2 } from 'lucide-react';
  import { useConnection } from '@solana/wallet-adapter-react';
  import { useWallet } from '../../hooks/useWallet';
  import { KagemushaService } from '../../services/kagemusha';
  import { useToast } from '../../context/ToastContext';
  import { api } from '../../services/api';
  
  interface DeploymentBlueprintProps {
    strategyName: string;
    strategyType: string;
    // ★修正: address/mint を受け取れるように変更
    tokens: { symbol: string; weight: number; logoURI?: string; address?: string; mint?: string }[];
    description: string;
    
    settings?: {
      swapFee: number;
      automationEnabled: boolean;
      triggerType: string;
      deviationThreshold: number;
      timeInterval: number;
    };
    info?: {
      symbol: string;
      imagePreview?: string;
    };
  
    onBack: () => void;
    onComplete: () => void;
    onDeploySuccess?: (address: string, amount: number, asset: 'SOL' | 'USDC') => void;
  }
  
  export const DeploymentBlueprint = ({ 
    strategyName, 
    strategyType, 
    tokens, 
    description, // settings内のconfigではなくpropsのdescriptionを使う
    settings,
    info,
    onBack, 
    onComplete,
    onDeploySuccess 
  }: DeploymentBlueprintProps) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { showToast } = useToast();
  
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositAsset, setDepositAsset] = useState<'SOL' | 'USDC'>('SOL');
    const [isDeploying, setIsDeploying] = useState(false);
  
    const handleInitialDeployClick = () => {
      setIsDepositModalOpen(true);
    };
  
    const handleConfirmDeploy = async () => {
      if (!depositAmount) return;
      if (!wallet.publicKey) {
          showToast("Wallet not connected", "error");
          return;
      }
  
      setIsDeploying(true);
  
      try {
          // 1. デプロイ (Strategy作成)
          showToast("🚀 Creating Strategy on-chain...", "info");
          
          const { signature: deploySig, strategyPubkey } = await KagemushaService.initializeStrategy(
              connection,
              wallet,
              {
                  name: strategyName,
                  strategyType: 2, 
                  tokens: tokens.map(t => ({ symbol: t.symbol, weight: t.weight }))
              }
          );
  
          console.log("Deployed:", strategyPubkey.toString());
  
          // 2. 入金 (Deposit SOL)
          const amount = parseFloat(depositAmount);
          if (amount > 0 && depositAsset === 'SOL') {
               showToast(`💰 Depositing ${amount} SOL...`, "info");
               await KagemushaService.depositSol(
                   connection,
                   wallet,
                   strategyPubkey,
                   amount
               );
          }
  
          // 3. バックエンドへ登録 (DB保存)
          // ★修正: tokens の型不整合を解消 (mintプロパティを保証)
          const tokensForApi = tokens.map(t => ({
            symbol: t.symbol,
            weight: t.weight,
            mint: t.mint || t.address || '', // addressかmintを使う
            logoURI: t.logoURI
          }));
  
          await api.createStrategy({
              owner_pubkey: wallet.publicKey.toBase58(),
              name: strategyName,
              ticker: info?.symbol || 'ETF',
              description: description, // ★修正: config.description -> description
              type: 'BALANCED',
              tokens: tokensForApi,
              config: {
                  strategyPubkey: strategyPubkey.toString(),
                  txSignature: deploySig
              }
          });
  
          showToast("✅ Strategy Deployed & Funded!", "success");
          setIsDepositModalOpen(false);
  
          if (onDeploySuccess) {
              onDeploySuccess(strategyPubkey.toString(), amount, depositAsset);
          } else {
              onComplete();
          }
  
      } catch (e: any) {
          console.error("Deploy Error:", e);
          showToast(`Failed: ${e.message}`, "error");
      } finally {
          setIsDeploying(false);
      }
    };
  
    return (
      <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-[#E7E5E4] mb-2">Final Blueprint</h2>
          <p className="text-[#A8A29E]">Review your strategy specifications before on-chain deployment.</p>
        </div>
  
        {/* Receipt Card */}
        <div className="bg-[#E7E5E4] text-[#0C0A09] rounded-sm p-8 shadow-2xl relative overflow-hidden mb-8 font-serif">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />
          
          {/* Header Section */}
          <div className="relative border-b-2 border-[#0C0A09] pb-6 mb-6 flex justify-between items-start">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 border-2 border-[#0C0A09] flex items-center justify-center bg-white overflow-hidden">
                 {info?.imagePreview ? (
                   <img src={info.imagePreview} alt="Logo" className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-2xl font-bold">{strategyName[0]}</span>
                 )}
               </div>
               <div>
                 <h1 className="text-3xl font-bold uppercase tracking-wide">{strategyName}</h1>
                 <div className="flex items-center gap-2 mt-1">
                   <span className="px-2 py-0.5 border border-[#0C0A09] text-xs font-bold bg-[#0C0A09] text-[#E7E5E4]">{info?.symbol || 'ETF'}</span>
                   <span className="text-sm font-mono text-[#0C0A09]/70">TYPE: {strategyType}</span>
                 </div>
               </div>
            </div>
            <div className="text-right">
               <div className="text-xs uppercase tracking-widest mb-1 text-[#0C0A09]/60">Created Via</div>
               <div className="font-bold text-xl">AXIS PROTOCOL</div>
            </div>
          </div>
  
          {/* Content Grid */}
          <div className="relative grid md:grid-cols-2 gap-8 mb-8">
             {/* Left: Composition */}
             <div>
               <h4 className="text-xs font-bold uppercase tracking-widest border-b border-[#0C0A09]/20 pb-2 mb-3 flex items-center gap-2">
                 <FileText className="w-3 h-3" /> Composition
               </h4>
               <ul className="space-y-2">
                 {tokens.map((t, i) => (
                   <li key={i} className="flex justify-between items-center text-sm">
                     <span className="font-bold flex items-center gap-2">
                       {t.symbol}
                     </span>
                     <span className="font-mono">{t.weight}%</span>
                   </li>
                 ))}
               </ul>
             </div>
  
             {/* Right: Parameters */}
             <div>
               <h4 className="text-xs font-bold uppercase tracking-widest border-b border-[#0C0A09]/20 pb-2 mb-3 flex items-center gap-2">
                 <ShieldCheck className="w-3 h-3" /> Parameters
               </h4>
               <ul className="space-y-3 text-sm">
                 <li className="flex justify-between">
                   <span className="text-[#0C0A09]/70">Swap Fee</span>
                   <span className="font-bold">{settings?.swapFee || 0.3}%</span>
                 </li>
                 <li className="flex justify-between">
                   <span className="text-[#0C0A09]/70">Auto-Rebalance</span>
                   <span className="font-bold">{settings?.automationEnabled ? 'Active' : 'Disabled'}</span>
                 </li>
               </ul>
             </div>
          </div>
  
          {/* Footer */}
          <div className="relative pt-6 border-t-2 border-[#0C0A09] flex justify-between items-end">
             <div className="text-xs max-w-xs text-[#0C0A09]/60">
               * Smart contract ownership will be transferred to your wallet upon deployment.
             </div>
             <div className="font-mono text-2xl font-bold tracking-tighter">
               SIGNATURE REQUIRED
             </div>
          </div>
        </div>
  
        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={isDeploying}
            className="px-8 py-4 bg-[#1C1917] rounded-xl font-bold text-[#78716C] hover:text-[#E7E5E4] transition-colors disabled:opacity-50"
          >
            Modify
          </button>
          <button
            onClick={handleInitialDeployClick}
            disabled={isDeploying}
            className="flex-1 py-4 bg-gradient-to-r from-[#D97706] to-[#B45309] text-[#0C0A09] font-bold rounded-xl shadow-[0_0_30px_rgba(217,119,6,0.2)] hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5" />
            Set Liquidity & Deploy
          </button>
        </div>
  
        {/* --- Initial Deposit Modal --- */}
        <AnimatePresence>
          {isDepositModalOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !isDeploying && setIsDepositModalOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1C1917] border border-[#D97706]/20 rounded-3xl p-6 z-50 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-serif font-bold text-[#E7E5E4]">Initial Liquidity</h3>
                  <button onClick={() => setIsDepositModalOpen(false)} disabled={isDeploying}><X className="w-5 h-5 text-[#78716C]" /></button>
                </div>
  
                <div className="p-4 bg-[#D97706]/10 rounded-xl border border-[#D97706]/20 mb-6 flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#D97706]">
                    This amount will be used to mint the initial LP tokens and deploy the strategy on-chain.
                  </p>
                </div>
  
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-xs text-[#78716C] mb-1 block">Amount</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        disabled={isDeploying}
                        className="w-full p-4 bg-[#0C0A09] border border-[#D97706]/20 rounded-xl text-xl font-bold text-[#E7E5E4] focus:outline-none focus:border-[#D97706]"
                        autoFocus
                      />
                      <div className="absolute right-2 top-2 bottom-2 bg-[#1C1917] rounded-lg p-1 flex border border-[#white]/10">
                        <button 
                          onClick={() => setDepositAsset('SOL')}
                          className={`px-3 rounded-md text-xs font-bold transition-colors ${depositAsset === 'SOL' ? 'bg-[#D97706] text-[#0C0A09]' : 'text-[#78716C]'}`}
                        >
                          SOL
                        </button>
                        <button 
                          disabled
                          className="px-3 rounded-md text-xs font-bold transition-colors text-[#78716C]/50 cursor-not-allowed"
                        >
                          USDC
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
  
                <button
                  onClick={handleConfirmDeploy}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDeploying}
                  className="w-full py-4 bg-[#E7E5E4] text-[#0C0A09] font-bold rounded-xl disabled:opacity-50 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
                >
                  {isDeploying ? (
                      <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                  ) : (
                      <>
                          Proceed to Signature <ArrowRight className="w-4 h-4" />
                      </>
                  )}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };
  