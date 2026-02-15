import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';
import { JupiterService } from '../../services/jupiter';
import { DexScreenerService } from '../../services/dexscreener';
import { SwipeCard } from './SwipeCard';
import { colors } from '../../config/theme';
import type { Strategy } from '../../types';

interface Props {
  onStrategySelect: (strategy: Strategy) => void;
}

interface TokenData {
  symbol: string;
  price: number;
  change24h: number;
  logoURI?: string;
  address: string;
}

export function SwipeDiscoverView({ onStrategySelect }: Props) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tokenDataMap, setTokenDataMap] = useState<Record<string, TokenData>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.discoverStrategies(50);
      const list = res.strategies || res || [];
      setStrategies(list);

      // Fetch token prices
      const allMints = new Set<string>();
      list.forEach((s: any) => {
        (s.tokens || []).forEach((t: any) => {
          const addr = t.address || t.mint;
          if (addr && addr.length > 30) allMints.add(addr);
        });
      });

      const mintArray = Array.from(allMints);
      if (mintArray.length > 0) {
        const [prices, dexData] = await Promise.all([
          JupiterService.getPrices(mintArray),
          DexScreenerService.getMarketData(mintArray),
        ]);

        const tokenList = await JupiterService.getLiteList();
        const map: Record<string, TokenData> = {};
        mintArray.forEach(mint => {
          const meta = tokenList.find(t => t.address === mint);
          map[mint] = {
            symbol: meta?.symbol || '???',
            price: prices[mint] || 0,
            change24h: dexData[mint]?.change24h || 0,
            logoURI: meta?.logoURI,
            address: mint,
          };
        });
        setTokenDataMap(map);
      }
    } catch (e) {
      console.error('Load discover error:', e);
    } finally {
      setLoading(false);
    }
  };

  const enrichedStrategies = useMemo(() => {
    return strategies.map(s => {
      const tokens = (s.tokens || []).map((t: any) => {
        const addr = t.address || t.mint;
        const data = tokenDataMap[addr];
        return {
          ...t,
          address: addr,
          currentPrice: data?.price,
          change24h: data?.change24h,
          logoURI: t.logoURI || data?.logoURI,
        };
      });

      const weightedRoi = tokens.reduce((sum: number, t: any) => {
        return sum + (t.change24h || 0) * (t.weight / 100);
      }, 0);

      return {
        id: s.id || s._id,
        name: s.name,
        ticker: s.ticker,
        type: s.type || 'BALANCED',
        tokens,
        roi: weightedRoi,
        tvl: s.tvl || 0,
        creatorAddress: s.owner_pubkey || s.ownerPubkey || '',
        description: s.description,
        createdAt: s.createdAt || Date.now(),
        mintAddress: s.address,
        vaultAddress: s.config?.strategyPubkey,
      };
    });
  }, [strategies, tokenDataMap]);

  const handleSwipeLeft = () => {
    setCurrentIndex(prev => Math.min(prev + 1, enrichedStrategies.length - 1));
  };

  const handleSwipeRight = () => {
    const strategy = enrichedStrategies[currentIndex];
    if (strategy) {
      onStrategySelect(strategy as any);
    }
    setCurrentIndex(prev => Math.min(prev + 1, enrichedStrategies.length - 1));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={colors.accent} />
        <Text className="mt-3" style={{ color: colors.textMuted }}>Loading strategies...</Text>
      </View>
    );
  }

  if (enrichedStrategies.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-8">
        <Text className="text-center text-lg" style={{ color: colors.textSecondary }}>No strategies found</Text>
        <Text className="text-center mt-2" style={{ color: colors.textMuted }}>Check back later for new strategies</Text>
      </View>
    );
  }

  const visibleCards = enrichedStrategies.slice(currentIndex, currentIndex + 3);

  return (
    <View className="flex-1 items-center justify-center px-4">
      <View className="w-full" style={{ height: 500 }}>
        {visibleCards.map((strategy, i) => (
          <SwipeCard
            key={strategy.id}
            strategy={strategy}
            isTop={i === 0}
            index={i}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={() => onStrategySelect(strategy as any)}
          />
        ))}
      </View>

      {currentIndex >= enrichedStrategies.length && (
        <View className="absolute inset-0 justify-center items-center">
          <Text className="text-lg" style={{ color: colors.textSecondary }}>No more strategies</Text>
        </View>
      )}
    </View>
  );
}
