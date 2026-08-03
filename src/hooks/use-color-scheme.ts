// @ts-nocheck
import { useColorScheme as useNWColorScheme } from 'nativewind';
import { useSettingsStore } from '../store/settingsStore';
import { useEffect } from 'react';

export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } = useNWColorScheme();
  const darkMode = useSettingsStore(state => state.darkMode);

  useEffect(() => {
    setColorScheme(darkMode ? 'dark' : 'light');
  }, [darkMode, setColorScheme]);

  return darkMode ? 'dark' : 'light';
}
