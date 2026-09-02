# Project Brain & Changelog

This document serves as the concise memory and state tracker for this project. By keeping this updated, we can maintain context across sessions and minimize token usage.

## Architecture Overview
- **Core:** React Native + Expo (SDK 52+).
- **Routing:** Expo Router.
- **Styling:** NativeWind v4 (Tailwind CSS) + built-in React Native stylesheets.
- **Backend/DB:** Supabase (Authentication & PostgreSQL Database).
- **Icons:** `lucide-react-native`.

## Recent Changes

### [2026-08-28] Feed & FeedCard Polish
- **Filter Pills (`src/app/(tabs)/index.tsx`)**:
  - Fixed active pill text and icon contrast in dark mode (now renders crisp black on white, eliminating solid blank white pills).
- **Feed Card Redesign (`src/components/FeedCard.tsx`)**:
  - Transformed feed posts to authentic Threads continuous stream aesthetic with left vertical thread line, handle display, verified badge, and clean rounded media.
  - Interactive social action bar (`Heart` with like counter, `MessageSquare`, `Repeat`, `Send`, `Bookmark`).
- **OLED True Black Dark Mode Theme (`src/hooks/use-theme.ts` & `src/constants/theme.ts`)**:
  - Pure OLED Black (`#000000`) and neutral dark surfaces (`#121212`, `#181818`) without purple or navy blue undertones.
- **Verification**:
  - `npx tsc --noEmit` & `npm run lint` passing with **0 Errors**.

## Project Health & Status
- **TypeScript:** 0 Errors
- **ESLint:** 0 Errors
- **Navigation Tree:** Fully aligned with Expo Router conventions.

