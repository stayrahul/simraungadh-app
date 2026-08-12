// @ts-nocheck
import React from 'react';
import { View } from 'react-native';
import { BadgeCheck, ShieldCheck, HeartHandshake } from 'lucide-react-native';
import { BadgeType } from '../lib/types';
import { useTheme } from '../hooks/use-theme';

interface BadgeIconProps {
  type: BadgeType | null | undefined;
  size?: number;
  className?: string;
}

export function BadgeIcon({ type, size = 16, className = '' }: BadgeIconProps) {
  const theme = useTheme();

  if (!type || type === 'none') return null;

  switch (type) {
    case 'verified':
      // Blue Tick
      return (
        <View className={`items-center justify-center ${className}`}>
          <BadgeCheck size={size} color="#3b82f6" fill={theme.isDark ? '#1e3a8a' : '#eff6ff'} />
        </View>
      );
    case 'gold':
      // Gold Tick
      return (
        <View className={`items-center justify-center ${className}`}>
          <BadgeCheck size={size} color="#eab308" fill={theme.isDark ? '#713f12' : '#fef9c3'} />
        </View>
      );
    case 'contributor':
      // Green Tick
      return (
        <View className={`items-center justify-center ${className}`}>
          <HeartHandshake size={size} color="#10b981" fill={theme.isDark ? '#064e3b' : '#ecfdf5'} />
        </View>
      );
    default:
      return null;
  }
}
