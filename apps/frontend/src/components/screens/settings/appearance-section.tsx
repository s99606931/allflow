"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { useUIStore } from "@/store/ui-store";
import { Row, Section, Toggle } from "./shared";

const ACCENTS = ["blue", "indigo", "violet", "teal", "amber", "rose"] as const;

export function AppearanceSection() {
	const theme = useUIStore((s) => s.theme);
	const setTheme = useUIStore((s) => s.setTheme);
	const accent = useUIStore((s) => s.accent);
	const setAccent = useUIStore((s) => s.setAccent);

	return (
		<Section title="외관" desc="테마 · 액센트 · 글자 크기를 조정합니다.">
			<Card>
				<CardHeader>
					<CardTitle>테마</CardTitle>
				</CardHeader>
				<CardBody>
					<div className="grid grid-cols-3 gap-3">
						{(["light", "dark"] as const).map((t) => (
							<button
								key={t}
								onClick={() => setTheme(t)}
								className={`p-4 rounded-lg border text-left transition-colors ${theme === t ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-border-strong"}`}
							>
								<div
									className={`h-16 rounded mb-3 ${t === "light" ? "bg-white border border-zinc-200" : "bg-zinc-900"}`}
								/>
								<div className="text-[12.5px] font-semibold text-fg capitalize">
									{t === "light" ? "라이트" : "다크"}
								</div>
							</button>
						))}
						<button className="p-4 rounded-lg border border-border hover:border-border-strong text-left">
							<div className="h-16 rounded mb-3 bg-gradient-to-r from-white via-zinc-200 to-zinc-900" />
							<div className="text-[12.5px] font-semibold text-fg">
								시스템 따라가기
							</div>
						</button>
					</div>
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>액센트 컬러</CardTitle>
				</CardHeader>
				<CardBody>
					<div className="flex items-center gap-3">
						{ACCENTS.map((a) => (
							<button
								key={a}
								onClick={() => setAccent(a)}
								data-accent={a}
								className={`w-10 h-10 rounded-full bg-accent transition-transform ${accent === a ? "ring-2 ring-offset-2 ring-offset-bg ring-accent scale-110" : "hover:scale-105"}`}
								title={a}
							/>
						))}
					</div>
				</CardBody>
			</Card>

			<Card>
				<CardBody className="space-y-1">
					<Row label="글자 크기" sub="앱 전체 텍스트 크기를 조정합니다.">
						<select className="h-8 px-2.5 rounded-md bg-bg-1 border border-border text-[12.5px]">
							<option>작게 (90%)</option>
							<option>표준 (100%)</option>
							<option>크게 (110%)</option>
							<option>매우 크게 (120%)</option>
						</select>
					</Row>
					<Row label="컴팩트 모드" sub="여백을 줄여 더 많은 정보를 표시합니다.">
						<Toggle checked={false} onChange={() => {}} />
					</Row>
					<Row label="모션 줄이기" sub="애니메이션을 최소화합니다.">
						<Toggle checked={false} onChange={() => {}} />
					</Row>
				</CardBody>
			</Card>
		</Section>
	);
}
