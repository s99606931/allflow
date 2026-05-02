"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Section } from "./shared";

const SHORTCUT_GROUPS = [
	{ name: "전역", items: [["⌘ K","빠른 검색"],["⌘ /","단축키 보기"],["G + D","대시보드로 이동"],["G + T","내 태스크로 이동"],["G + I","이슈로 이동"],["?","도움말"]] },
	{ name: "편집", items: [["⌘ Enter","저장 / 보내기"],["Esc","닫기 / 취소"],["⌘ B / I / U","굵게 / 기울임 / 밑줄"]] },
	{ name: "태스크", items: [["N","새 태스크"],["⇧ Enter","하위 태스크 추가"],["1 ~ 5","상태 변경"]] },
] as const;

const LS_KEY = "custom_shortcuts";

function captureKey(e: KeyboardEvent): string {
	const parts: string[] = [];
	if (e.metaKey || e.ctrlKey) parts.push("⌘");
	if (e.shiftKey) parts.push("⇧");
	if (e.altKey) parts.push("⌥");
	if (!["Meta","Control","Shift","Alt"].includes(e.key))
		parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
	return parts.join(" ");
}

function loadCustom(): Record<string, string> {
	try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); }
	catch { return {}; }
}

function saveCustom(data: Record<string, string>) {
	localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function ShortcutsSection() {
	const [custom, setCustom] = useState<Record<string, string>>({});
	const [editing, setEditing] = useState<string | null>(null);
	const [pending, setPending] = useState("");

	useEffect(() => { setCustom(loadCustom()); }, []);

	useEffect(() => {
		if (!editing) return;
		const handler = (e: KeyboardEvent) => { e.preventDefault(); const k = captureKey(e); if (k) setPending(k); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [editing]);

	function applyCustom(next: Record<string, string>) { setCustom(next); saveCustom(next); }

	function saveEdit(label: string) { applyCustom({ ...custom, [label]: pending }); setEditing(null); }

	function resetOne(label: string) { const n = { ...custom }; delete n[label]; applyCustom(n); }

	function resetAll() { setCustom({}); localStorage.removeItem(LS_KEY); setEditing(null); }

	const allItems = SHORTCUT_GROUPS.flatMap((g) => g.items.map(([k, label]) => ({ key: k as string, label: label as string })));

	const Kbd = ({ children, active }: { children: React.ReactNode; active?: boolean }) => (
		<kbd className={`text-[11px] mono px-2 py-0.5 rounded border text-fg min-w-[48px] text-center ${active ? "bg-accent/10 border-accent" : "bg-bg-1 border-border"}`}>
			{children}
		</kbd>
	);

	return (
		<Section title="단축키" desc="자주 쓰는 키보드 단축키 모음">
			{SHORTCUT_GROUPS.map((g) => (
				<Card key={g.name}>
					<CardHeader><CardTitle>{g.name}</CardTitle></CardHeader>
					<CardBody className="space-y-1">
						{g.items.map(([k, label], i) => (
							<div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
								<span className="text-[12.5px] text-fg-1">{label}</span>
								<Kbd>{custom[label as string] ?? k}</Kbd>
							</div>
						))}
					</CardBody>
				</Card>
			))}

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>사용자 지정</CardTitle>
					{Object.keys(custom).length > 0 && (
						<button onClick={resetAll} className="text-[11px] text-fg-2 hover:text-destructive transition-colors">전체 초기화</button>
					)}
				</CardHeader>
				<CardBody className="space-y-1">
					{allItems.map(({ key, label }) => {
						const isEditing = editing === label;
						const isCustomized = label in custom;
						return (
							<div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 gap-2">
								<div className="flex items-center gap-1.5 min-w-0">
									<span className="text-[12.5px] text-fg-1 truncate">{label}</span>
									{isCustomized && !isEditing && (
										<span className="text-[10px] text-accent bg-accent/10 px-1 py-0.5 rounded shrink-0">수정됨</span>
									)}
								</div>
								<div className="flex items-center gap-1.5 shrink-0">
									{isEditing ? (
										<>
											<Kbd active>{pending || "…"}</Kbd>
											<button onClick={() => saveEdit(label)} className="text-[11px] text-accent hover:opacity-70 transition-opacity">저장</button>
											<button onClick={() => setEditing(null)} className="text-[11px] text-fg-2 hover:opacity-70 transition-opacity">취소</button>
										</>
									) : (
										<>
											<Kbd>{custom[label] ?? key}</Kbd>
											{isCustomized && (
												<button onClick={() => resetOne(label)} className="text-[11px] text-fg-2 hover:text-destructive transition-colors">초기화</button>
											)}
											<button onClick={() => { setEditing(label); setPending(custom[label] ?? key); }} className="text-[11px] text-fg-2 hover:text-fg transition-colors">수정</button>
										</>
									)}
								</div>
							</div>
						);
					})}
				</CardBody>
			</Card>
		</Section>
	);
}
