// @ts-nocheck
import { create } from 'zustand';

type Language = 'en' | 'ne';

interface LangState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLangStore = create<LangState>((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  toggleLanguage: () => set({ language: get().language === 'en' ? 'ne' : 'en' }),
}));
