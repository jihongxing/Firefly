import { create } from 'zustand';
import type { Config } from '@/types/api';

interface AppState {
  config: Config | null;
  currentLocale: string;
  setConfig: (config: Config) => void;
  setLocale: (locale: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  currentLocale: 'zh-CN',
  setConfig: (config) => set({ config }),
  setLocale: (locale) => set({ currentLocale: locale }),
}));
