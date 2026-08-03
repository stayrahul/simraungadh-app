// @ts-nocheck
import React, { useEffect } from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/use-theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  className?: string;
}

export default function Skeleton({ width, height, borderRadius = 8, style, className }: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  const theme = useTheme();

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 900 }),
        withTiming(0.4, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className={className} style={style}>
      <Animated.View
        style={[
          { width: width || '100%', height: height || '100%', borderRadius },
          theme.isDark ? { backgroundColor: '#1a2540' } : { backgroundColor: '#e5e8ee' },
          animatedStyle,
        ]}
      />
    </View>
  );
}
