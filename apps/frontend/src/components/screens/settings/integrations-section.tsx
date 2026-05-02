"use client";

import { Button, Card, CardBody } from "@/components/ui/primitives";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Section } from "./shared";

const APPS = [
	{ n: "Notion", desc: "6개 DB 동기화", conn: true },
	{ n: "Google Calendar", desc: "양방향 일정 sync", conn: true },
	{ n: "Slack", desc: "알림 미러링", conn: true },
	{ n: "GitHub", desc: "PR / 이슈 활동", conn: true },
	{ n: "Figma", desc: "디자인 임베드", conn: false },
	{ n: "Jira", desc: "이슈 가져오기", conn: false },
	{ n: "Microsoft Teams", desc: "회의 / 메시지", conn: false },
	{ n: "Zoom", desc: "회의 자동 녹화 → 회의록", conn: false },
] as const;

const NOTION_ROUTE = '/notion';

export function IntegrationsSection() {
	const router = useRouter();
	return (
		<Section title="연결된 앱" desc="외부 도구와의 통합을 관리합니다.">
			<div className="grid grid-cols-2 gap-3">
				{APPS.map((a) => (
					<Card key={a.n} hoverable>
						<CardBody className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-bg-1 border border-border grid place-items-center text-[14px] font-bold text-fg-2">
								{a.n[0]}
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-[12.5px] font-semibold text-fg">{a.n}</div>
								<div className="text-[11px] text-fg-3 truncate">{a.desc}</div>
							</div>
							{a.conn ? (
								<Button size="sm" variant="secondary" onClick={() => a.n === 'Notion' ? router.push(NOTION_ROUTE) : toast.info(`${a.n} 설정 페이지는 준비 중입니다.`)}>
									관리
								</Button>
							) : (
								<Button size="sm" variant="primary" onClick={() => toast.info(`${a.n} OAuth 연동은 준비 중입니다.`)}>
									연결
								</Button>
							)}
						</CardBody>
					</Card>
				))}
			</div>
		</Section>
	);
}
