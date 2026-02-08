import { motion } from 'framer-motion';
import { Layers, Plus, Sparkles } from 'lucide-react';

interface CreateLandingProps {
  onCreate: () => void;
}

export const CreateLanding = ({ onCreate }: CreateLandingProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-32 relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-md w-full space-y-12 relative z-10 text-center">
            
            {/* Hero Text */}
            <div className="space-y-4">
               
                
                <motion.h1 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="text-6xl font-black text-white tracking-tighter leading-[0.9]"
                >
                    Your Idea.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
                        Your ETF.
                    </span>
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-white/40 text-lg font-medium max-w-xs mx-auto"
                >
                    Build, manage, and scale your on-chain index fund in seconds.
                </motion.p>
            </div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <button
                    onClick={onCreate}
                    className="group relative w-full max-w-xs mx-auto py-5 bg-white text-black rounded-2xl font-black text-xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        Create Your ETF <Plus strokeWidth={3} size={24} />
                    </span>
                    
                    {/* Hover Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shine" />
                </button>
                
                <p className="mt-4 text-xs text-white/20 font-mono">
                    No code required • Gas optimized
                </p>
            </motion.div>

        </div>
    </div>
  );
};