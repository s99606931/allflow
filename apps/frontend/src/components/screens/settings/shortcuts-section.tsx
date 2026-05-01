"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Section } from "./shared";

const SHORTCUT_GROUPS = [
	{
		name: "전역",
		items: [
			["⌘ K", "빠른 검색"],
			["⌘ /", "단축키 보기"],
			["G + D", "대시보드로 이동"],
			["G + T", "내 태스크로 이동"],
			["G + I", "이슈로 이동"],
			["?", "도움말"],
		],
	},
	{
		name: "편집",
		items: [
			["⌘ Enter", "저장 / 보내기"],
			["Esc", "닫기 / 취소"],
			["⌘ B / I / U", "굵게 / 기울임 / 밑줄"],
		],
	},
	{
		name: "태스크",
		items: [
			["N", "새 태스크"],
			["⇧ Enter", "하위 태스크 추가"],
			["1 ~ 5", "상태 변경"],
		],
	},
] as const;

export function ShortcutsSection() {
	return (
		<Section title="단축키" desc="자주 쓰는 키보드 단축키 모음">
			{SHORTCUT_GROUPS.map((g) => (
				<Card key={g.name}>
					<CardHeader>
						<CardTitle>{g.name}</CardTitle>
					</CardHeader>
					<CardBody className="space-y-1">
						{g.items.map(([k, label], i) => (
							<div
								key={i}
								className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
							>
								<span className="text-[12.5px] text-fg-1">{label}</span>
								<kbd className="text-[11px] mono px-2 py-0.5 rounded bg-bg-1 border border-border text-fg">
									{k}
								</kbd>
							</div>
						))}
					</CardBody>
				</Card>
			))}
		</Section>
	);
}
