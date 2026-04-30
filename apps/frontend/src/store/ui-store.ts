import type { Accent, Theme } from "@/lib/tokens";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SIDEBAR_MIN = 180;
export const SIDEBAR_MAX = 400;
export const SIDEBAR_DEFAULT = 248;
export const AI_PANEL_MIN = 280;
export const AI_PANEL_MAX = 900;
export const AI_PANEL_DEFAULT = 380;

interface UIState {
	theme: Theme;
	accent: Accent;
	sidebarCollapsed: boolean;
	sidebarWidth: number;
	aiPanelOpen: boolean;
	aiPanelWidth: number;
	setTheme: (t: Theme) => void;
	setAccent: (a: Accent) => void;
	toggleSidebar: () => void;
	setSidebarWidth: (w: number) => void;
	toggleAIPanel: () => void;
	closeAIPanel: () => void;
	setAIPanelWidth: (w: number) => void;
}

export const useUIStore = create<UIState>()(
	persist(
		(set) => ({
			theme: "light",
			accent: "blue",
			sidebarCollapsed: false,
			sidebarWidth: SIDEBAR_DEFAULT,
			aiPanelOpen: false,
			aiPanelWidth: AI_PANEL_DEFAULT,
			setTheme: (theme) => set({ theme }),
			setAccent: (accent) => set({ accent }),
			toggleSidebar: () =>
				set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
			setSidebarWidth: (w) =>
				set({ sidebarWidth: Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w)) }),
			toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
			closeAIPanel: () => set({ aiPanelOpen: false }),
			setAIPanelWidth: (w) =>
				set({
					aiPanelWidth: Math.max(AI_PANEL_MIN, Math.min(AI_PANEL_MAX, w)),
				}),
		}),
		{ name: "allflow-ui" },
	),
);
