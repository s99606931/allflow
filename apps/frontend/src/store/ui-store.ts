import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Accent, Theme } from '@/lib/tokens';

interface UIState {
  theme: Theme;
  accent: Accent;
  sidebarCollapsed: boolean;
  aiPanelOpen: boolean;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  closeAIPanel: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: 'blue',
      sidebarCollapsed: false,
      aiPanelOpen: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      closeAIPanel: () => set({ aiPanelOpen: false }),
    }),
    { name: 'allflow-ui' },
  ),
);
