import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { JupiterService, WalletService, type JupiterToken } from '../services/jupiter';
import { fetchPredictionTokens, fetchStockTokens, fetchCommodityTokens } from '../services/dflow';
import { toast } from 'sonner';
import type { StrategyConfig, AssetItem, ManualDashboardProps } from '../components/create/manual/types';

const POPULAR_SYMBOLS = ['SOL', 'USDC', 'USDT', 'JUP', 'JLP', 'BONK', 'WIF', 'TRUMP', 'ETH', 'JitoSOL'];

export const useManualDashboard = ({
  onDeploySuccess,
  initialConfig,
  initialTokens,
}: Pick<ManualDashboardProps, 'onDeploySuccess' | 'initialConfig' | 'initialTokens'>) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const [step, setStep] = useState<'builder' | 'identity'>('builder');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'all' | 'your_tokens' | 'trending' | 'meme' | 'prediction'>('all');
  
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]);
  // NOTE: displayTokens state definition removed to fix duplicate declaration error.
  
  // Data specific to tabs
  const [userTokens, setUserTokens] = useState<JupiterToken[]>([]);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());

  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [config, setConfig] = useState<StrategyConfig>({
    name: initialConfig?.name || '',
    ticker: initialConfig?.ticker || '',
    description: initialConfig?.description || '',
  });

  const [focusedField, setFocusedField] = useState<'ticker' | 'name' | 'desc' | null>('ticker');
  const [flyingToken, setFlyingToken] = useState<{ token: JupiterToken; x: number; y: number } | null>(null);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'crypto' | 'stock' | 'commodity' | 'prediction'>('all');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Computed ---
  const totalWeight = useMemo(() => portfolio.reduce((sum, i) => sum + i.weight, 0), [portfolio]);
  const selectedIds = useMemo(() => new Set(portfolio.map(p => p.token.address)), [portfolio]);
  const hasSelection = portfolio.length > 0;
  const isValidAllocation = totalWeight === 100 && portfolio.length >= 2;

  const filterCounts = useMemo(() => ({
    crypto: allTokens.filter(t => !t.source || t.source === 'jupiter').length,
    stock: allTokens.filter(t => t.source === 'stock').length,
    commodity: allTokens.filter(t => t.source === 'commodity').length,
    prediction: allTokens.filter(t => t.source === 'dflow').length,
  }), [allTokens]);

  // --- Logic for displaying tokens based on Tabs & Filters ---
  const sortedVisibleTokens = useMemo(() => {
    let baseList = allTokens;

    // 1. Tab Filtering
    if (activeTab === 'your_tokens') {
        baseList = userTokens;
    } else if (activeTab === 'meme') {
        baseList = allTokens.filter(t => 
            t.tags.includes('meme') || 
            ['WIF', 'BONK', 'POPCAT', 'MEW', 'BOME', 'PNUT', 'MOG', 'TRUMP', 'MELANIA'].includes(t.symbol.toUpperCase())
        );
        if (trendingIds.size > 0) {
            baseList = [...baseList].sort((a, b) => (trendingIds.has(b.address) ? 1 : 0) - (trendingIds.has(a.address) ? 1 : 0));
        }
    } else if (activeTab === 'prediction') {
        baseList = allTokens.filter(t => t.source === 'dflow');
    } else if (activeTab === 'trending') {
        if (trendingIds.size > 0) {
            const trending = allTokens.filter(t => trendingIds.has(t.address));
            const others = allTokens.filter(t => !trendingIds.has(t.address) && t.isVerified).slice(0, 20);
            baseList = [...trending, ...others];
        } else {
            baseList = allTokens.filter(t => t.tags.includes('birdeye-trending') || (t.dailyVolume && t.dailyVolume > 1000000));
        }
    }

    // 2. Search Filter
    if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        baseList = baseList.filter(t => 
            t.symbol.toLowerCase().includes(lowerQ) || 
            t.name.toLowerCase().includes(lowerQ) ||
            t.address.toLowerCase() === lowerQ
        );
    }
    
    // 3. Category Filter (Allタブの時のみ有効)
    if (activeTab === 'all' && tokenFilter !== 'all') {
        if (tokenFilter === 'crypto') baseList = baseList.filter(t => !t.source || t.source === 'jupiter');
        else if (tokenFilter === 'stock') baseList = baseList.filter(t => t.source === 'stock');
        else if (tokenFilter === 'commodity') baseList = baseList.filter(t => t.source === 'commodity');
        else if (tokenFilter === 'prediction') baseList = baseList.filter(t => t.source === 'dflow');
    }

    return baseList.slice(0, 100);
  }, [allTokens, userTokens, activeTab, searchQuery, tokenFilter, trendingIds]);

  // エイリアスとして定義 (stateではない)
  const displayTokens = sortedVisibleTokens;

  // --- Effects ---

  // Init Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [list, predictionTokens, stockTokens, commodityTokens] = await Promise.all([
          JupiterService.getLiteList(),
          fetchPredictionTokens().catch(() => []),
          fetchStockTokens().catch(() => []),
          fetchCommodityTokens().catch(() => []),
        ]);

        const popular = POPULAR_SYMBOLS
          .map(sym => list.find(t => t.symbol === sym))
          .filter((t): t is JupiterToken => t !== undefined);
        const others = list.filter(t => !POPULAR_SYMBOLS.includes(t.symbol));

        const merged = [...popular, ...predictionTokens, ...stockTokens, ...commodityTokens, ...others];
        setAllTokens(merged);
        
        if (initialTokens) {
          const initialAssets: AssetItem[] = [];
          initialTokens.forEach(p => {
            const t = merged.find(x => x.symbol === p.symbol);
            if (t) initialAssets.push({ token: t, weight: p.weight, locked: true, id: t.address });
          });
          setPortfolio(initialAssets);
        }
      } catch (e) {
        console.error('Failed to load tokens:', e);
        toast.error('Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [initialTokens]);

  // Fetch User Tokens
  useEffect(() => {
    if (activeTab === 'your_tokens' && publicKey) {
      setIsLoading(true);
      WalletService.getUserTokens(connection, publicKey).then(tokens => {
          setUserTokens(tokens);
          setIsLoading(false);
      });
    }
  }, [activeTab, publicKey, connection]);

  // Fetch Trending
  useEffect(() => {
    if ((activeTab === 'trending' || activeTab === 'meme') && trendingIds.size === 0) {
       JupiterService.getTrendingTokens().then(ids => {
           if (ids.length > 0) setTrendingIds(new Set(ids));
       });
    }
  }, [activeTab, trendingIds.size]);

  // Search API (Fallback)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(false);
    }, 300);

    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  // Tab変更時にサブフィルタをリセット
  useEffect(() => {
    if (activeTab !== 'all') {
      setTokenFilter('all');
    }
  }, [activeTab]);

  // --- Handlers ---
  const handleToIdentity = useCallback(() => {
    triggerHaptic();
    setStep('identity');
    setFocusedField('ticker');
  }, []);

  const handleBackToBuilder = useCallback(() => {
    setStep('builder');
  }, []);

  const handleDeploy = useCallback(() => {
    triggerHaptic();
    if (!config.name || !config.ticker) {
      toast.error("Required Fields", { description: "Please enter a Name and Ticker." });
      return;
    }
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    const mappedTokens = portfolio.map(p => ({
      symbol: p.token.symbol,
      weight: p.weight,
      mint: p.token.address,
      logoURI: p.token.logoURI,
    }));
    onDeploySuccess({
      tokens: mappedTokens,
      config,
    });
  }, [config, connected, publicKey, setVisible, onDeploySuccess, portfolio]);

  const generateRandomTicker = useCallback(() => {
    triggerHaptic();
    const prefixes = ['MOON', 'CHAD', 'PEPE', 'SOL', 'DEGEN', 'ALPHA'];
    const suffix = Math.floor(Math.random() * 100);
    setConfig(prev => ({ ...prev, ticker: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffix}` }));
  }, []);

  const triggerAddAnimation = useCallback((token: JupiterToken, rect: DOMRect) => {
    triggerHaptic();
    if (portfolio.some(p => p.token.address === token.address)) return;
    setFlyingToken({ token, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [portfolio]);

  const handleAnimationComplete = useCallback(() => {
    if (!flyingToken) return;
    setPortfolio(prev => {
      const currentW = prev.reduce((s, i) => s + i.weight, 0);
      const nextW = Math.max(0, Math.min(100 - currentW, 50));
      return [...prev, { token: flyingToken.token, weight: nextW, locked: false, id: flyingToken.token.address }];
    });
    triggerHaptic();
    setFlyingToken(null);
    setSearchQuery('');
  }, [flyingToken]);

  const addTokenDirect = useCallback((token: JupiterToken) => {
    if (portfolio.some(p => p.token.address === token.address)) return;
    setPortfolio(prev => {
      const currentW = prev.reduce((s, i) => s + i.weight, 0);
      const nextW = Math.max(0, Math.min(100 - currentW, 50));
      return [...prev, { token, weight: nextW, locked: false, id: token.address }];
    });
    setSearchQuery('');
  }, [portfolio]);

  const removeToken = useCallback((address: string) => {
    triggerHaptic();
    setPortfolio(prev => prev.filter(p => p.token.address !== address));
  }, []);

  const updateWeight = useCallback((address: string, val: number) => {
    setPortfolio(prev => prev.map(p =>
      p.token.address === address ? { ...p, weight: val } : p
    ));
  }, []);

  const distributeEvenly = useCallback(() => {
    triggerHaptic();
    if (portfolio.length === 0) return;
    const evenWeight = Math.floor(100 / portfolio.length);
    const remainder = 100 - (evenWeight * portfolio.length);
    setPortfolio(prev => prev.map((p, i) => ({
      ...p,
      weight: evenWeight + (i === 0 ? remainder : 0),
    })));
  }, [portfolio.length]);

  return {
    step, setStep,
    allTokens, displayTokens,
    portfolio, searchQuery, setSearchQuery,
    isSearching, isLoading,
    config, setConfig,
    focusedField, setFocusedField,
    flyingToken,
    activeTab, setActiveTab,
    totalWeight, selectedIds, hasSelection, isValidAllocation,
    sortedVisibleTokens, filterCounts,
    tokenFilter, setTokenFilter,
    connected,
    handleToIdentity, handleBackToBuilder, handleDeploy,
    generateRandomTicker, triggerAddAnimation, handleAnimationComplete,
    addTokenDirect, removeToken, updateWeight, distributeEvenly, triggerHaptic,
  };
};

export type ManualDashboardHook = ReturnType<typeof useManualDashboard>;