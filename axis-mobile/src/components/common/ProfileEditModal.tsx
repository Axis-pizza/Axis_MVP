import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { X, Save, Camera, User } from 'lucide-react-native';
import { api } from '../../services/api';
import { useToast } from './context/ToastContext';
import { colors, serifFont } from '../../config/theme';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  currentProfile: {
    pubkey: string;
    username?: string;
    bio?: string;
    avatar_url?: string;
  };
  onUpdate: () => void;
}

export function ProfileEditModal({ visible, onClose, currentProfile, onUpdate }: ProfileEditModalProps) {
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pfpUrl, setPfpUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isExistingUser = !!currentProfile.username;

  useEffect(() => {
    if (visible) {
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setPfpUrl(currentProfile.avatar_url || '');
    }
  }, [visible, currentProfile]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setUploading(true);
      try {
        const res = await api.uploadProfileImage(asset.uri, currentProfile.pubkey);
        if (res.success && res.key) {
          setPfpUrl(res.key);
          showToast('Image Uploaded', 'success');
        } else {
          // Fallback: use local URI
          setPfpUrl(asset.uri);
        }
      } catch {
        // Use local URI as fallback
        setPfpUrl(asset.uri);
      }
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.updateProfile({
        wallet_address: currentProfile.pubkey,
        username,
        bio,
        pfpUrl,
      });

      if (res.success) {
        showToast(isExistingUser ? 'Profile Updated!' : 'Welcome to Axis!', 'success');
        onUpdate();
        onClose();
      } else {
        showToast(res.error || 'Save Failed', 'error');
      }
    } catch {
      showToast('System Error', 'error');
    }
    setLoading(false);
  };

  const displayUrl = pfpUrl?.startsWith('http') || pfpUrl?.startsWith('file') ? pfpUrl : undefined;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
      >
        <View style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <LinearGradient
            colors={['#140E08', '#080503']}
            style={{ padding: 0 }}
          >
            {/* Header */}
            <View style={{
              padding: 24, paddingBottom: 16,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              borderBottomWidth: 1, borderBottomColor: 'rgba(184,134,63,0.1)',
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                {isExistingUser ? 'Edit Profile' : 'Create Account'}
              </Text>
              <Pressable onPress={onClose} style={{ padding: 8 }}>
                <X size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              {/* Avatar */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Pressable onPress={handlePickImage} disabled={uploading}>
                  <View style={{
                    width: 128, height: 128, borderRadius: 64, overflow: 'hidden',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderWidth: 4, borderColor: displayUrl ? 'rgba(184,134,63,0.5)' : 'rgba(255,255,255,0.1)',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    {uploading ? (
                      <ActivityIndicator size="large" color={colors.accent} />
                    ) : displayUrl ? (
                      <Image source={{ uri: displayUrl }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Camera size={40} color="rgba(255,255,255,0.2)" />
                    )}
                  </View>
                </Pressable>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Tap to upload</Text>
              </View>

              {/* Username */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginLeft: 4 }}>Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    padding: 16,
                    backgroundColor: '#080503',
                    borderWidth: 1, borderColor: colors.border,
                    borderRadius: 12,
                    color: colors.text,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* Bio */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginLeft: 4 }}>Bio</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Bio"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  style={{
                    padding: 16,
                    backgroundColor: '#080503',
                    borderWidth: 1, borderColor: colors.border,
                    borderRadius: 12,
                    color: colors.text,
                    fontSize: 15,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={loading || uploading}
                style={{ borderRadius: 12, overflow: 'hidden', opacity: (loading || uploading) ? 0.5 : 1, marginBottom: 24 }}
              >
                <LinearGradient
                  colors={['#6B4420', '#B8863F', '#E8C890']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: 16, borderRadius: 12,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {loading ? <ActivityIndicator size="small" color="#140D07" /> : <Save size={20} color="#140D07" />}
                  <Text style={{ fontWeight: 'bold', color: '#140D07', fontSize: 15 }}>
                    {isExistingUser ? 'Save Changes' : 'Complete Registration'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
