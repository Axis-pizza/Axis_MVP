import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Check, TrendingUp, TrendingDown } from 'lucide-react-native';
import { colors } from '../../config/theme';
import type { TokenInfo } from '../../types';

interface TokenCardProps {
  token: TokenInfo;
  selected?: boolean;
  onSelect?: (token: TokenInfo) => void;
  showPrice?: boolean;
  compact?: boolean;
}

export function TokenCard({ token, selected, onSelect, showPrice = true, compact = false }: TokenCardProps) {
  const change = token.change24h || 0;
  const isPositive = change >= 0;

  if (compact) {
    return (
      <Pressable
        onPress={() => onSelect?.(token)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: selected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
          borderWidth: 1,
          borderColor: selected ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)',
        }}
      >
        {token.logoURI ? (
          <Image source={{ uri: token.logoURI }} style={{ width: 24, height: 24, borderRadius: 12 }} />
        ) : (
          <View style={{
            width: 24, height: 24, borderRadius: 12,
            backgroundColor: colors.surfaceLight,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text }}>{token.symbol.charAt(0)}</Text>
          </View>
        )}
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{token.symbol}</Text>
        {selected && <Check size={16} color="#10B981" style={{ marginLeft: 'auto' } as any} />}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onSelect?.(token)}
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: selected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? 'rgba(16,185,129,0.4)' : colors.border,
        overflow: 'hidden',
      }}
    >
      {/* Selected checkmark */}
      {selected && (
        <View style={{
          position: 'absolute', top: 12, right: 12,
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: '#10B981',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Check size={16} color="#000" />
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {token.logoURI ? (
          <Image source={{ uri: token.logoURI }} style={{ width: 40, height: 40, borderRadius: 20 }} />
        ) : (
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.surfaceLight,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ fontWeight: 'bold', color: colors.text }}>{token.symbol.charAt(0)}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: 'bold', color: colors.text }}>{token.symbol}</Text>
            {token.sector && (
              <View style={{
                paddingHorizontal: 6, paddingVertical: 2,
                borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)',
              }}>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{token.sector}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>{token.name}</Text>
        </View>
      </View>

      {showPrice && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
            ${token.priceFormatted || token.price?.toFixed(2) || '—'}
          </Text>
          {change !== 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {isPositive ? (
                <TrendingUp size={12} color={colors.positive} />
              ) : (
                <TrendingDown size={12} color={colors.negative} />
              )}
              <Text style={{ fontSize: 11, color: isPositive ? colors.positive : colors.negative }}>
                {isPositive ? '+' : ''}{change.toFixed(2)}%
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
