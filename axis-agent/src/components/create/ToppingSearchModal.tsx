import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { fetchSolanaTokens } from '../../services/coingecko';
import type { TokenInfo } from '../../types';

interface ToppingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  selectedIds: string[];
}

export const ToppingSearchModal = ({ isOpen, onClose, onSelect, selectedIds }: ToppingSearchModalProps) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && tokens.length === 0) {
      fetchSolanaTokens().then(data => {
        setTokens(data);
        setLoading(false);
      });
    }
  }, [isOpen, tokens.length]);

  const filteredTokens = tokens.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] max-w-lg mx-auto bg-[#1a1a1a] border border-white/10 rounded-3xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Custom Ingredient</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 bg-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search 250+ Solana tokens..."
                  className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : filteredTokens.length > 0 ? (
                filteredTokens.slice(0, 50).map(token => ( // Limit render to 50 for performance
                  <motion.div
                    key={token.address}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      onSelect(token);
                      onClose();
                    }}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${selectedIds.includes(token.address)
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                        {token.symbol[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{token.symbol}</p>
                      <p className="text-xs text-white/40">{token.name}</p>
                    </div>
                    {/* Price if available */}
                    {token.priceFormatted && (
                      <div className="ml-auto text-xs text-white/50 font-mono">
                        {token.priceFormatted}
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-white/30">
                  No tokens found
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
