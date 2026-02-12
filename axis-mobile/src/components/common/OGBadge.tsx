import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';

interface OGBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

export const OGBadge = ({ size = 'sm' }: OGBadgeProps) => {
  
  // サイズごとのスタイル定義
  const getBadgeStyle = () => {
    switch (size) {
      case 'lg': return { paddingHorizontal: 12, paddingVertical: 6, gap: 8 };
      case 'md': return { paddingHorizontal: 8, paddingVertical: 4, gap: 6 };
      case 'sm': default: return { paddingHorizontal: 6, paddingVertical: 2, gap: 4 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'lg': return 16;
      case 'md': return 14;
      case 'sm': default: return 12;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'lg': return 14;
      case 'md': return 12;
      case 'sm': default: return 10;
    }
  };

  return (
    <LinearGradient
      // Web版: from-yellow-600/20 to-amber-500/20
      // React Nativeでは16進数+Alphaで近似
      colors={['rgba(202, 138, 4, 0.2)', 'rgba(245, 158, 11, 0.2)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, getBadgeStyle()]}
    >
      <Crown size={getIconSize()} color="#EAB308" strokeWidth={2.5} />
      <Text style={[styles.text, { fontSize: getTextSize() }]}>VIP</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999, // rounded-full
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.5)', // border-yellow-500/50
    // shadow-[0_0_10px_rgba(234,179,8,0.2)] の再現はAndroid/iOSで異なるため簡易的に
  },
  text: {
    color: '#EAB308', // text-yellow-500
    fontWeight: 'bold',
  },
});