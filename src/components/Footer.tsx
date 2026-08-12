// @ts-nocheck
import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { PhoneCall, Flame, HeartPulse, Phone, Sparkles, Heart, Code2, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/use-theme';
import { useLangStore } from '../store/langStore';

export default function Footer() {
  const theme = useTheme();
  const router = useRouter();
  const { language } = useLangStore();
  const isNe = language === 'ne';

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

}