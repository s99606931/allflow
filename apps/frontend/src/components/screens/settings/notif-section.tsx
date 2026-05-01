"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { useState } from "react";
import { Row, Section, Toggle } from "./shared";

type NotifKey = "mention" | "sla" | "ai" | "review" | "digest";
type NotifChannel = "app" | "email" | "push";
type NotifState = Record<NotifKey, Record<NotifChannel, boolean>>;

const NOTIF_ROWS: [NotifKey, string, string][] = [
	["mention", "@멘션", "본인이 언급될 때"],
	["sla", "SLA 임박", "담당 이슈가 SLA 한도에 가까울 때"],
	["ai", "AI 제안", "AI가 액션을 제안할 때"],
	["review", "리뷰 요청", "PR · 디자인 리뷰 요청"],
	["digest", "일간 요약", "매일 오전 9시 다이제스트"],
];

const INITIAL_STATE: NotifState = {
	mention: { app: true, email: true, push: true },
	sla: { app: true, email: true, push: false },
	ai: { app: true, email: false, push: false },
	review: { app: true, email: true, push: true },
	digest: { app: false, email: true, push: false },
};

export function NotifSection() {
	const [state, setState] = useState<NotifState>(INITIAL_STATE);

	return (
		<Section title="알림" desc="채널별로 받을 알림 종류를 선택하세요.">
			<Card>
				<div className="grid grid-cols-[1fr_60px_60px_60px] px-5 py-3 border-b border-border bg-bg-1 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
					<div>유형</div>
					<div className="text-center">앱</div>
					<div className="text-center">이메일</div>
					<div className="text-center">푸시</div>
				</div>
				{NOTIF_ROWS.map(([k, label, sub]) => {
					const row = state[k];
					return (
						<div
							key={k}
							className="grid grid-cols-[1fr_60px_60px_60px] px-5 py-3 border-b border-border last:border-0 items-center"
						>
							<div>
								<div className="text-[12.5px] font-medium text-fg">{label}</div>
								<div className="text-[11px] text-fg-3">{sub}</div>
							</div>
							{(["app", "email", "push"] as const).map((ch) => (
								<div key={ch} className="flex justify-center">
									<Toggle
										checked={row[ch]}
										onChange={(v) =>
											setState((s) => ({ ...s, [k]: { ...s[k], [ch]: v } }))
										}
									/>
								</div>
							))}
						</div>
					);
				})}
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>방해 금지 모드</CardTitle>
				</CardHeader>
				<CardBody className="space-y-1">
					<Row label="평일 야간" sub="22:00 ~ 08:00 · 푸시 알림 차단">
						<Toggle checked={true} onChange={() => {}} />
					</Row>
					<Row label="주말 종일" sub="긴급 (P0) 만 허용">
						<Toggle checked={true} onChange={() => {}} />
					</Row>
					<Row label="회의 중 자동 차단" sub="캘린더에 회의가 있는 동안">
						<Toggle checked={false} onChange={() => {}} />
					</Row>
				</CardBody>
			</Card>
		</Section>
	);
}
