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
	compact: boolean;
	reduceMotion: boolean;
	fontSize: string;
	dndWeekdayNight: boolean;
	dndWeekend: boolean;
	dndDuringMeeting: boolean;
	timezone: string;
	dateFormat: string;
	weekStart: string;
	setTheme: (t: Theme) => void;
	setAccent: (a: Accent) => void;
	toggleSidebar: () => void;
	setSidebarWidth: (w: number) => void;
	toggleAIPanel: () => void;
	closeAIPanel: () => void;
	setAIPanelWidth: (w: number) => void;
	setCompact: (v: boolean) => void;
	setReduceMotion: (v: boolean) => void;
	setFontSize: (v: string) => void;
	setDndWeekdayNight: (v: boolean) => void;
	setDndWeekend: (v: boolean) => void;
	setDndDuringMeeting: (v: boolean) => void;
	setTimezone: (v: string) => void;
	setDateFormat: (v: string) => void;
	setWeekStart: (v: string) => void;
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
			compact: false,
			reduceMotion: false,
			fontSize: "표준 (100%)",
			dndWeekdayNight: true,
			dndWeekend: true,
			dndDuringMeeting: false,
			timezone: "(UTC+09:00) 서울",
			dateFormat: "2026년 4월 28일",
			weekStart: "월요일",
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
			setCompact: (compact) => set({ compact }),
			setReduceMotion: (reduceMotion) => set({ reduceMotion }),
			setFontSize: (fontSize) => set({ fontSize }),
			setDndWeekdayNight: (dndWeekdayNight) => set({ dndWeekdayNight }),
			setDndWeekend: (dndWeekend) => set({ dndWeekend }),
			setDndDuringMeeting: (dndDuringMeeting) => set({ dndDuringMeeting }),
			setTimezone: (timezone) => set({ timezone }),
			setDateFormat: (dateFormat) => set({ dateFormat }),
			setWeekStart: (weekStart) => set({ weekStart }),
		}),
		{ name: "allflow-ui" },
	),
);
