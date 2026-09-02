// @ts-nocheck
import React from 'react';
import { View, Text } from 'react-native';
import { Clock, Loader2, CheckCircle2, XCircle, Tag, AlertTriangle, Building } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';

import { useLangStore } from '../store/langStore';
import { translations } from '../lib/translations';

type BadgeType = 'pending' | 'in_progress' | 'resolved' | 'rejected' | 'category' | 'emergency' | 'general' | 'department';

interface BadgeProps {
  type: BadgeType;
  text: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<BadgeType, { bgDark: string; bgLight: string; textDark: string; textLight: string; borderDark: string; borderLight: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  pending: {
    bgDark: 'bg-amber-500/15',
    bgLight: 'bg-amber-50',
    borderDark: 'border-amber-500/30',
    borderLight: 'border-amber-200',
    textDark: 'text-amber-300',
    textLight: 'text-amber-700',
    icon: Clock,
  },
  in_progress: {
    bgDark: 'bg-sky-500/15',
    bgLight: 'bg-sky-50',
    borderDark: 'border-sky-500/30',
    borderLight: 'border-sky-200',
    textDark: 'text-sky-300',
    textLight: 'text-sky-700',
    icon: Loader2,
  },
  resolved: {
    bgDark: 'bg-emerald-500/15',
    bgLight: 'bg-emerald-50',
    borderDark: 'border-emerald-500/30',
    borderLight: 'border-emerald-200',
    textDark: 'text-emerald-300',
    textLight: 'text-emerald-700',
    icon: CheckCircle2,
  },
  rejected: {
    bgDark: 'bg-rose-500/15',
    bgLight: 'bg-rose-50',
    borderDark: 'border-rose-500/30',
    borderLight: 'border-rose-200',
    textDark: 'text-rose-300',
    textLight: 'text-rose-700',
    icon: XCircle,
  },
  category: {
    bgDark: 'bg-primary-500/15',
    bgLight: 'bg-primary-50',
    borderDark: 'border-primary-500/30',
    borderLight: 'border-blue-200',
    textDark: 'text-primary-300',
    textLight: 'text-blue-700',
    icon: Tag,
  },
  emergency: {
    bgDark: 'bg-rose-500/20',
    bgLight: 'bg-rose-50',
    borderDark: 'border-rose-500/40',
    borderLight: 'border-rose-300',
    textDark: 'text-rose-300',
    textLight: 'text-rose-700',
    icon: AlertTriangle,
  },
  general: {
    bgDark: 'bg-slate-500/15',
    bgLight: 'bg-slate-100',
    borderDark: 'border-slate-500/30',
    borderLight: 'border-slate-200',
    textDark: 'text-slate-300',
    textLight: 'text-slate-700',
    icon: Tag,
  },
  department: {
    bgDark: 'bg-sky-500/15',
    bgLight: 'bg-sky-50',
    borderDark: 'border-sky-500/30',
    borderLight: 'border-sky-200',
    textDark: 'text-sky-300',
    textLight: 'text-sky-700',
    icon: Building,
  },
};

export default function Badge({ type, text, className = '', showIcon = true, size = 'sm' }: BadgeProps) {
  const config = BADGE_CONFIG[type] || BADGE_CONFIG.category;
  const IconComp = config.icon;
  const theme = useTheme();
  const { language } = useLangStore();
  const t = translations[language] || translations.en;

  const iconColor = type === 'pending' ? (theme.isDark ? '#fcd34d' : '#d97706') :
                    type === 'in_progress' ? (theme.isDark ? '#7dd3fc' : '#0284c7') :
                    type === 'resolved' ? (theme.isDark ? '#6ee7b7' : '#059669') :
                    type === 'rejected' ? (theme.isDark ? '#fda4af' : '#e11d48') :
                    type === 'emergency' ? (theme.isDark ? '#fda4af' : '#dc2626') :
                    type === 'department' ? (theme.isDark ? '#7dd3fc' : '#0284c7') :
                    (theme.isDark ? '#818cf8' : '#4f46e5');

  const isSmall = size === 'sm';

  const textKey = text ? text.toLowerCase().replace(/ /g, '_') : '';
  const translatedText = t[textKey] || t[text?.toLowerCase()] || text;

  return (
    <View className={`flex-row items-center border ${isSmall ? 'px-2.5 py-0.5' : 'px-3 py-1'} rounded-full ${
      theme.isDark ? `${config.bgDark} ${config.borderDark}` : `${config.bgLight} ${config.borderLight}`
    } ${className}`}>
      {showIcon && <IconComp size={isSmall ? 10 : 12} color={iconColor} />}
      <Text className={`${isSmall ? 'text-[10px]' : 'text-[11px]'} font-extrabold tracking-tight ${showIcon ? 'ml-1' : ''} ${
        theme.isDark ? config.textDark : config.textLight
      }`}>
        {translatedText}
      </Text>
    </View>
  );
}
