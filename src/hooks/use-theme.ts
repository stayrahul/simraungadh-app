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
      boxShadow: `0px 8px 24px ${color}${isDark ? '70' : '45'}`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.45 : 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
  });
  shadowCache[key] = shadow;
  return shadow;
}

const LIGHT_THEME = {
  isDark: false,
  colors: Colors.light,
  bgClass: 'bg-[#f8fafc]',
  headerBgClass: 'bg-white/90 border-slate-200/80',
  cardClass: 'bg-white border-slate-200/80',
  cardSubtleClass: 'bg-slate-50/90 border-slate-200/60',
  cardElevatedClass: 'bg-white border-slate-200',
  glassCardClass: 'bg-white/85 border-slate-200/80',
  chipClass: 'bg-slate-100/90 border-slate-200/80 text-slate-700',
  chipActiveClass: 'bg-blue-600 border-blue-600 text-white',
  textClass: 'text-slate-900',
  textSecondaryClass: 'text-slate-600',
  textMutedClass: 'text-slate-400',
  borderClass: 'border-slate-200/80',
  borderSubtleClass: 'border-slate-100',
  iconColor: '#64748b',
  iconActiveColor: '#2563eb',
  inputClass: 'bg-white border-slate-200 text-slate-900',
  inputPlaceholder: '#94a3b8',
  statusBar: 'dark' as const,
  blurTint: 'light' as const,
  blurIntensity: 90,
  cardShadow: Platform.select({
    web: {
      boxShadow: '0px 10px 30px rgba(37, 99, 235, 0.08)',
    },
    default: {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
  }),
  glowShadow: (color: string) => getGlowShadow(color, false),
};

const DARK_THEME = {
  isDark: true,
  colors: Colors.dark,
  bgClass: 'bg-[#080d1a]',
  headerBgClass: 'bg-[#080d1a]/90 border-white/[0.08]',
  cardClass: 'bg-[#11192e] border-white/[0.09]',
  cardSubtleClass: 'bg-[#0f172a] border-white/[0.06]',
  cardElevatedClass: 'bg-[#1c2640] border-white/[0.14]',
  glassCardClass: 'bg-[#11192e]/85 border-white/10',
  chipClass: 'bg-[#1e293b] border-white/10 text-slate-300',
  chipActiveClass: 'bg-blue-600 border-blue-500 text-white',
  textClass: 'text-slate-50',
  textSecondaryClass: 'text-slate-300',
  textMutedClass: 'text-slate-400',
  borderClass: 'border-white/[0.09]',
  borderSubtleClass: 'border-white/[0.05]',
  iconColor: '#94a3b8',
  iconActiveColor: '#60a5fa',
  inputClass: 'bg-[#11192e] border-white/10 text-slate-100',
  inputPlaceholder: '#64748b',
  statusBar: 'light' as const,
  blurTint: 'dark' as const,
  blurIntensity: 90,
  cardShadow: Platform.select({
    web: {
      boxShadow: '0px 10px 32px rgba(0, 0, 0, 0.55)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 20,
      elevation: 7,
    },
  }),
  glowShadow: (color: string) => getGlowShadow(color, true),
};

export function useTheme() {
  const darkMode = useSettingsStore(state => state.darkMode);
  return darkMode ? DARK_THEME : LIGHT_THEME;
}
