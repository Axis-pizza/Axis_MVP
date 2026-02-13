import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { StrategyDetailView } from '../components/discover/StrategyDetailView';
import { getStrategyInfo } from '../services/kagemusha'; // On-chain fetch
import { api } from '../services/api'; // Fallback API
import { Loader2 } from 'lucide-react';

export const StrategyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { connection } = useConnection();
  
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Try fetching from On-Chain directly (if valid Pubkey)
        let fetchedData = null;
        let isRealChainData = false;

        try {
           const pubkey = new PublicKey(id);
           // On-Chain fetch attempt
           const info = await getStrategyInfo(connection, pubkey);
           if (info) {
             // Map On-Chain structure to UI structure
             fetchedData = {
               id: id,
               name: info.name || "Unknown Vault",
               type: 'BALANCED', // Default or derive from logic
               description: "A decentralized vault strategy on Solana.",
               tokens: info.tokens || [], // Ensure mapping is correct
               tvl: info.tvl || 0,
               roi: 0, // Will be calculated by DetailView
               creatorAddress: info.owner || "",
               createdAt: Date.now() / 1000 // Mock if not available
             };
             isRealChainData = true;
           }
        } catch (chainErr) {
           // Not a valid pubkey or not found on chain, ignore and try API
        }

        // 2. If not found on chain, try API Cache (Discover list)
        if (!fetchedData) {
           const strategies = await api.discoverStrategies(100);
           const found = strategies.strategies.find((s: any) => s.id === id);
           if (found) {
             fetchedData = found;
           }
        }

        if (fetchedData) {
          setStrategy(fetchedData);
        } else {
          setError("Strategy not found.");
        }

      } catch {
        setError("Failed to load strategy.");
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [id, connection]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#080503] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#B8863F] animate-spin" />
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="w-full h-screen bg-[#080503] flex flex-col items-center justify-center text-white">
        <h2 className="text-xl font-bold mb-2">Strategy Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-[#B8863F] underline">Go Back</button>
      </div>
    );
  }

  return (
    <StrategyDetailView 
      initialData={strategy} 
      onBack={() => navigate(-1)} 
    />
  );
};