import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';

interface CreateLandingProps {
  onCreate: () => void;
  isLoading?: boolean;
}

export const CreateLanding = ({ onCreate, isLoading }: CreateLandingProps) => {
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
  className="flex justify-center"
>
  <button
    onClick={onCreate}
    disabled={isLoading}
    className="group relative w-full max-w-xs transition-all duration-200 active:scale-95 disabled:opacity-70"
  >
    {/* 1. 最背面：周囲に広がる柔らかな光（グロー効果） */}
    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-amber-300/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    {/* 2. ボタンの「厚み」と「接地面の影」 */}
    <div className="absolute inset-0 translate-y-[6px] rounded-2xl bg-neutral-400 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_4px_8px_rgba(0,0,0,0.3)] transition-transform duration-200 group-active:translate-y-[2px]" />

    {/* 3. ボタンの「表面」 */}
    <div className="relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-b from-white via-neutral-50 to-neutral-200 px-8 py-5 text-black transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-[2px]">
      
      {/* 4. 内側のハイライト（ベベル：面取り効果） */}
      <div className="absolute inset-0 rounded-2xl border-t-2 border-white/80 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/5 pointer-events-none" />

      {/* テキストとアイコン */}
      <span className="relative z-10 flex items-center gap-3 font-black text-xl tracking-tight text-neutral-800">
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            Create Your ETF
            <div className="flex items-center justify-center w-7 h-7 bg-neutral-900 rounded-full text-white shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              <Plus strokeWidth={4} size={18} />
            </div>
          </>
        )}
      </span>

      {/* 5. 表面を走る高級感のある光沢（アニメーション） */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:animate-[shine_1.2s_ease-in-out_infinite]" />
    </div>
  </button>
</motion.div>
        </div>
    </div>
  );
};