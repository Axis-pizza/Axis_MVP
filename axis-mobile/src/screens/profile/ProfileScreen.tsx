import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator,
  Animated, StyleSheet, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Eye, EyeOff, Wallet, ArrowUpRight, ArrowDownRight,
  Star, LayoutGrid, Award,
} from 'lucide-react-native';

import { api } from '../../services/api';
import { TokenImage } from '../../components/common/TokenImage';
import { useWallet } from '../../context/WalletContext';


// --- Types ---
type MainTab = 'portfolio' | 'leaderboard';
type SubTab = 'created' | 'invested' | 'watchlist';

interface Strategy {
  id: string;
  name: string;
  ticker: string | null;
  type: string;
  tokens: any[];
  tvl: number;
  status: string;
  createdAt: number;
}

// --- Colors (Consistent with Web - Metallic Gold Theme) ---
const THEME = {
  bg: '#080503',
  cardBg: '#140E08',
  cardBgLight: '#221509',
  accent: '#B8863F',
  accentLight: '#D4A261',
  accentDark: '#6B4420',
  accentHighlight: '#E8C890',
  text: '#F2E0C8',
  textSecondary: '#B89860',
  textDim: '#7A5A30',
  border: 'rgba(184, 134, 63, 0.15)',
  borderLight: 'rgba(184, 134, 63, 0.08)',
  success: '#10B981',
  warning: '#F59E0B',
};

const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// --- Helper Functions ---
const formatCurrency = (val: number, currency: 'USD' | 'SOL') => {
  if (currency === 'SOL') return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} SOL`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { publicKey, connected, connect } = useWallet();

  // State
  const [mainTab, setMainTab] = useState<MainTab>('portfolio');
  const [subTab, setSubTab] = useState<SubTab>('created');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'SOL'>('USD');
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myStrategies, setMyStrategies] = useState<Strategy[]>([]);
  const [investedStrategies, setInvestedStrategies] = useState<Strategy[]>([]);
  const [watchlist, setWatchlist] = useState<Strategy[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [solBalance, setSolBalance] = useState(0);
  const [solPrice, setSolPrice] = useState(0);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Tab change animation
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [mainTab, subTab]);

  // Initial load
  useEffect(() => {
    if (connected && publicKey) {
      loadProfile();
    }
  }, [connected, publicKey]);

  const loadProfile = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const pubkeyStr = publicKey.toBase58();

      const [userRes, strategiesRes, watchlistRes, investedRes, leaderRes, priceRes] = await Promise.all([
        api.getUser(pubkeyStr),
        api.getUserStrategies(pubkeyStr),
        api.getUserWatchlist(pubkeyStr),
        api.getInvestedStrategies(pubkeyStr),
        api.getLeaderboard('points'),
        api.getSolPrice(),
      ]);

      setSolPrice(typeof priceRes === 'number' ? priceRes : 150);
      setUserProfile(userRes.user);
      setMyStrategies(strategiesRes.strategies || strategiesRes || []);
      setWatchlist(watchlistRes.strategies || []);
      setInvestedStrategies(investedRes.strategies || []);
      setLeaderboard(leaderRes.leaderboard || leaderRes || []);
      setSolBalance(12.5);

    } catch (e) {
      console.error('Load profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStrategySelect = (strategy: any) => {
    navigation.navigate('StrategyDetail', { strategy });
  };

  // --- Calculations ---
  const investedAmountUSD = myStrategies.reduce((sum, s) => sum + ((s.tvl || 0) * solPrice), 0);
  const totalNetWorthUSD = (solBalance * solPrice) + investedAmountUSD;
  const displayValue = currencyMode === 'USD' ? totalNetWorthUSD : (solPrice > 0 ? totalNetWorthUSD / solPrice : 0);
  const pnlVal = userProfile?.pnl_percent || 0;
  const isPos = pnlVal >= 0;

  // --- Components ---

  // Not Connected State
  if (!connected) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.iconCircle}>
          <Wallet size={32} color={THEME.textDim} />
        </View>
        <Text style={styles.title}>Connect Wallet</Text>
        <Text style={styles.subtitle}>Access your portfolio, track referrals, and climb the leaderboard.</Text>
        <Pressable onPress={connect} style={styles.connectButton}>
          <LinearGradient
            colors={['#6B4420', '#B8863F', '#E8C890']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  // Header component for FlatList
  const ListHeader = () => (
    <View>
      {/* Net Worth Card */}
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={['#221509', '#080503']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Top Row */}
          <View style={styles.cardHeader}>
            <View style={styles.walletBadge}>
              <Wallet size={12} color={THEME.accent} />
              <Text style={styles.walletText}>{formatAddress(publicKey?.toBase58() || '')}</Text>
              {userProfile?.is_vip && (
                <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>
              )}
            </View>

            <View style={styles.cardControls}>
              <Pressable
                onPress={() => setCurrencyMode(prev => prev === 'USD' ? 'SOL' : 'USD')}
                style={styles.controlButton}
              >
                <Text style={styles.controlText}>{currencyMode}</Text>
              </Pressable>
              <Pressable onPress={() => setIsHidden(!isHidden)} style={{ padding: 4 }}>
                {isHidden ? <EyeOff size={16} color={THEME.textDim} /> : <Eye size={16} color={THEME.textDim} />}
              </Pressable>
            </View>
          </View>

          {/* Main Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.label}>TOTAL NET WORTH</Text>
            <Text style={styles.mainValue}>
              {isHidden ? '••••••' : formatCurrency(displayValue, currencyMode)}
            </Text>
            {pnlVal !== 0 && (
              <View style={[styles.pnlBadge, isPos ? styles.pnlPos : styles.pnlNeg]}>
                {isPos ? <ArrowUpRight size={12} color={THEME.success} /> : <ArrowDownRight size={12} color="#ef4444" />}
                <Text style={[styles.pnlText, { color: isPos ? THEME.success : '#ef4444' }]}>
                  {isHidden ? '••••' : `${isPos ? '+' : ''}${pnlVal.toFixed(2)}%`}
                </Text>
              </View>
            )}
          </View>

          {/* Footer Stats */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.footerLabel}>POINTS</Text>
              <Text style={styles.footerValue}>{userProfile?.total_xp?.toLocaleString() || 0}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.footerLabel}>RANK</Text>
              <Text style={styles.footerValueAccent}>{userProfile?.rank_tier || 'Novice'}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Main Tabs */}
      <View style={styles.tabContainer}>
        {(['portfolio', 'leaderboard'] as MainTab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setMainTab(tab)}
            style={[styles.tabButton, mainTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, mainTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sub Tabs (Only for Portfolio) */}
      {mainTab === 'portfolio' && (
        <View style={styles.subTabContainer}>
          {(['created', 'invested', 'watchlist'] as SubTab[]).map(tab => {
            const isActive = subTab === tab;
            const count = tab === 'created' ? myStrategies.length
              : tab === 'invested' ? investedStrategies.length
              : watchlist.length;

            return (
              <Pressable
                key={tab}
                onPress={() => setSubTab(tab)}
                style={[styles.subTab, isActive && styles.subTabActive]}
              >
                {tab === 'watchlist' && <Star size={12} color={isActive ? '#000' : THEME.textDim} style={{ marginRight: 4 }} />}
                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Leaderboard Header */}
      {mainTab === 'leaderboard' && (
        <View style={styles.leaderboardHeader}>
          <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>#</Text>
          <Text style={[styles.th, { flex: 1, paddingLeft: 8 }]}>USER</Text>
          <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>XP</Text>
        </View>
      )}
    </View>
  );

  // Strategy item render
  const renderStrategyItem = ({ item }: { item: Strategy }) => {
    const tvlUSD = (item.tvl || 0) * solPrice;
    const tokens = Array.isArray(item.tokens) ? item.tokens : [];
    const displayTokens = tokens.slice(0, 5);
    const extraCount = tokens.length - 5;

    return (
      <Pressable onPress={() => handleStrategySelect(item)} style={styles.strategyCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View>
            <Text style={styles.strategyName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.strategyTicker}>{item.ticker || item.type}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.strategyTvl}>{tvlUSD > 0 ? `$${tvlUSD.toFixed(2)}` : '-'}</Text>
            <Text style={styles.strategyTicker}>TVL</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
          {displayTokens.map((t: any, i: number) => (
            <View key={i} style={[styles.tokenIconWrap, { marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }]}>
              <TokenImage src={t.logoURI} style={styles.tokenIcon} />
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.tokenIconWrap, styles.extraTokenWrap, { marginLeft: -8, zIndex: 0 }]}>
              <Text style={styles.extraTokenText}>+{extraCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooterRow}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
          <Text style={styles.dateText}>{new Date(item.createdAt * 1000).toLocaleDateString()}</Text>
        </View>
      </Pressable>
    );
  };

  // Leaderboard item render
  const renderLeaderboardItem = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.wallet_address === publicKey?.toBase58();
    let rankColor = THEME.textDim;
    if (index === 0) rankColor = '#FFD700'; // Gold
    if (index === 1) rankColor = '#C0C0C0'; // Silver
    if (index === 2) rankColor = '#CD7F32'; // Bronze

    return (
      <View style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
        <Text style={[styles.rankText, { color: rankColor }]}>#{index + 1}</Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.username || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.userName, isMe && { color: THEME.accent }]}>
              {item.username || 'Anonymous'}
            </Text>
            <Text style={styles.userAddr}>{formatAddress(item.wallet_address || '')}</Text>
          </View>
        </View>
        <Text style={styles.xpText}>{item.total_xp?.toLocaleString() || 0}</Text>
      </View>
    );
  };

  // Main render
  const activeData = mainTab === 'portfolio'
    ? (subTab === 'created' ? myStrategies : subTab === 'invested' ? investedStrategies : watchlist)
    : leaderboard;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading && !userProfile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <Animated.FlatList
          data={activeData}
          keyExtractor={(item: any, i) => item.id || item.wallet_address || i.toString()}
          ListHeaderComponent={ListHeader}
          renderItem={mainTab === 'portfolio' ? renderStrategyItem : renderLeaderboardItem}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {mainTab === 'portfolio' ? <LayoutGrid size={40} color={THEME.border} /> : <Award size={40} color={THEME.border} />}
              <Text style={styles.emptyTitle}>No Data Found</Text>
              <Text style={styles.emptySub}>Nothing to show here yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.text, fontFamily: serifFont },

  // Connect Wallet Screen
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.cardBg, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: THEME.border },
  title: { fontSize: 24, fontWeight: 'bold', color: THEME.text, marginBottom: 8, fontFamily: serifFont },
  subtitle: { fontSize: 14, color: THEME.textDim, textAlign: 'center', marginBottom: 32, paddingHorizontal: 32 },
  connectButton: { borderRadius: 12, overflow: 'hidden' },
  connectButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  // Net Worth Card
  cardContainer: { marginBottom: 24, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border },
  cardGradient: { padding: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(8, 5, 3, 0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: THEME.border },
  walletText: { color: THEME.text, fontSize: 12, fontWeight: 'bold', marginLeft: 6, marginRight: 4 },
  vipBadge: { backgroundColor: THEME.accent, paddingHorizontal: 4, borderRadius: 4 },
  vipText: { fontSize: 8, fontWeight: 'bold', color: '#000' },
  cardControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlButton: { backgroundColor: 'rgba(8, 5, 3, 0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: THEME.border, marginRight: 8 },
  controlText: { color: THEME.textDim, fontSize: 10, fontWeight: 'bold' },

  valueContainer: { paddingVertical: 16 },
  label: { color: THEME.textDim, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  mainValue: { color: THEME.text, fontSize: 40, fontWeight: 'bold', letterSpacing: -1, fontFamily: serifFont },
  pnlBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 8, borderWidth: 1 },
  pnlPos: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  pnlNeg: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  pnlText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  footerLabel: { color: THEME.textDim, fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  footerValue: { color: THEME.accent, fontSize: 14, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  footerValueAccent: { color: THEME.accentLight, fontSize: 14, fontWeight: 'bold' },

  // Tabs
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: THEME.border, marginBottom: 16 },
  tabButton: { flex: 1, paddingBottom: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: THEME.accent },
  tabText: { color: THEME.textDim, fontSize: 14, fontWeight: 'bold' },
  tabTextActive: { color: THEME.text },

  subTabContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  subTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.cardBg },
  subTabActive: { backgroundColor: THEME.accent, borderColor: THEME.accent },
  subTabText: { color: THEME.textDim, fontSize: 12, fontWeight: 'bold' },
  subTabTextActive: { color: '#000' },

  // Strategy Card
  strategyCard: { backgroundColor: THEME.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: THEME.border },
  strategyName: { color: THEME.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  strategyTicker: { color: THEME.textDim, fontSize: 10 },
  strategyTvl: { color: THEME.accent, fontSize: 14, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  tokenIconWrap: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: THEME.cardBg, overflow: 'hidden', backgroundColor: THEME.cardBgLight },
  tokenIcon: { width: '100%', height: '100%' },
  extraTokenWrap: { backgroundColor: 'rgba(184, 134, 63, 0.1)', justifyContent: 'center', alignItems: 'center' },
  extraTokenText: { color: THEME.textSecondary, fontSize: 8, fontWeight: 'bold' },

  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.border },
  activeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeText: { color: THEME.success, fontSize: 10, fontWeight: 'bold' },
  dateText: { color: THEME.textDim, fontSize: 10 },

  // Leaderboard
  leaderboardHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, marginBottom: 4 },
  th: { color: THEME.textDim, fontSize: 10, fontWeight: 'bold' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: THEME.cardBg, marginBottom: 8, borderWidth: 1, borderColor: THEME.border },
  leaderRowMe: { backgroundColor: 'rgba(184, 134, 63, 0.1)', borderColor: 'rgba(184, 134, 63, 0.5)' },
  rankText: { width: 40, textAlign: 'center', fontWeight: 'bold', fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(184, 134, 63, 0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  avatarText: { color: THEME.textSecondary, fontWeight: 'bold', fontSize: 12 },
  userName: { color: THEME.text, fontSize: 14, fontWeight: 'bold' },
  userAddr: { color: THEME.textDim, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  xpText: { width: 80, textAlign: 'right', color: THEME.accent, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 48, borderWidth: 1, borderColor: THEME.border, borderStyle: 'dashed', borderRadius: 16 },
  emptyTitle: { color: THEME.textDim, fontSize: 14, fontWeight: 'bold', marginTop: 12 },
  emptySub: { color: THEME.textDim, fontSize: 12, marginTop: 4 },
});
