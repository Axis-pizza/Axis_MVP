import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Copy, Trophy, LogOut, CheckCircle, Sparkles, Edit,
  User, Droplets, Wallet, QrCode,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { useWallet } from '../../context/WalletContext';
import { useToast } from './context/ToastContext';
import { ProfileEditModal } from './ProfileEditModal';
import { InviteModal } from './InviteModal';
import { colors, serifFont } from '../../config/theme';

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

export function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
  const { showToast } = useToast();
  const { publicKey, connected, connect, disconnect } = useWallet();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const pubkeyStr = publicKey?.toBase58() || '';

  const fetchUser = useCallback(async () => {
    if (!publicKey || !connected) return;
    try {
      const res = await api.getUser(publicKey.toBase58());
      if (res.success || res.user) {
        setUserData(res.user || res);
      }
    } catch (e) {
      console.error('Fetch user error:', e);
    }
  }, [publicKey, connected]);

  useEffect(() => {
    if (visible && connected && publicKey) {
      fetchUser();
    }
  }, [visible, connected, publicKey, fetchUser]);

  useEffect(() => {
    if (!connected) setUserData(null);
  }, [connected]);

  const handleCheckIn = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await api.dailyCheckIn(publicKey.toBase58());
      if (res.success) {
        await fetchUser();
        showToast('+10 XP Claimed!', 'success');
      } else {
        showToast(res.error || 'Check-in failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    }
    setLoading(false);
  };

  const handleFaucet = async () => {
    if (!publicKey) return;
    setFaucetLoading(true);
    try {
      const result = await api.requestFaucet(publicKey.toBase58());
      if (result.success) {
        showToast(result.message || '1,000 USDC received!', 'success');
      } else {
        showToast(result.error || 'Faucet request failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
    setFaucetLoading(false);
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      setUserData(null);
      await disconnect();
      onClose();
      showToast('Disconnected', 'success');
    } catch {
      showToast('Disconnect failed', 'error');
    }
    setIsDisconnecting(false);
  };

  const handleCopyAddress = async () => {
    if (!pubkeyStr) return;
    await Clipboard.setStringAsync(pubkeyStr);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Address copied', 'success');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View style={{
          backgroundColor: '#080503',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          maxHeight: '90%',
          borderTopWidth: 1,
          borderColor: colors.border,
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 }}>
            <Text style={{ fontFamily: serifFont, fontWeight: 'bold', fontSize: 20, color: colors.text }}>
              {!connected ? 'Connect Wallet' : 'My Profile'}
            </Text>
            <Pressable onPress={onClose} style={{ padding: 8, borderRadius: 999 }}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: 24 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Not Connected */}
            {!connected && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
                  marginBottom: 24, borderWidth: 1, borderColor: colors.border,
                }}>
                  <Wallet size={32} color={colors.textMuted} />
                </View>
                <Text style={{ color: 'rgba(242,224,200,0.6)', textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 }}>
                  Connect your Solana wallet to claim XP and manage your portfolio.
                </Text>
                <Pressable onPress={connect} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={['#6B4420', '#B8863F', '#E8C890']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 16, alignItems: 'center', borderRadius: 12 }}
                  >
                    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Connect Wallet</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* Connected */}
            {connected && publicKey && (
              <>
                {/* Avatar */}
                <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 8 }}>
                  <Pressable onPress={() => setIsEditOpen(true)}>
                    <View style={{
                      width: 96, height: 96, borderRadius: 48,
                      borderWidth: 2, borderColor: 'rgba(184,134,63,0.3)', padding: 4,
                    }}>
                      <View style={{
                        width: '100%', height: '100%', borderRadius: 44,
                        backgroundColor: colors.surface, overflow: 'hidden',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        {userData?.avatar_url ? (
                          <Image source={{ uri: userData.avatar_url }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <User size={40} color="rgba(242,224,200,0.2)" />
                        )}
                      </View>
                    </View>
                    {/* Edit badge */}
                    <View style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 28, height: 28, borderRadius: 14,
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 2, borderColor: '#080503',
                    }}>
                      <LinearGradient
                        colors={['#6B4420', '#B8863F', '#E8C890']}
                        style={{ width: '100%', height: '100%', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Edit size={12} color="#140D07" />
                      </LinearGradient>
                    </View>
                  </Pressable>

                  <Text style={{ marginTop: 16, fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                    {userData?.username || formatAddress(pubkeyStr)}
                  </Text>
                  {userData?.bio ? (
                    <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, maxWidth: 200 }}>
                      {userData.bio}
                    </Text>
                  ) : (
                    <Pressable onPress={() => setIsEditOpen(true)}>
                      <Text style={{ fontSize: 12, color: 'rgba(122,90,48,0.5)', marginTop: 4 }}>+ Add Bio</Text>
                    </Pressable>
                  )}

                  {/* Wallet address */}
                  <Pressable onPress={handleCopyAddress} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    marginTop: 8, paddingHorizontal: 12, paddingVertical: 6,
                    borderRadius: 999, backgroundColor: 'rgba(184,134,63,0.05)',
                    borderWidth: 1, borderColor: colors.borderLight,
                  }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' }}>{formatAddress(pubkeyStr)}</Text>
                    <Copy size={12} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* XP Card */}
                <View style={{
                  marginBottom: 24, borderRadius: 20, overflow: 'hidden',
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <LinearGradient
                    colors={['#221509', '#0B0704']}
                    start={{ x: 0.7, y: 0.2 }}
                    end={{ x: 0, y: 1 }}
                    style={{ padding: 24, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, color: colors.accent, marginBottom: 8, textTransform: 'uppercase' }}>
                      Season 0 Rank
                    </Text>
                    <Text style={{ fontSize: 44, fontWeight: 'bold', color: colors.text, fontFamily: serifFont, letterSpacing: -1 }}>
                      {userData?.total_xp?.toLocaleString() || 0}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>Current XP</Text>
                      <View style={{
                        paddingHorizontal: 6, paddingVertical: 2,
                        borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)',
                        borderWidth: 1, borderColor: colors.borderLight,
                      }}>
                        <Text style={{ fontSize: 10, color: 'rgba(242,224,200,0.5)' }}>
                          {userData?.rank_tier || 'Novice'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Action Buttons */}
                <View style={{ gap: 12 }}>
                  {/* Daily Check-in */}
                  <Pressable
                    onPress={handleCheckIn}
                    disabled={loading}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    {loading ? <ActivityIndicator size="small" color="#000" /> : <CheckCircle size={20} color="#000" />}
                    <Text style={{ fontWeight: 'bold', color: '#000' }}>Daily Check-in</Text>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, color: '#000' }}>+10 XP</Text>
                    </View>
                  </Pressable>

                  {/* Faucet */}
                  <Pressable
                    onPress={handleFaucet}
                    disabled={faucetLoading}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14,
                      borderWidth: 1, borderColor: colors.border,
                      opacity: faucetLoading ? 0.5 : 1,
                    }}
                  >
                    {faucetLoading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Droplets size={20} color={colors.textSecondary} />}
                    <Text style={{ fontWeight: 'bold', color: colors.textSecondary }}>Get 1,000 USDC</Text>
                  </Pressable>

                  {/* Invite */}
                  <Pressable
                    onPress={() => setIsInviteOpen(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14,
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  >
                    <QrCode size={20} color={colors.textMuted} />
                    <Text style={{ fontWeight: 'bold', color: colors.text }}>Invite & Earn</Text>
                  </Pressable>
                </View>

                {/* Disconnect */}
                <Pressable
                  onPress={handleDisconnect}
                  disabled={isDisconnecting}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    paddingVertical: 16, marginTop: 24,
                  }}
                >
                  {isDisconnecting ? (
                    <ActivityIndicator size="small" color="rgba(239,68,68,0.8)" />
                  ) : (
                    <LogOut size={16} color="rgba(239,68,68,0.8)" />
                  )}
                  <Text style={{ fontWeight: 'bold', fontSize: 13, color: 'rgba(239,68,68,0.8)' }}>
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Sub-modals */}
      <ProfileEditModal
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentProfile={{
          pubkey: pubkeyStr,
          username: userData?.username,
          bio: userData?.bio,
          avatar_url: userData?.avatar_url,
        }}
        onUpdate={fetchUser}
      />

      <InviteModal
        visible={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        pubkey={pubkeyStr}
      />
    </Modal>
  );
}
