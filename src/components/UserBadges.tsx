// @ts-nocheck
import React from 'react';
import { View } from 'react-native';
import { BadgeCheck, Crown, Star, ShieldCheck } from 'lucide-react-native';

interface UserBadgesProps {
  badges?: string[] | null;
  size?: number;
}

export function UserBadges({ badges, size = 16 }: UserBadgesProps) {
  if (!badges) return null;
  
  // Safely parse badges
  let parsedBadges: string[] = [];
  if (Array.isArray(badges)) {
    parsedBadges = badges;
  } else if (typeof badges === 'string') {
    if (badges.startsWith('{') && badges.endsWith('}')) {
      parsedBadges = badges.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    } else {
      try {
        parsedBadges = JSON.parse(badges);
      } catch (e) {
        parsedBadges = badges.split(',').map(s => s.trim());
      }
    }
  }

  if (parsedBadges.length === 0) return null;

  return (
    <View className="flex-row items-center gap-1.5 ml-1.5" style={{ transform: [{ translateY: 0.5 }] }}>
      {parsedBadges.includes('verified') && (
        <View style={{ shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
          <BadgeCheck size={size} color="#3b82f6" fill="#eff6ff" />
        </View>
      )}
      {parsedBadges.includes('gold') && (
        <View style={{ shadowColor: '#eab308', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
          <Crown size={size} color="#eab308" fill="#fefce8" />
        </View>
      )}
      {parsedBadges.includes('contributor') && (
        <View style={{ shadowColor: '#a855f7', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
          <Star size={size} color="#a855f7" fill="#faf5ff" />
        </View>
      )}
      {parsedBadges.includes('leader') && (
        <View style={{ shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
          <ShieldCheck size={size} color="#6366f1" fill="#eef2ff" />
        </View>
      )}
    </View>
  );
}
