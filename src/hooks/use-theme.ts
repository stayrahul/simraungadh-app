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
  bgClass: 'bg-white', // Pure white background
  headerBgClass: 'bg-white/90 border-transparent', // Glassmorphic header
  cardClass: 'bg-white rounded-[32px] border-transparent shadow-sm', // Extreme radii
  cardSubtleClass: 'bg-white rounded-[24px] border-transparent',
  cardElevatedClass: 'bg-white rounded-[32px] shadow-[0px_8px_24px_rgba(79,70,229,0.08)] border-transparent',
  glassCardClass: 'bg-white rounded-[32px] border border-slate-100 overflow-hidden', // Solid white with subtle border
  chipClass: 'bg-[#F2F4F6] border-transparent text-[#464555] rounded-full',
  chipActiveClass: 'bg-[#4F46E5] border-[#4F46E5] text-white rounded-full shadow-[0px_8px_16px_rgba(79,70,229,0.25)]',
  textClass: 'text-[#191C1E]', 
  textSecondaryClass: 'text-[#2D3133]',
  textMutedClass: 'text-[#777587]',
  borderClass: 'border-[#E0E3E5]',
  borderSubtleClass: 'border-[#ECEEF0]',
  iconColor: '#777587',
  iconActiveColor: '#4F46E5', // Indigo primary
  inputClass: 'bg-white/50 border border-white/40 rounded-[16px] text-[#191C1E]',
  inputPlaceholder: '#777587',
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
  bgClass: 'bg-[#0A0A0C]', // Deep, sleek OLED with a hint of blue
  headerBgClass: 'bg-[#1C1C1E]/70 border-white/5',
  cardClass: 'bg-[#1C1C1E] rounded-[32px] border border-white/5',
  cardSubtleClass: 'bg-[#121212] rounded-[24px] border border-white/5',
  cardElevatedClass: 'bg-[#252528] rounded-[32px] shadow-[0px_8px_24px_rgba(0,0,0,0.4)] border border-white/10',
  glassCardClass: 'bg-[#1C1C1E]/70 rounded-[32px] border border-white/10 overflow-hidden',
  chipClass: 'bg-[#2C2C2E] border-transparent text-[#E0E3E5] rounded-full',
  chipActiveClass: 'bg-[#4F46E5] border-[#4F46E5] text-white rounded-full shadow-[0px_8px_16px_rgba(79,70,229,0.4)]',
  textClass: 'text-[#FFFFFF]',
  textSecondaryClass: 'text-[#E0E3E5]',
  textMutedClass: 'text-[#777587]',
  borderClass: 'border-white/10',
  borderSubtleClass: 'border-white/5',
  iconColor: '#777587',
  iconActiveColor: '#818CF8', // Lighter indigo for dark mode
  inputClass: 'bg-[#1C1C1E]/50 border border-white/10 rounded-[16px] text-[#FFFFFF]',
  inputPlaceholder: '#777587',
  statusBar: 'light' as const,
  blurTint: 'dark' as const,
  blurIntensity: 24,
  cardShadow: Platform.select({
    web: {
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.4)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 4,
    },
  }),
  glowShadow: (color: string) => getGlowShadow(color, true),
  // Semantic color tokens
  textMuted: '#777587',
  textPrimary: '#FFFFFF',
  textSecondary: '#E0E3E5',
  accentColor: '#818CF8',
  accentGradient: ['#A78BFA', '#818CF8'] as const,
  dangerColor: '#FF6B6B',
  successColor: '#34D399',
  warningColor: '#FBBF24',
  tabBarBg: 'rgba(28, 28, 30, 0.85)',
  tabBarBorder: 'rgba(255, 255, 255, 0.1)',
  // New design tokens
  sectionHeaderStyle: { fontSize: 11, fontWeight: '800' as const, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#777587' },
  inputFocusedClass: 'bg-[#1C1C1E]/80 border-[#818CF8]/50 rounded-[16px]',
  destructiveButtonClass: 'bg-[#FF6B6B]/15 border border-[#FF6B6B]/30 rounded-[20px]',
  emptyStateIcon: '#48484a',
  dividerClass: 'border-white/5',
  pillActiveClass: 'bg-[#818CF8]/20 border-[#818CF8]/40',
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
