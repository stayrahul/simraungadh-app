# Simraungadh Municipality App (सिम्रौनगढ नगरपालिका)

A modern, high-performance civic engagement and municipal communication mobile application for Simraungadh Municipality, built with **React Native**, **Expo (SDK 52+)**, **NativeWind (Tailwind CSS)**, and **Supabase**.

---

## Key Features

- **Civic Feed & Reports**: Real-time municipal feeds with Threads-style continuous stream, community updates, issue tracking, and rich media galleries.
- **Official Notices & Circulars**: Push notification support and unread notice indicators for municipal announcements.
- **Municipal Services & Directory**: Emergency contacts, ward-level government directory, waste schedules, and civic service request management.
- **Citizen & Official Profiles**: Verification badges, ward affiliation, role-based administration panel, and profile management.
- **Global Search**: Instant cross-entity search for citizens, notices, civic issues, and municipal directory contacts.
- **Dual Language Support**: Seamless English and Nepali (नेपाली) language switching with localized date formatting.
- **OLED Dark Mode**: True OLED black theme support with smooth adaptive UI transitions.
- **Offline Reliability**: Network status tracking with automatic offline banners and optimistic client cache.

---

## Project Structure

```
simraungadh-app/
├── android/                 # Native Android configuration & build assets
├── assets/                  # App branding, icons, and media
│   ├── expo.icon/           # Modern adaptive app icons
│   └── images/              # Logos, splash screens, and illustrations
├── docs/                    # Design, architecture, and showcase docs
│   ├── DESIGN.md            # Visual system, colors, and UI guidelines
│   ├── brain.md             # Project state, memory, and changelog
│   ├── Simraungadh_App_Presentation.pdf
│   └── simraungadh_app_showcase.png
├── src/
│   ├── app/                 # Expo Router (file-based navigation)
│   │   ├── (tabs)/          # Primary Tab Navigation (Feed, Notices, FAB, Services, Profile)
│   │   ├── issue/[id].tsx   # Civic issue details & comments
│   │   ├── user/[id].tsx    # Public profile view
│   │   ├── admin.tsx        # Municipal admin portal
│   │   ├── search.tsx       # Global search modal
│   │   └── _layout.tsx      # Root Stack Layout & Splash Screen
│   ├── components/          # Reusable UI components & barrel export (index.ts)
│   ├── constants/           # Design tokens, themes, and municipal configurations
│   ├── hooks/               # Custom React hooks (theme, notifications, color scheme)
│   ├── lib/                 # Core utilities (Supabase, nepaliDate, translations, types)
│   └── store/               # Zustand state stores (auth, language, settings, bookmarks)
├── supabase/                # PostgreSQL schema & database migrations
│   └── schema.sql           # Complete database DDL & RLS policies
├── app.json                 # Expo application configuration
├── babel.config.js          # Babel preset configuration
├── eas.json                 # Expo Application Services build profiles
├── global.css               # NativeWind Tailwind CSS root
├── metro.config.js          # Metro bundler configuration with NativeWind
├── package.json             # NPM dependencies and scripts
├── tailwind.config.js       # Tailwind CSS theme configuration
└── tsconfig.json            # TypeScript configuration with path aliases (@/*)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on your physical mobile device or an Android/iOS simulator

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_preset
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Start Development Server

Run the development server:

```bash
npx expo start -c
```

- Press `a` to open in Android emulator.
- Press `i` to open in iOS simulator.
- Press `w` to open in Web browser.
- Scan the QR code with **Expo Go** on Android or Camera app on iOS.

---

## Quality & Verification

Run TypeScript verification:
```bash
npx tsc --noEmit
```

Run ESLint:
```bash
npm run lint
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
