/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Civic Clarity Theme Palette
        primary: {
          DEFAULT: '#4f46e5', // Indigo
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: {
          DEFAULT: '#7c3aed', // Violet
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        background: '#f8fafc',
        backgroundDark: '#080d1a',
        surface: '#ffffff',
        surfaceDark: '#11192e',
        surfaceLight: '#f1f5f9',
        glass: 'rgba(255, 255, 255, 0.7)',
        glassDark: 'rgba(17, 25, 46, 0.85)',
        glassBorder: 'rgba(255, 255, 255, 0.4)',
        glassBorderDark: 'rgba(255, 255, 255, 0.1)',
        accent: '#4f46e5',
        accentGlow: '#c3c0ff',
        textPrimary: '#0f172a',
        textPrimaryDark: '#f8fafc',
        textSecondary: '#475569',
        textSecondaryDark: '#cbd5e1',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        borderDark: 'rgba(255, 255, 255, 0.09)',
        like: '#f43f5e',
        card: '#ffffff',
        cardDark: '#11192e',
      },
      borderRadius: {
        '3xl': '32px', // Civic Clarity Extreme Radius
        'full': '9999px', // Pill-shape
      }
    },
  },
  plugins: [],
}
