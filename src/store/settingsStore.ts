// @ts-nocheck
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  // Theme
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  toggleDarkMode: () => void;

  // Privacy
  anonymousMode: boolean;
  setAnonymousMode: (val: boolean) => void;
  
  // Preferences
  hapticsEnabled: boolean;
  setHapticsEnabled: (val: boolean) => void;
  
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
  
  // Data
  dataSaverMode: boolean;
  setDataSaverMode: (val: boolean) => void;

  // Notifications
  alertOnComments: boolean;
  setAlertOnComments: (val: boolean) => void;
  
  alertOnStatusChange: boolean;
  setAlertOnStatusChange: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: true,
      setDarkMode: (val) => set({ darkMode: val }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      anonymousMode: false,
      setAnonymousMode: (val) => set({ anonymousMode: val }),
      
      hapticsEnabled: true,
      setHapticsEnabled: (val) => set({ hapticsEnabled: val }),
      
      reducedMotion: false,
      setReducedMotion: (val) => set({ reducedMotion: val }),
      
      dataSaverMode: false,
      setDataSaverMode: (val) => set({ dataSaverMode: val }),

      alertOnComments: true,
      setAlertOnComments: (val) => set({ alertOnComments: val }),

      alertOnStatusChange: true,
      setAlertOnStatusChange: (val) => set({ alertOnStatusChange: val }),
    }),
    {
      name: 'simraungadh-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
