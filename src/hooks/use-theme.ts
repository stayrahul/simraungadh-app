// @ts-nocheck
import { Platform } from 'react-native';
import { Colors } from '../constants/theme';
import { useSettingsStore } from '../store/settingsStore';

const shadowCache: Record<string, any> = {};

function getGlowShadow(color: string, isDark: boolean) {
  const key = `${color}_${isDark}`;
  if (shadowCache[key]) return shadowCache[key];
  const shadow = Platform.select({
    web: {
      boxShadow: `0px 12px 32px ${color}${isDark ? '60' : '30'}`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.35 : 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
  });
  shadowCache[key] = shadow;
  return shadow;
}

const LIGHT_THEME = {
  isDark: false,
  colors: Colors.light,
  bgClass: 'bg-[#F8FAFC]', // Stitch Civic Modern Off-White
  headerBgClass: 'bg-white/80 border-b border-slate-200/50', // Glassmorphic header
  cardClass: 'bg-white rounded-[28px] border border-slate-200/70',
  cardSubtleClass: 'bg-white rounded-[24px] border border-slate-100',
  cardElevatedClass: 'bg-white rounded-[28px] border border-slate-200/80 shadow-[0px_8px_30px_rgba(0,0,0,0.04)]',
  glassCardClass: 'bg-white/75 rounded-[28px] border border-white/60 overflow-hidden', 
  chipClass: 'bg-white border-slate-200/80 text-[#191C1E] rounded-full',
  chipActiveClass: 'bg-indigo-600 border-indigo-600 text-white rounded-full',
  textClass: 'text-[#191C1E]', 
  textSecondaryClass: 'text-[#475569]',
  textMutedClass: 'text-[#94a3b8]',
  borderClass: 'border-slate-200/80',
  borderSubtleClass: 'border-slate-100',
  iconColor: '#64748b',
  iconActiveColor: '#4F46E5', // Indigo primary
  inputClass: 'bg-white border border-slate-200 rounded-[16px] text-[#191C1E] px-4',
  inputPlaceholder: '#94a3b8',
  statusBar: 'dark' as const,
  blurTint: 'light' as const,
  blurIntensity: 24, // High backdrop blur
  cardShadow: Platform.select({
    web: {
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 16,
      elevation: 2,
    },
  }),
  glowShadow: (color: string) => getGlowShadow(color, false),
  // Semantic color tokens
  textMuted: '#777587',
  textPrimary: '#191C1E',
  textSecondary: '#2D3133',
  accentColor: '#4F46E5',
  accentGradient: ['#7C3AED', '#4F46E5'] as const, // Violet to Indigo
  dangerColor: '#BA1A1A',
  successColor: '#10B981',
  warningColor: '#F59E0B',
  tabBarBg: 'rgba(255, 255, 255, 0.85)',
  tabBarBorder: 'rgba(255, 255, 255, 0.5)',
  // New design tokens
  sectionHeaderStyle: { fontSize: 11, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#777587' },
  inputFocusedClass: 'bg-white border-[#4F46E5]/30 rounded-[16px]',
  destructiveButtonClass: 'bg-[#BA1A1A]/10 border border-[#BA1A1A]/20 rounded-[20px]',
  emptyStateIcon: '#94a3b8',
  dividerClass: 'border-slate-100',
  pillActiveClass: 'bg-indigo-600 border-indigo-600',
  pillInactiveClass: 'bg-slate-100 border-slate-200',
};

const DARK_THEME = {
  isDark: true,
  colors: Colors.dark,
  bgClass: 'bg-black', // Pure OLED Black #000000
  headerBgClass: 'bg-black/80 border-b border-white/10',
  cardClass: 'bg-[#121212] rounded-[28px] border border-white/10',
  cardSubtleClass: 'bg-[#0A0A0A] rounded-[24px] border border-white/5',
  cardElevatedClass: 'bg-[#181818] rounded-[28px] border border-white/10',
  glassCardClass: 'bg-[#121212]/80 rounded-[28px] border border-white/10 overflow-hidden',
  chipClass: 'bg-[#181818] border-transparent text-zinc-300 rounded-full',
  chipActiveClass: 'bg-white text-black rounded-full',
  textClass: 'text-white',
  textSecondaryClass: 'text-[#A1A1AA]',
  textMutedClass: 'text-[#71717A]',
  borderClass: 'border-white/10',
  borderSubtleClass: 'border-white/5',
  iconColor: '#71717a',
  iconActiveColor: '#FFFFFF',
  inputClass: 'bg-[#121212] border border-white/10 rounded-[16px] text-white px-4',
  inputPlaceholder: '#71717A',
  statusBar: 'light' as const,
  blurTint: 'dark' as const,
  blurIntensity: 24,
  cardShadow: Platform.select({
    web: {
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.8)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 4,
    },
  }),
  glowShadow: (color: string) => getGlowShadow(color, true),
  // Semantic color tokens
  textMuted: '#71717A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  accentColor: '#FFFFFF',
  accentGradient: ['#FFFFFF', '#E4E4E7'] as const,
  dangerColor: '#FF453A',
  successColor: '#30D158',
  warningColor: '#FF9F0A',
  tabBarBg: 'rgba(10, 10, 10, 0.95)',
  tabBarBorder: 'rgba(255, 255, 255, 0.1)',
  // New design tokens
  sectionHeaderStyle: { fontSize: 11, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#71717A' },
  inputFocusedClass: 'bg-[#181818] border-white/30 rounded-[16px]',
  destructiveButtonClass: 'bg-[#FF453A]/15 border border-[#FF453A]/30 rounded-[20px]',
  emptyStateIcon: '#3f3f46',
  dividerClass: 'border-white/10',
  pillActiveClass: 'bg-white border-white',
  pillInactiveClass: 'bg-white/[0.06] border-white/10',
};

export function useTheme() {
  const darkMode = useSettingsStore(state => state.darkMode);
  const base = darkMode ? DARK_THEME : LIGHT_THEME;
  return {
    ...base,
    // Helper to format relative time
    timeAgo: (dateStr: string) => {
      const now = Date.now();
      const then = new Date(dateStr).getTime();
      const diff = Math.floor((now - then) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
      if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },
  };
}
