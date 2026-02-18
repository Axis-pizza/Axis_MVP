import { useState, useCallback, useEffect } from 'react';

const FAVORITES_KEY = 'axis_favorite_tokens';
const HISTORY_KEY = 'axis_search_history';
const VERIFIED_KEY = 'axis_verified_only';
const MAX_FAVORITES = 50;
const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  address: string;
  symbol: string;
  logoURI: string;
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function loadHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as SearchHistoryItem[];
  } catch {
    /* ignore */
  }
  return [];
}

function loadVerifiedOnly(): boolean {
  try {
    return localStorage.getItem(VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useTokenPreferences() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => loadHistory());
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(() => loadVerifiedOnly());

  // Persist favorites
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  // Persist history
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Persist verified toggle
  useEffect(() => {
    localStorage.setItem(VERIFIED_KEY, String(verifiedOnly));
  }, [verifiedOnly]);

  const toggleFavorite = useCallback((address: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else if (next.size < MAX_FAVORITES) {
        next.add(address);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((address: string) => favorites.has(address), [favorites]);

  const addToSearchHistory = useCallback((item: SearchHistoryItem) => {
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.address !== item.address);
      return [item, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    searchHistory,
    addToSearchHistory,
    clearSearchHistory,
    verifiedOnly,
    setVerifiedOnly,
  };
}

export type TokenPreferences = ReturnType<typeof useTokenPreferences>;
