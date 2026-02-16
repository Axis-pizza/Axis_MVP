import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { JupiterService, WalletService, type JupiterToken } from '../services/jupiter';
import { fetchPredictionTokens, fetchStockTokens, fetchCommodityTokens } from '../services/dflow';
import { fetchMarketCapMap } from '../services/coingecko';
import { toast } from 'sonner';
import type { StrategyConfig, AssetItem, ManualDashboardProps, TabType } from '../components/create/manual/types';

const POPULAR_SYMBOLS = ['SOL', 'USDC', 'USDT', 'JUP', 'JLP', 'BONK', 'WIF', 'TRUMP', 'ETH', 'JitoSOL'];

export const useManualDashboard = ({
  onDeploySuccess,
  initialConfig,
  initialTokens,
  verifiedOnly = false,
}: Pick<ManualDashboardProps, 'onDeploySuccess' | 'initialConfig' | 'initialTokens'> & { verifiedOnly?: boolean }) => {
  
  // --- 1. State Definitions ---
  const [step, setStep] = useState<'builder' | 'identity'>('builder');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]);
  const [userTokens, setUserTokens] = useState<JupiterToken[]>([]);
  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<JupiterToken[]>([]);
  const [caFallbackToken, setCaFallbackToken] = useState<JupiterToken | null>(null);
  const [tokenFilter, setTokenFilter] = useState<'all' | 'crypto' | 'stock' | 'commodity' | 'prediction'>('all');
  
  const [config, setConfig] = useState<StrategyConfig>({
    name: initialConfig?.name || '',
    ticker: initialConfig?.ticker || '',
    description: initialConfig?.description || '',
  });

  const [focusedField, setFocusedField] = useState<'ticker' | 'name' | 'desc' | null>('ticker');
  const [flyingToken, setFlyingToken] = useState<JupiterToken | null>(null);
  const [flyingCoords, setFlyingCoords] = useState<{x: number, y: number} | null>(null);
  
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const caFetchRef = useRef<string | null>(null);

  // --- 2. Helper Handlers ---
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  }, []);

  // --- 3. Computed Values ---

  // A. 通常リストの表示ロジック (ハイブリッド検索の実装)
  const sortedVisibleTokens = useMemo(() => {
    // Predictionタブは専用ロジック(groupedPredictions)に任せるため空配列を返す
    if (activeTab === 'prediction') return [];

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.trim().toLowerCase();
      
      // 1. Local Search (手元の全リストから検索) - これが最速かつ情報リッチ
      // Predictionトークン(source='dflow')は通常の検索結果には混ぜない（ノイズになるため）
      const localMatches = allTokens.filter(t => {
        if (t.source === 'dflow') return false; 
        return (
          t.symbol.toLowerCase().includes(lowerQ) || 
          t.name.toLowerCase().includes(lowerQ) || 
          t.address === searchQuery // アドレス完全一致
        );
      });

      // 2. API Results (searchResults) - ローカルにないものだけ追加
      // これにより、Memeコインなどの「手元にないトークン」もAPI経由で表示される
      const uniqueApiResults = searchResults.filter(apiToken => 
        !localMatches.some(local => local.address === apiToken.address)
      );

      // 3. Merge & Address Search
      let combined = [...localMatches, ...uniqueApiResults];

      // アドレス検索でヒットしたフォールバックがあれば先頭に追加
      if (caFallbackToken && !combined.find(t => t.address === caFallbackToken.address)) {
        combined.unshift(caFallbackToken);
      }

      return combined;
    }

    // --- 以下、検索クエリがない場合のタブごとの表示ロジック ---
    let baseList: JupiterToken[] = [];
    if (activeTab === 'your_tokens') baseList = userTokens;
    else if (activeTab === 'stock') baseList = allTokens.filter(t => t.source === 'stock');
    else if (activeTab === 'meme') {
      baseList = allTokens.filter(t => t.tags.includes('meme') || ['WIF', 'BONK', 'POPCAT'].includes(t.symbol.toUpperCase()));
      if (trendingIds.size > 0) baseList = [...baseList].sort((a, b) => (trendingIds.has(b.address) ? 1 : 0) - (trendingIds.has(a.address) ? 1 : 0));
    } else if (activeTab === 'trending') {
      if (trendingIds.size > 0) {
        const trending = allTokens.filter(t => trendingIds.has(t.address));
        const others = allTokens.filter(t => !trendingIds.has(t.address) && t.isVerified).slice(0, 20);
        baseList = [...trending, ...others];
      } else baseList = allTokens.filter(t => t.tags.includes('birdeye-trending') || (t.dailyVolume && t.dailyVolume > 1000000));
    } else baseList = allTokens; // 'all' タブ

    // カテゴリフィルタ (Allタブ内での絞り込み)
    if (activeTab === 'all' && tokenFilter !== 'all') {
      if (tokenFilter === 'crypto') baseList = baseList.filter(t => !t.source || t.source === 'jupiter');
      else if (tokenFilter === 'stock') baseList = baseList.filter(t => t.source === 'stock');
      else if (tokenFilter === 'commodity') baseList = baseList.filter(t => t.source === 'commodity');
      else if (tokenFilter === 'prediction') baseList = baseList.filter(t => t.source === 'dflow');
    }

    if (verifiedOnly) baseList = baseList.filter(t => t.isVerified || t.source === 'stock' || t.source === 'dflow');
    return baseList;
  }, [allTokens, userTokens, activeTab, searchQuery, tokenFilter, trendingIds, verifiedOnly, caFallbackToken, searchResults]);

  const displayTokens = sortedVisibleTokens;

  // B. Predictionのグループ化・検索・ソート
  const groupedPredictions = useMemo(() => {
    if (activeTab !== 'prediction') return [];
    
    const sourceList = allTokens.filter(t => t.source === 'dflow');
    const groups: Record<string, any> = {};

    sourceList.forEach(token => {
      const meta = token.predictionMeta;
      if (!meta) return;

      if (!groups[meta.marketId]) {
        groups[meta.marketId] = {
          marketId: meta.marketId,
          marketQuestion: meta.marketQuestion,
          eventTitle: meta.eventTitle,
          image: token.logoURI || '',
          expiry: meta.expiry,
          totalVolume: 0,
        };
      }
      
      if (token.dailyVolume) groups[meta.marketId].totalVolume += token.dailyVolume;
      if (meta.side === 'YES') groups[meta.marketId].yesToken = token;
      if (meta.side === 'NO') groups[meta.marketId].noToken = token;
    });

    let result = Object.values(groups);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g: any) => 
        g.marketQuestion.toLowerCase().includes(q) || 
        g.eventTitle.toLowerCase().includes(q) ||
        (g.yesToken && g.yesToken.symbol.toLowerCase().includes(q))
      );
    }

    result.sort((a: any, b: any) => (b.totalVolume || 0) - (a.totalVolume || 0));
    return result;
  }, [allTokens, searchQuery, activeTab]);

  // C. その他の計算
  const selectedIds = useMemo(() => new Set(portfolio.map(p => p.token.address)), [portfolio]);
  const totalWeight = useMemo(() => portfolio.reduce((sum, i) => sum + i.weight, 0), [portfolio]);
  const hasSelection = portfolio.length > 0;
  const isValidAllocation = totalWeight === 100 && portfolio.length >= 2;

  const filterCounts = useMemo(() => ({
    crypto: allTokens.filter(t => !t.source || t.source === 'jupiter').length,
    stock: allTokens.filter(t => t.source === 'stock').length,
    commodity: allTokens.filter(t => t.source === 'commodity').length,
    prediction: allTokens.filter(t => t.source === 'dflow').length,
  }), [allTokens]);

  // --- 4. Effects ---

  // CA Search Fallback
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(q)) {
      const hasMatch = allTokens.some(t => t.address.toLowerCase() === q.toLowerCase());
      if (!hasMatch && caFetchRef.current !== q) {
        caFetchRef.current = q;
        JupiterService.fetchTokenByMint(q).then(token => {
          if (token && caFetchRef.current === q) setCaFallbackToken(token);
        });
      }
    } else {
      setCaFallbackToken(null);
      caFetchRef.current = null;
    }
  }, [searchQuery, allTokens]);

  // Initial Load (重複排除の実装)
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      try {
        const [list, predictionTokens, stockTokens, commodityTokens, mcMaps] = await Promise.all([
          JupiterService.getLiteList(),
          fetchPredictionTokens().catch(() => []),
          fetchStockTokens().catch(() => []),
          fetchCommodityTokens().catch(() => []),
          fetchMarketCapMap().catch(() => ({ byAddress: new Map(), bySymbol: new Map() })),
        ]);
        if (!isMounted) return;

        const uniqueMap = new Map<string, JupiterToken>();
        
        POPULAR_SYMBOLS.forEach(sym => { const t = list.find(x => x.symbol === sym); if (t) uniqueMap.set(t.address, t); });
        [...predictionTokens, ...stockTokens, ...commodityTokens].forEach(t => uniqueMap.set(t.address, t));
        list.forEach(t => { if (!uniqueMap.has(t.address)) uniqueMap.set(t.address, t); });

        const enriched = Array.from(uniqueMap.values()).map(t => {
          const mc = mcMaps.byAddress.get(t.address) ?? mcMaps.bySymbol.get(t.symbol.toUpperCase());
          return mc ? { ...t, marketCap: mc } : t;
        });

        setAllTokens(enriched);

        if (initialTokens && initialTokens.length > 0) {
          const initialAssets: AssetItem[] = [];
          initialTokens.forEach(p => {
            const t = enriched.find(x => x.symbol === p.symbol || x.address === (p as any).address);
            if (t && !initialAssets.some(e => e.token.address === t.address)) {
                initialAssets.push({ token: t, weight: p.weight, locked: true, id: t.address });
            }
          });
          setPortfolio(initialAssets);
        }
      } catch (e) { console.error(e); }
      finally { if (isMounted) setIsLoading(false); }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // Fetch User Tokens / Trending
  useEffect(() => {
    if (activeTab === 'your_tokens' && publicKey && connected) {
      setIsLoading(true);
      WalletService.getUserTokens(connection, publicKey).then(setUserTokens).finally(() => setIsLoading(false));
    }
  }, [activeTab, publicKey, connected, connection]);

  useEffect(() => {
    if ((activeTab === 'trending' || activeTab === 'meme') && trendingIds.size === 0) {
       JupiterService.getTrendingTokens().then(tokens => { if (tokens.length > 0) setTrendingIds(new Set(tokens.map(t => t.address))); });
    }
  }, [activeTab, trendingIds.size]);

  // Search Debounce (API Call)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || (q.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(q))) {
      setIsSearching(false);
      if (!q) setSearchResults([]);
      return;
    }
    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      // API検索はPrediction以外のときに走らせる（Predictionはローカルで十分なため）
      if (activeTab !== 'prediction') {
        try { const results = await JupiterService.searchTokens(q); setSearchResults(results); } 
        catch { setSearchResults([]); } 
      }
      setIsSearching(false);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, activeTab]);

  useEffect(() => { if (activeTab !== 'all') setTokenFilter('all'); }, [activeTab]);

  // --- 5. Action Handlers ---
  const addTokenDirect = useCallback((token: JupiterToken) => {
    setPortfolio(prev => {
      if (prev.some(p => p.token.address === token.address)) return prev;
      const currentW = prev.reduce((s, i) => s + i.weight, 0);
      let nextW = 0;
      if (currentW < 100) {
        nextW = Math.max(1, Math.floor((100 - currentW) / 2));
        if (nextW === 0 && currentW < 100) nextW = 100 - currentW;
      }
      return [...prev, { token, weight: nextW, locked: false, id: token.address }];
    });
    setSearchQuery('');
  }, []);

  const removeToken = useCallback((address: string) => { triggerHaptic(); setPortfolio(prev => prev.filter(p => p.token.address !== address)); }, [triggerHaptic]);
  const updateWeight = useCallback((address: string, val: number) => { setPortfolio(prev => prev.map(p => p.token.address === address ? { ...p, weight: val } : p)); }, []);
  const distributeEvenly = useCallback(() => {
    triggerHaptic();
    if (portfolio.length === 0) return;
    const count = portfolio.length;
    const evenWeight = Math.floor(100 / count);
    const remainder = 100 - (evenWeight * count);
    setPortfolio(prev => prev.map((p, i) => ({ ...p, weight: evenWeight + (i === 0 ? remainder : 0) })));
  }, [portfolio.length, triggerHaptic]);

  const handleToIdentity = useCallback(() => { triggerHaptic(); setStep('identity'); setFocusedField('ticker'); }, [triggerHaptic]);
  const handleBackToBuilder = useCallback(() => setStep('builder'), []);
  const handleDeploy = useCallback(async () => {
    triggerHaptic();
    if (!config.name || !config.ticker) { toast.error("Required Fields", { description: "Enter Name and Ticker." }); return; }
    if (!connected || !publicKey) { setVisible(true); return; }
    const mappedTokens = portfolio.map(p => ({ symbol: p.token.symbol, weight: p.weight, mint: p.token.address, logoURI: p.token.logoURI }));
    onDeploySuccess({ tokens: mappedTokens, config });
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
    addTokenDirect(flyingToken);
    triggerHaptic();
    setFlyingToken(null);
    setFlyingCoords(null);
    setSearchQuery('');
  }, [flyingToken, triggerHaptic, addTokenDirect]);

  return {
    step, setStep, allTokens, displayTokens, portfolio, searchQuery, setSearchQuery, isSearching, isLoading, config, setConfig,
    focusedField, setFocusedField, flyingToken, flyingCoords, activeTab, setActiveTab, totalWeight, selectedIds, hasSelection,
    isValidAllocation, sortedVisibleTokens, filterCounts, tokenFilter, setTokenFilter, connected, groupedPredictions,
    handleToIdentity, handleBackToBuilder, handleDeploy, generateRandomTicker, triggerAddAnimation, handleAnimationComplete,
    addTokenDirect, removeToken, updateWeight, distributeEvenly, triggerHaptic,
  };
};

export type ManualDashboardHook = ReturnType<typeof useManualDashboard>;