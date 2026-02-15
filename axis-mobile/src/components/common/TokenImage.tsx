import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, StyleProp } from 'react-native';

const FALLBACK_IMAGE = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

interface TokenImageProps {
  src?: string | null;
  alt?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export const TokenImage = ({ src, alt, size = 24, style }: TokenImageProps) => {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMAGE);
  const [hasError, setHasError] = useState(false);

  // Fallback display when an error occurs or no source is provided
  const handleError = () => {
    if (imgSrc !== FALLBACK_IMAGE) {
      setImgSrc(FALLBACK_IMAGE);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }, style]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
          {(alt || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imgSrc }}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      onError={handleError}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 'bold',
  },
});
