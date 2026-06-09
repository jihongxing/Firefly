import { create } from 'zustand';
import type { Config } from '@/types/api';

interface AppState {
  config: Config | null;
  currentLocale: string;
  theme: 'dark' | 'light';
  setConfig: (config: Config) => void;
  setLocale: (locale: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  currentLocale: 'zh-CN',
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  setConfig: (config) => set({ config }),
  setLocale: (locale) => set({ currentLocale: locale }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
}));
