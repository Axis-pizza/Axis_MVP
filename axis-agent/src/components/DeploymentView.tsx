
import { motion } from 'framer-motion';
import { CheckCircle2, FileJson, Wallet, Database, Fingerprint } from 'lucide-react';
import { useTacticalStore } from '../store/useTacticalStore';
import { useState } from 'react';

export const DeploymentView = () => {
    const { selectedTactic, pizzaComposition } = useTacticalStore();
    const [status, setStatus] = useState<'INIT' | 'SIGNING' | 'DEPLOYING' | 'SUCCESS'>('INIT');
    
    const handleSign = () => {
        setStatus('SIGNING');
        setTimeout(() => setStatus('DEPLOYING'), 1500);
        setTimeout(() => setStatus('SUCCESS'), 4500);
    }

    if (status === 'SUCCESS') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
                 <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)]"
                 >
                     <CheckCircle2 className="w-12 h-12 text-black" />
                 </motion.div>
                 <h1 className="text-3xl font-bold mb-2">Operation Successful</h1>
                 <p className="text-white/50 mb-8">Strategy Vault KAGE-{selectedTactic?.id.substring(0,4).toUpperCase()} is live on Solana.</p>
                 <div className="p-4 bg-white/5 rounded-xl border border-white/10 font-mono text-xs w-full max-w-sm">
                     <div className="flex justify-between mb-2">
                         <span className="text-white/40">Network</span>
                         <span className="text-green-400">Mainnet-Beta</span>
                     </div>
                     <div className="flex justify-between mb-2">
                         <span className="text-white/40">Status</span>
                         <span className="text-green-400">Active / Monitoring</span>
                     </div>
                     <div className="flex justify-between">
                         <span className="text-white/40">Next Rebalance</span>
                         <span className="text-white">In 4 hours</span>
                     </div>
                 </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] p-6 pt-12 flex flex-col items-center">
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-md"
             >
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Deployment Blueprint</span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Blueprint Card */}
                <div className="bg-[#0a0a0a] border border-white/10 p-1 rounded-2xl mb-8 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-t-2xl" />
                    <div className="p-6 space-y-6">
                        {/* Flow Node 1 */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                                <Wallet className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">Treasury Source</h3>
                                <p className="text-xs text-white/40">Connected Wallet</p>
                            </div>
                        </div>

                        <div className="ml-5 h-8 w-px bg-white/10 border-l border-dashed border-white/30" />

                        {/* Flow Node 2 */}
                        <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/30">
                                <FileJson className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold">Strategy Config</h3>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {pizzaComposition.map(t => (
                                        <span key={t.symbol} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                                            {t.symbol} {t.weight}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                         <div className="ml-5 h-8 w-px bg-white/10 border-l border-dashed border-white/30" />

                         {/* Flow Node 3 */}
                         <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
                                <Database className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">On-Chain Vault</h3>
                                <p className="text-xs text-white/40">Program: Kagemusha_v1</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auth Button */}
                <button 
                    onClick={handleSign}
                    disabled={status !== 'INIT'}
                    className={`
                        w-full py-5 rounded-2xl font-bold tracking-wider text-sm uppercase flex items-center justify-center gap-3 transition-all relative overflow-hidden
                        ${status === 'INIT' ? 'bg-white text-black hover:scale-[1.02]' : 'bg-white/10 text-white/50 cursor-wait'}
                    `}
                >
                    {status === 'INIT' && <><Fingerprint className="w-5 h-5" /> Authorize Deployment</>}
                    {status === 'SIGNING' && "Verifying Signature..."}
                    {status === 'DEPLOYING' && "Broadcasting..."}
                    
                    {status === 'DEPLOYING' && (
                        <motion.div 
                            className="absolute bottom-0 left-0 h-1 bg-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3 }}
                        />
                    )}
                </button>
                
                <p className="text-center text-[10px] text-white/20 mt-6 max-w-xs mx-auto">
                    By signing, you agree to the protocol risks. This is a non-custodial strategy.
                </p>

             </motion.div>
        </div>
    );
};
