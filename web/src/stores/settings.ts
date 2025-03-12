import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  straightLinks: boolean;
  darkTheme: boolean;
  selectedFileType: string;
  selectedInterval: string;
  maxLogLines: string;
  setStraightLinks: (value: boolean) => void;
  setDarkTheme: (value: boolean) => void;
  setSelectedFileType: (value: string) => void;
  setSelectedInterval: (value: string) => void;
  setMaxLogLines: (value: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      straightLinks: false,
      darkTheme: true,
      selectedFileType: 'YAML',
      selectedInterval: '1m',
      maxLogLines: '1000',
      setStraightLinks: (value) => set({ straightLinks: value }),
      setDarkTheme: (value) => set({ darkTheme: value }),
      setSelectedFileType: (value) => set({ selectedFileType: value }),
      setSelectedInterval: (value) => set({ selectedInterval: value }),
      setMaxLogLines: (value) => set({ maxLogLines: value }),
    }),
    {
      name: 'settings-storage',
    }
  )
); 