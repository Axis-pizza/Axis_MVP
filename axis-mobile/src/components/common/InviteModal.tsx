import React from 'react';
import { View, Text, Pressable, Modal, Image, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { X, Copy, Share2 } from 'lucide-react-native';
import { useToast } from './context/ToastContext';
import { colors, serifFont } from '../../config/theme';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  pubkey: string;
}

export function InviteModal({ visible, onClose, pubkey }: InviteModalProps) {
  const { showToast } = useToast();
  const inviteLink = `https://axis.app/?ref=${pubkey}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}&color=C9975B&bgcolor=0F0B07&margin=10`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Invite Link Copied!', 'success');
  };

  const handleShareX = () => {
    const text = `Join me on Axis!\nCreating my own crypto ETF on Solana.\n\n#Axis #Solana #DeFi`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteLink)}`;
    Linking.openURL(url);
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Join me on Axis! Creating my own crypto ETF on Solana.\n\n${inviteLink}`,
        url: inviteLink,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{
          width: '100%',
          maxWidth: 380,
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <LinearGradient
            colors={['#140E08', '#080503']}
            style={{ padding: 32, alignItems: 'center' }}
          >
            {/* Close button */}
            <Pressable
              onPress={onClose}
              style={{ position: 'absolute', top: 16, right: 16, padding: 8 }}
            >
              <X size={20} color="rgba(242,224,200,0.3)" />
            </Pressable>

            {/* Title */}
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              fontFamily: serifFont,
              color: colors.text,
              marginBottom: 8,
              letterSpacing: -0.5,
            }}>
              Invite & Earn
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 28 }}>
              Share your link to earn referral XP.
            </Text>

            {/* QR Code */}
            <View style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: '#080503',
              padding: 16,
              marginBottom: 28,
            }}>
              <Image
                source={{ uri: qrUrl }}
                style={{ width: 192, height: 192, borderRadius: 8, opacity: 0.9 }}
              />
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {/* Copy Link */}
              <Pressable
                onPress={handleCopy}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#221509',
                  borderRadius: 12,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
              >
                <Copy size={16} color={colors.text} />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>Copy Link</Text>
              </Pressable>

              {/* Share on X */}
              <Pressable
                onPress={handleShareX}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#000',
                  borderRadius: 12,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Share2 size={16} color={colors.text} />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>Post on X</Text>
              </Pressable>
            </View>

            {/* Native Share */}
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={handleNativeShare}
                style={{
                  marginTop: 12,
                  width: '100%',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <LinearGradient
                  colors={['#6B4420', '#B8863F', '#E8C890']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontWeight: 'bold', color: '#140D07', fontSize: 14 }}>Share via...</Text>
                </LinearGradient>
              </Pressable>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
