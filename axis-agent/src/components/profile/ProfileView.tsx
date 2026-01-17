import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, LogOut, Loader2, TrendingUp, TrendingDown, ArrowDownLeft, Copy, ExternalLink, Edit, User } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getUserStrategies, type OnChainStrategy } from '../../services/kagemusha';
import { RedeemModal } from './RedeemModal';
import { ProfileEditModal } from './ProfileEditModal';
import { PizzaChart } from '../common/PizzaChart';
import { StrategyDetailModal } from '../common/StrategyDetailModal';
import { api } from '../../services/api';

interface ProfileViewProps {
  isConnected: boolean;
  shortAddress: string | null;
  balance: number | null;
  publicKey: PublicKey | null;
  onDisconnect: () => void;
}

export const ProfileView = ({ isConnected, shortAddress, balance, publicKey, onDisconnect }: ProfileViewProps) => {
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [strategies, setStrategies] = useState<OnChainStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals State
  const [redeemStrategy, setRedeemStrategy] = useState<OnChainStrategy | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<OnChainStrategy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<{
    username?: string;
    bio?: string;
    pfpUrl?: string;
  }>({});

  const loadStrategies = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    try {
      const data = await getUserStrategies(connection, publicKey);
      setStrategies(data);
    } catch (e) {
      console.error('Failed to load user strategies:', e);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (isConnected && publicKey) {
      loadStrategies();
      // Load user profile
      api.getUser(publicKey.toString()).then(profile => {
        if (profile && !profile.error) {
          setUserProfile({
            username: profile.username,
            bio: profile.bio,
            pfpUrl: profile.pfpUrl,
          });
        }
      });
    }
  }, [isConnected, publicKey, loadStrategies]);

  const copyAddress = () => {
    if (shortAddress) navigator.clipboard.writeText(publicKey?.toString() || '');
  };

  // Convert OnChainStrategy to StrategyDetail format
  const getStrategyDetail = (s: OnChainStrategy) => ({
    id: s.address, // Use address as ID for detail view
    address: s.address,
    ownerPubkey: s.owner,
    name: s.name,
    type: s.strategyType,
    tokens: s.tokens,
    tvl: s.tvl,
    pnl: s.pnlPercent
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {/* ... (keep existing disconnected view) */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-6 border border-orange-500/30"
        >
          <Wallet className="w-12 h-12 text-orange-400" />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-white/50 text-sm mb-8 max-w-xs mx-auto">
          Connect to Solana Devnet to view your portfolio and manage your strategies
        </p>

        <button
          onClick={() => setVisible(true)}
          className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all font-mono"
        >
          CONNECT WALLET
        </button>
      </div>
    );
  }

  const totalValue = strategies.reduce((sum, s) => sum + s.tvl, 0);

  return (
    <div className="max-w-md mx-auto pt-6 px-4 pb-32">
      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-start justify-between mb-6 relative z-10">
          <div className="flex items-center gap-4">
            {/* Clickable PFP */}
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="relative group"
            >
              {userProfile.pfpUrl ? (
                <img 
                  src={userProfile.pfpUrl} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 group-hover:border-orange-500/50 transition-colors"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <User className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <Edit className="w-3 h-3" />
              </div>
            </button>
            <div>
              {userProfile.username && (
                <h3 className="font-bold text-lg mb-0.5">{userProfile.username}</h3>
              )}
              <p className="text-xs text-white/50 mb-0.5">Total Balance</p>
              <h2 className="text-2xl font-bold font-mono tracking-tight">
                {balance !== null ? balance.toFixed(2) : '—'} <span className="text-sm text-white/40">SOL</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Bio */}
        {userProfile.bio && (
          <p className="text-sm text-white/60 mb-4 line-clamp-2">{userProfile.bio}</p>
        )}

        <div className="flex gap-2">
          <button 
            onClick={copyAddress}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-mono transition-colors"
          >
            <Copy className="w-3.5 h-3.5 opacity-50" />
            {shortAddress}
          </button>
          <button 
            onClick={onDisconnect}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-xs text-white/50 mb-1">Active Strategies</p>
          <p className="text-xl font-bold">{strategies.length}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-xs text-white/50 mb-1">Total TVL</p>
          <p className="text-xl font-bold flex items-baseline gap-1">
            {totalValue.toFixed(2)} <span className="text-xs text-white/30">SOL</span>
          </p>
        </div>
      </div>

      {/* Strategies List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">My Strategies</h3>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white/30" />}
        </div>

        {strategies.length === 0 && !isLoading ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
            <span className="text-4xl mb-3 block opacity-50">🕸️</span>
            <p className="text-white/50 text-sm">No active strategies found</p>
            <p className="text-xs text-white/30 mt-1">Deploy one from the Create tab</p>
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy, i) => (
              <motion.div
                key={strategy.address}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedStrategy(strategy)}
                className="p-5 bg-[#1a1a1a] border border-white/10 rounded-3xl cursor-pointer hover:border-white/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PizzaChart slices={strategy.tokens} size={48} showLabels={false} animated={false} />
                    <div>
                      <h4 className="font-bold group-hover:text-orange-400 transition-colors">{strategy.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className={`w-2 h-2 rounded-full ${strategy.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {strategy.strategyType}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono">{strategy.tvl.toFixed(2)} SOL</p>
                    <div className={`text-xs flex items-center justify-end gap-1 ${strategy.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {strategy.pnlPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {strategy.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a 
                    href={`https://explorer.solana.com/address/${strategy.address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    View on Explorer
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRedeemStrategy(strategy);
                    }}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-500/20"
                  >
                    Redeem
                    <ArrowDownLeft className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      {redeemStrategy && (
        <RedeemModal
          isOpen={!!redeemStrategy}
          onClose={() => setRedeemStrategy(null)}
          strategyAddress={redeemStrategy.address}
          strategyName={redeemStrategy.name}
          maxShares={100} 
          onSuccess={() => {
            loadStrategies();
            setRedeemStrategy(null);
          }}
        />
      )}

      {/* Strategy Detail Modal (with Deposit/Rebalance) */}
      <StrategyDetailModal
        isOpen={!!selectedStrategy}
        strategy={selectedStrategy ? getStrategyDetail(selectedStrategy) : null}
        onClose={() => setSelectedStrategy(null)}
        onSuccess={() => {
          loadStrategies();
          // Optionally keep modal open or refresh it
        }}
      />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        walletAddress={publicKey?.toString() || ''}
        currentProfile={userProfile}
        onSave={(data) => {
          setUserProfile({
            username: data.username,
            bio: data.bio,
            pfpUrl: data.pfpUrl,
          });
        }}
      />
    </div>
  );
};
