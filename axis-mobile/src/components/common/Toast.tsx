import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { colors } from '../../config/theme';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap = {
  success: colors.positive,
  error: colors.negative,
  info: colors.info,
};

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const Icon = iconMap[type];
  const color = colorMap[type];

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="flex-row items-center px-4 py-3 rounded-xl max-w-[90%]"
      style={{
        backgroundColor: 'rgba(28, 25, 23, 0.95)',
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Icon size={18} color={color} />
      <Text className="text-stone-200 text-sm ml-2 flex-1" numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
};
