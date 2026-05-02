/**
 * Date format helpers driven by `useUIStore.dateFormat` user preference.
 *
 * 사용자 설정값(예: "2026년 4월 28일", "2026-04-28", "04/28/2026")을 기반으로
 * 일관된 포맷터를 제공한다. 호출자는 `formatDate(input)` 만 사용한다.
 */

import { useUIStore } from "@/store/ui-store";

export type DateFormatPreset = string;

const formatters: Record<string, (d: Date) => string> = {
	"2026년 4월 28일": (d) =>
		`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`,
	"2026-04-28": (d) => {
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${d.getFullYear()}-${m}-${day}`;
	},
	"04/28/2026": (d) => {
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${m}/${day}/${d.getFullYear()}`;
	},
};

/** Format a date according to a preset key. Falls back to ISO date. */
export function formatDateWith(preset: DateFormatPreset, input: Date | string): string {
	const d = typeof input === "string" ? new Date(input) : input;
	if (Number.isNaN(d.getTime())) return "";
	const fn = formatters[preset];
	if (fn) return fn(d);
	return d.toISOString().slice(0, 10);
}

/** React hook: returns a memoized formatter bound to current user preference. */
export function useDateFormatter(): (input: Date | string) => string {
	const preset = useUIStore((s) => s.dateFormat);
	return (input) => formatDateWith(preset, input);
}
