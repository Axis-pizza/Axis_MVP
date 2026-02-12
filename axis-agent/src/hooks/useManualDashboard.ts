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
  
  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  }, []);

  const [step, setStep] = useState<'builder' | 'identity'>('builder');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'all' | 'your_tokens' | 'trending' | 'meme'>('all');
  
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]);
  
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
  const [flyingToken, setFlyingToken] = useState<JupiterToken | null>(null); // Type check fix
  const [flyingCoords, setFlyingCoords] = useState<{x: number, y: number} | null>(null);

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
    // 【修正】検索クエリがある場合は、タブに関係なく「全トークン」から検索する
    if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        // allTokens 全体から検索
        return allTokens.filter(t => 
            t.symbol.toLowerCase().includes(lowerQ) || 
            t.name.toLowerCase().includes(lowerQ) ||
            t.address.toLowerCase() === lowerQ
        ).slice(0, 100);
    }

    // --- 以下、検索クエリがない場合のタブごとの表示ロジック ---
    let baseList: JupiterToken[] = [];

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
    } else if (activeTab === 'trending') {
        if (trendingIds.size > 0) {
            const trending = allTokens.filter(t => trendingIds.has(t.address));
            const others = allTokens.filter(t => !trendingIds.has(t.address) && t.isVerified).slice(0, 20);
            baseList = [...trending, ...others];
        } else {
            baseList = allTokens.filter(t => t.tags.includes('birdeye-trending') || (t.dailyVolume && t.dailyVolume > 1000000));
        }
    } else {
        // 'all' tab
        baseList = allTokens;
    }

    // 2. Category Filter (Allタブかつ検索なしの時のみ有効)
    if (activeTab === 'all' && tokenFilter !== 'all') {
        if (tokenFilter === 'crypto') baseList = baseList.filter(t => !t.source || t.source === 'jupiter');
        else if (tokenFilter === 'stock') baseList = baseList.filter(t => t.source === 'stock');
        else if (tokenFilter === 'commodity') baseList = baseList.filter(t => t.source === 'commodity');
        else if (tokenFilter === 'prediction') baseList = baseList.filter(t => t.source === 'dflow');
    }

    return baseList.slice(0, 100);
  }, [allTokens, userTokens, activeTab, searchQuery, tokenFilter, trendingIds]);

  // エイリアス (互換性のため)
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

        // 人気トークンを上位に表示するための並び替え
        const popular = POPULAR_SYMBOLS
          .map(sym => list.find(t => t.symbol === sym))
          .filter((t): t is JupiterToken => t !== undefined);
        
        // 重複排除のためのSet
        const popularIds = new Set(popular.map(t => t.address));
        const others = list.filter(t => !popularIds.has(t.address));

        // 全トークンをマージ (Source情報を付与したトークンも含む)
        // Note: fetchXxxTokens で取得したトークンには既に source プロパティがついている前提
        const merged = [
            ...popular, 
            ...predictionTokens, 
            ...stockTokens, 
            ...commodityTokens, 
            ...others
        ];
        
        setAllTokens(merged);
        
        // 初期トークン設定 (もしあれば)
        if (initialTokens && initialTokens.length > 0) {
          const initialAssets: AssetItem[] = [];
          initialTokens.forEach(p => {
            const t = merged.find(x => x.symbol === p.symbol); // symbolマッチは少し危険だが簡易的
            if (t) {
                initialAssets.push({ 
                    token: t, 
                    weight: p.weight, 
                    locked: true, 
                    id: t.address 
                });
            }
          });
          // 重複排除してセット
          const uniqueAssets = Array.from(new Map(initialAssets.map(item => [item.token.address, item])).values());
          setPortfolio(uniqueAssets);
        }
      } catch (e) {
        console.error("Failed to load tokens:", e);
        toast.error('Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []); // initialTokens 依存を外して初回のみ実行にするのが一般的だが、要件による

  // Fetch User Tokens
  useEffect(() => {
    if (activeTab === 'your_tokens' && publicKey && connected) {
      setIsLoading(true);
      WalletService.getUserTokens(connection, publicKey)
        .then(tokens => {
            setUserTokens(tokens);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [activeTab, publicKey, connected, connection]);

  // Fetch Trending
  useEffect(() => {
    if ((activeTab === 'trending' || activeTab === 'meme') && trendingIds.size === 0) {
       JupiterService.getTrendingTokens().then(ids => {
           if (ids.length > 0) setTrendingIds(new Set(ids));
       });
    }
  }, [activeTab, trendingIds.size]);

  // Search Debounce (UI表示用)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
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
  }, [triggerHaptic]);

  const handleBackToBuilder = useCallback(() => {
    setStep('builder');
  }, []);

  const handleDeploy = useCallback(async () => {
    triggerHaptic();
    if (!config.name || !config.ticker) {
      toast.error("Required Fields", { description: "Please enter a Name and Ticker." });
      return;
    }
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    
    // Deployment Logic here (usually passing data up)
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
  }, [config, connected, publicKey, setVisible, onDeploySuccess, portfolio, triggerHaptic]);

  const generateRandomTicker = useCallback(() => {
    triggerHaptic();
    const prefixes = ['MOON', 'CHAD', 'PEPE', 'SOL', 'DEGEN', 'ALPHA'];
    const suffix = Math.floor(Math.random() * 100);
    setConfig(prev => ({ ...prev, ticker: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffix}` }));
  }, [triggerHaptic]);

  const triggerAddAnimation = useCallback((token: JupiterToken, rect: DOMRect) => {
    triggerHaptic();
    if (portfolio.some(p => p.token.address === token.address)) return;
    setFlyingToken(token);
    setFlyingCoords({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [portfolio, triggerHaptic]);

  const handleAnimationComplete = useCallback(() => {
    if (!flyingToken) return;
    
    setPortfolio(prev => {
      // 既に存在する場合は追加しない
      if (prev.some(p => p.token.address === flyingToken.address)) return prev;

      const currentW = prev.reduce((s, i) => s + i.weight, 0);
      // 残りパーセントの半分、または最大50%を割り当て
      let nextW = 0;
      if (currentW < 100) {
          nextW = Math.max(1, Math.floor((100 - currentW) / 2));
          if (nextW === 0 && currentW < 100) nextW = 100 - currentW; // 残り全部
      }
      
      return [...prev, { token: flyingToken, weight: nextW, locked: false, id: flyingToken.address }];
    });
    
    triggerHaptic();
    setFlyingToken(null);
    setFlyingCoords(null);
    setSearchQuery('');
  }, [flyingToken, triggerHaptic]);

  const addTokenDirect = useCallback((token: JupiterToken) => {
    if (portfolio.some(p => p.token.address === token.address)) return;
    
    setPortfolio(prev => {
      const currentW = prev.reduce((s, i) => s + i.weight, 0);
      let nextW = 0;
      if (currentW < 100) {
          nextW = Math.max(1, Math.floor((100 - currentW) / 2));
           if (nextW === 0 && currentW < 100) nextW = 100 - currentW;
      }
      return [...prev, { token, weight: nextW, locked: false, id: token.address }];
    });
    setSearchQuery('');
  }, [portfolio]);

  const removeToken = useCallback((address: string) => {
    triggerHaptic();
    setPortfolio(prev => prev.filter(p => p.token.address !== address));
  }, [triggerHaptic]);

  const updateWeight = useCallback((address: string, val: number) => {
    setPortfolio(prev => prev.map(p =>
      p.token.address === address ? { ...p, weight: val } : p
    ));
  }, []);

  const distributeEvenly = useCallback(() => {
    triggerHaptic();
    if (portfolio.length === 0) return;
    const count = portfolio.length;
    const evenWeight = Math.floor(100 / count);
    const remainder = 100 - (evenWeight * count);
    
    setPortfolio(prev => prev.map((p, i) => ({
      ...p,
      weight: evenWeight + (i === 0 ? remainder : 0),
    })));
  }, [portfolio.length, triggerHaptic]);

  return {
    step, setStep,
    allTokens, displayTokens,
    portfolio, searchQuery, setSearchQuery,
    isSearching, isLoading,
    config, setConfig,
    focusedField, setFocusedField,
    flyingToken, flyingCoords,
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