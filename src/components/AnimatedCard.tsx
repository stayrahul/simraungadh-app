// @ts-nocheck
import React, { memo, useCallback } from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/use-theme';

interface AnimatedCardProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const AnimatedCard = memo(function AnimatedCard({ children, className = '', style, onPress, ...props }: AnimatedCardProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400, mass: 0.8 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400, mass: 0.8 });
  }, [scale]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={{ width: '100%' }}
      {...props}
    >
      <Animated.View
        style={[
          { width: '100%' },
          animatedStyle,
          theme.cardShadow,
          theme.isDark 
            ? { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderRadius: 16 } 
            : { backgroundColor: '#ffffff', borderColor: 'rgba(226,232,240,0.7)', borderWidth: 1, borderRadius: 16 },
          style
        ]}
        className={`rounded-2xl overflow-hidden ${className}`}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
});

export default AnimatedCard;

