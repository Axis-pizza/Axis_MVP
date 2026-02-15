import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Send, ExternalLink, Trash2 } from 'lucide-react-native';
import { useToast } from './context/ToastContext';
import { colors, serifFont } from '../../config/theme';
import { API_BASE } from '../../config/constants';

interface BugDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function BugDrawer({ visible, onClose }: BugDrawerProps) {
  const { showToast } = useToast();
  const [tgId, setTgId] = useState('');
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const clearImage = () => {
    setImageUri(null);
  };

  const handleSubmit = async () => {
    if (!tgId.trim() || !message.trim()) return;
    setIsSending(true);
    setStatus('idle');

    try {
      let imageBase64: string | null = null;
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        imageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const res = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_tg: tgId,
          message,
          image: imageBase64,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
        setTgId('');
        setMessage('');
        clearImage();
      }, 2000);
    } catch {
      setStatus('error');
      showToast('Transmission failed', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenTelegram = () => {
    Linking.openURL('https://t.me/muse_jp');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View style={{
          backgroundColor: '#050505',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          maxHeight: '85%',
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </View>

          <ScrollView style={{ paddingHorizontal: 24 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
            {/* Close */}
            <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, padding: 8, zIndex: 10 }}>
              <X size={24} color="rgba(255,255,255,0.3)" />
            </Pressable>

            {/* Direct Line - Founder Card */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)',
                letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12,
              }}>
                Direct Line
              </Text>

              <Pressable onPress={handleOpenTelegram}>
                <LinearGradient
                  colors={['rgba(107,68,32,0.3)', '#000', 'rgba(20,13,7,0.8)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(184,134,63,0.2)',
                    padding: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  {/* Avatar */}
                  <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    borderWidth: 2, borderColor: 'rgba(184,134,63,0.3)',
                    backgroundColor: colors.surface,
                    justifyContent: 'center', alignItems: 'center',
                    overflow: 'hidden',
                  }}>
                    <Text style={{ fontSize: 24 }}>M</Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontFamily: serifFont, fontSize: 20, fontStyle: 'italic' }}>Muse</Text>
                      <View style={{
                        paddingHorizontal: 6, paddingVertical: 2,
                        backgroundColor: 'rgba(184,134,63,0.1)',
                        borderWidth: 1, borderColor: 'rgba(184,134,63,0.2)',
                        borderRadius: 2,
                      }}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', color: colors.accent, letterSpacing: 2 }}>FOUNDER</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Send size={12} color="rgba(184,134,63,0.5)" />
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@muse_jp</Text>
                    </View>
                  </View>

                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <ExternalLink size={14} color="rgba(255,255,255,0.2)" />
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>OR SEND SIGNAL</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </View>

            {/* Success State */}
            {status === 'success' ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: 'rgba(184,134,63,0.1)',
                  borderWidth: 1, borderColor: 'rgba(184,134,63,0.2)',
                  justifyContent: 'center', alignItems: 'center',
                  marginBottom: 16,
                }}>
                  <Send size={32} color={colors.accent} />
                </View>
                <Text style={{ fontSize: 24, fontStyle: 'italic', color: '#fff', fontFamily: serifFont, marginBottom: 8 }}>
                  Signal Transmitted.
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                  We will analyze your report shortly.
                </Text>
              </View>
            ) : (
              <>
                {/* Telegram ID */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 9, color: 'rgba(184,134,63,0.7)', letterSpacing: 3, fontWeight: 'bold', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' }}>
                    Your ID
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ position: 'absolute', left: 12, zIndex: 1, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>@</Text>
                    <TextInput
                      value={tgId}
                      onChangeText={setTgId}
                      placeholder="Telegram Username"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                      style={{
                        flex: 1,
                        backgroundColor: '#111',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        paddingVertical: 12, paddingLeft: 32, paddingRight: 16,
                        color: '#fff', fontSize: 14,
                      }}
                    />
                  </View>
                </View>

                {/* Message */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 9, color: 'rgba(184,134,63,0.7)', letterSpacing: 3, fontWeight: 'bold', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' }}>
                    Message
                  </Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Report a bug or suggest a feature..."
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: '#111',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: 16,
                      color: '#fff', fontSize: 15, fontFamily: serifFont,
                      minHeight: 120, textAlignVertical: 'top',
                      lineHeight: 22,
                    }}
                  />
                </View>

                {/* Image Attachment */}
                {!imageUri ? (
                  <Pressable
                    onPress={handlePickImage}
                    style={{
                      paddingVertical: 12,
                      borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Camera size={16} color="rgba(255,255,255,0.3)" />
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 }}>Attach Screenshot</Text>
                  </Pressable>
                ) : (
                  <View style={{
                    borderRadius: 12, overflow: 'hidden',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                    marginBottom: 16,
                  }}>
                    <Image source={{ uri: imageUri }} style={{ width: '100%', height: 128 }} resizeMode="cover" />
                    <Pressable
                      onPress={clearImage}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        padding: 8, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8,
                      }}
                    >
                      <Trash2 size={16} color="rgba(239,68,68,0.8)" />
                    </Pressable>
                  </View>
                )}

                {/* Submit */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSending || !tgId.trim() || !message.trim()}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
                    opacity: (isSending || !tgId.trim() || !message.trim()) ? 0.5 : 1,
                    marginTop: 8,
                  }}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Text style={{ fontFamily: serifFont, fontSize: 17, fontWeight: 'bold', color: '#000' }}>Transmit Signal</Text>
                      <Send size={18} color="#000" />
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
