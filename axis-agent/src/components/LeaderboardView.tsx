
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

const MOCK_LEADERBOARD = [
    { rank: 1, name: "Solana Supercycle", creator: "Shogun_0x", roi: "+245%", tvl: "$1.2M", risk: "HIGH", strategy: "Sniper" },
    { rank: 2, name: "Stable Yields", creator: "DeFi_Dad", roi: "+18%", tvl: "$4.5M", risk: "LOW", strategy: "Fortress" },
    { rank: 3, name: "Jup Aggregator", creator: "Meow", roi: "+45%", tvl: "$890K", risk: "MED", strategy: "Wave" },
    { rank: 4, name: "Meme Index 10", creator: "Ansem", roi: "+120%", tvl: "$300K", risk: "HIGH", strategy: "Sniper" },
    { rank: 5, name: "Delta Neutral", creator: "0xDrift", roi: "+12%", tvl: "$2.1M", risk: "LOW", strategy: "Fortress" },
];

export const LeaderboardView = () => {
    return (
        <div className="flex flex-col h-full bg-[#050505] pt-12 px-6 safe-area-bottom pb-24">
             <div className="mb-8">
                 <h1 className="text-3xl font-bold mb-1">Vault Rankings</h1>
                 <p className="text-white/40 text-xs uppercase tracking-widest">Top Performing Strategies</p>
             </div>

             <div className="space-y-4 overflow-y-auto pr-2">
                 {MOCK_LEADERBOARD.map((vault, i) => (
                     <motion.div
                        key={vault.rank}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                     >
                         <div className="flex items-center gap-4">
                             <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                                ${vault.rank === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 
                                  vault.rank === 2 ? 'bg-gray-400/20 text-gray-400 border border-gray-400/30' : 
                                  vault.rank === 3 ? 'bg-orange-700/20 text-orange-700 border border-orange-700/30' : 'bg-white/5 text-white/30'}
                             `}>
                                 {vault.rank}
                             </div>
                             <div>
                                 <h3 className="font-bold text-sm">{vault.name}</h3>
                                 <div className="flex items-center gap-2 text-[10px] text-white/40">
                                     <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {vault.creator}</span>
                                     <span>•</span>
                                     <span className={`
                                         ${vault.strategy === 'Sniper' ? 'text-red-400' : 
                                           vault.strategy === 'Fortress' ? 'text-blue-400' : 'text-purple-400'}
                                     `}>{vault.strategy}</span>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="text-right">
                             <div className="text-green-400 font-mono font-bold">{vault.roi}</div>
                             <div className="text-[10px] text-white/30">TVL {vault.tvl}</div>
                         </div>
                     </motion.div>
                 ))}
             </div>
        </div>
    )
}
