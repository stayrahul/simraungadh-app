// @ts-nocheck
/**
 * Simraungadh Modern Design System – Royal Azure & Cyan Theme
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    background: '#ffffff',
    backgroundElement: '#f1f5f9',
    backgroundSelected: '#e2e8f0',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    primary: '#4f46e5', // Indigo
    primaryDark: '#3730a3',
    primaryLight: '#818cf8',
    card: '#ffffff',
    cardSubtle: '#f8fafc',
    cardElevated: '#ffffff',
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    tint: '#4f46e5',
    skeleton: '#e2e8f0',
    overlay: 'rgba(15, 23, 42, 0.4)',
    glassBg: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.4)',
    // Accent palette
    success: '#10b981',
    successBg: '#ecfdf5',
    warning: '#f59e0b',
    warningBg: '#fffbeb',
    danger: '#ef4444',
    dangerBg: '#fef2f2',
    info: '#0284c7',
    infoBg: '#f0f9ff',
    purple: '#7c3aed',
    pink: '#06b6d4',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#121212',
    backgroundSelected: '#1c1c1e',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    primary: '#ffffff',
    primaryDark: '#e4e4e7',
    primaryLight: '#ffffff',
    card: '#121212',
    cardSubtle: '#0a0a0a',
    cardElevated: '#18181b',
    border: 'rgba(255, 255, 255, 0.1)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    tint: '#ffffff',
    skeleton: '#18181b',
    overlay: 'rgba(0, 0, 0, 0.85)',
    glassBg: 'rgba(18, 18, 18, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    // Accent palette
    success: '#34d399',
    successBg: 'rgba(16, 185, 129, 0.15)',
    warning: '#fbbf24',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    danger: '#f87171',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    info: '#38bdf8',
    infoBg: 'rgba(56, 189, 248, 0.15)',
    purple: '#a78bfa',
    pink: '#22d3ee',
  }
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
