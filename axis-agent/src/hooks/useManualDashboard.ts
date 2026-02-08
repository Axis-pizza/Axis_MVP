import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { JupiterService, type JupiterToken } from '../services/jupiter';
import { toast } from 'sonner';
import type { StrategyConfig, AssetItem, ManualData, ManualDashboardProps } from '../components/create/manual/types';

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
  const [allTokens, setAllTokens] = useState<JupiterToken[]>([]);
  const [displayTokens, setDisplayTokens] = useState<JupiterToken[]>([]);
  const [portfolio, setPortfolio] = useState<AssetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [config, setConfig] = useState<StrategyConfig>({
    name: initialConfig?.name || '',
    ticker: initialConfig?.ticker || '',
    description: initialConfig?.description || '',
  });

  const [focusedField, setFocusedField] = useState<'ticker' | 'name' | 'desc' | null>('ticker');
  const [flyingToken, setFlyingToken] = useState<{ token: JupiterToken; x: number; y: number } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Computed ---
  const totalWeight = useMemo(() => portfolio.reduce((sum, i) => sum + i.weight, 0), [portfolio]);
  const selectedIds = useMemo(() => new Set(portfolio.map(p => p.token.address)), [portfolio]);
  const hasSelection = portfolio.length > 0;
  const isValidAllocation = totalWeight === 100 && portfolio.length >= 2;

  const visibleTokens = useMemo(() => displayTokens.slice(0, 100), [displayTokens]);

  const sortedVisibleTokens = useMemo(() => {
    if (!hasSelection) return visibleTokens;
    const selected = visibleTokens.filter(t => selectedIds.has(t.address));
    const unselected = visibleTokens.filter(t => !selectedIds.has(t.address));
    return [...selected, ...unselected];
  }, [visibleTokens, selectedIds, hasSelection]);

  // --- Init ---
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const list = await JupiterService.getLiteList();
        const popular = POPULAR_SYMBOLS
          .map(sym => list.find(t => t.symbol === sym))
          .filter((t): t is JupiterToken => t !== undefined);
        const others = list.filter(t => !POPULAR_SYMBOLS.includes(t.symbol));
        setAllTokens([...popular, ...others]);
        setDisplayTokens([...popular, ...others]);

        if (initialTokens) {
          const initialAssets: AssetItem[] = [];
          initialTokens.forEach(p => {
            const t = list.find(x => x.symbol === p.symbol);
            if (t) initialAssets.push({ token: t, weight: p.weight, locked: true, id: t.address });
          });
          setPortfolio(initialAssets);
        }
      } catch (e) {
        console.error('[ManualDashboard] Failed to load tokens:', e);
        toast.error('Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [initialTokens]);

  // --- Search ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDisplayTokens(allTokens);
      setIsSearching(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const query = searchQuery.toLowerCase();
      const localResults = allTokens.filter(t =>
        t.symbol.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.address.toLowerCase() === query
      );

      if (searchQuery.length > 20 || localResults.length < 5) {
        try {
          const apiResults = await JupiterService.searchTokens(searchQuery);
          if (apiResults.length > 0) {
            const merged = [...localResults];
            apiResults.forEach(t => {
              if (!merged.find(m => m.address === t.address)) merged.push(t);
            });
            setDisplayTokens(merged);
          } else {
            setDisplayTokens(localResults);
          }
        } catch {
          setDisplayTokens(localResults);
        }
      } else {
        setDisplayTokens(localResults);
      }
      setIsSearching(false);
    }, 200);

    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, allTokens]);

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
    onDeploySuccess({
      tokens: portfolio.map(p => ({
        symbol: p.token.symbol,
        weight: p.weight,
        mint: p.token.address,
        logoURI: p.token.logoURI,
      })),
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
    // State
    step,
    setStep,
    allTokens,
    displayTokens,
    portfolio,
    searchQuery,
    setSearchQuery,
    isSearching,
    isLoading,
    config,
    setConfig,
    focusedField,
    setFocusedField,
    flyingToken,

    // Computed
    totalWeight,
    selectedIds,
    hasSelection,
    isValidAllocation,
    visibleTokens,
    sortedVisibleTokens,

    // Wallet
    connected,

    // Handlers
    handleToIdentity,
    handleBackToBuilder,
    handleDeploy,
    generateRandomTicker,
    triggerAddAnimation,
    handleAnimationComplete,
    addTokenDirect,
    removeToken,
    updateWeight,
    distributeEvenly,
    triggerHaptic,
  };
};

export type ManualDashboardHook = ReturnType<typeof useManualDashboard>;
