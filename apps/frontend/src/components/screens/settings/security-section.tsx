"use client";

import {
	Badge,
	Button,
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	IconButton,
} from "@/components/ui/primitives";
import {
	useRevokeAllOtherSessions,
	useRevokeSession,
	useSecurityLog,
	useSessions,
} from "@/lib/hooks/use-admin";
import type { SessionItem } from "@/lib/api/extended";
import { Check, Clock, Eye, EyeOff, MapPin, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Row, Section } from "./shared";

const ACTION_LABELS: Record<string, string> = {
	'auth.login.success': '로그인 성공',
	'auth.token.revoke': '토큰 만료/로그아웃',
	'auth.login.failed': '로그인 실패',
	'auth.session.revoke': '세션 종료',
	'auth.sessions.revoke_others': '다른 모든 세션 종료',
};

function relativeTime(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return iso;
	const diffMs = Date.now() - then;
	if (diffMs < 60_000) return '방금';
	const min = Math.floor(diffMs / 60_000);
	if (min < 60) return `${min}분 전`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}시간 전`;
	const day = Math.floor(hr / 24);
	return `${day}일 전`;
}

function deviceIcon(device: string) {
	if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('android')) {
		return Smartphone;
	}
	return Monitor;
}

export function SecuritySection() {
	const [showApi, setShowApi] = useState(false);
	const { data: securityLog } = useSecurityLog(10);
	const { data: sessionsData, isLoading: sessionsLoading } = useSessions();
	const revokeSession = useRevokeSession();
	const revokeAllOthers = useRevokeAllOtherSessions();
	const sessions: SessionItem[] = sessionsData?.items ?? [];
	const hasOthers = sessions.some((s) => !s.current);
	return (
		<Section
			title="보안 / 세션"
			desc="비밀번호 · MFA · 활성 세션을 관리합니다."
		>
			<Card>
				<CardBody className="space-y-1">
					<Row label="비밀번호" sub="최근 변경: 2025년 11월 14일 (164일 전)">
						<Button size="sm" variant="secondary" onClick={() => toast.info("비밀번호 변경 페이지는 준비 중입니다.")}>
							변경
						</Button>
					</Row>
					<Row label="2단계 인증 (MFA)" sub="Authenticator 앱으로 활성화됨">
						<Badge tone="success">
							<Check size={10} /> 활성화
						</Badge>
						<Button size="sm" variant="ghost" onClick={() => toast.info("MFA 설정 페이지는 준비 중입니다.")}>
							설정
						</Button>
					</Row>
					<Row label="복구 코드" sub="MFA 분실 시 사용 · 8개 중 6개 미사용">
						<Button size="sm" variant="secondary" onClick={() => toast.info("복구 코드 보기는 준비 중입니다.")}>
							코드 보기
						</Button>
					</Row>
					<Row label="API 키" sub="자동화 / CLI 도구용">
						<code className="text-[11px] mono px-2 py-1 rounded bg-bg-1 border border-border text-fg-2">
							{showApi ? "sk_live_8f3a92...e45c" : "•••••••••••••••••••"}
						</code>
						<IconButton size="sm" onClick={() => setShowApi((s) => !s)}>
							{showApi ? <EyeOff size={12} /> : <Eye size={12} />}
						</IconButton>
						<Button size="sm" variant="ghost" onClick={() => {
							if (window.confirm("API 키를 재발급하면 기존 키는 즉시 만료됩니다. 계속하시겠습니까?")) {
								toast.success("API 키가 재발급되었습니다. 새 키를 안전한 곳에 보관하세요.");
							}
						}}>
							재발급
						</Button>
					</Row>
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>활성 세션</CardTitle>
					<Button
						size="sm"
						variant="secondary"
						disabled={!hasOthers || revokeAllOthers.isPending}
						onClick={() => {
							if (window.confirm("다른 모든 세션을 종료하시겠습니까?")) {
								revokeAllOthers.mutate();
							}
						}}
					>
						{revokeAllOthers.isPending ? '종료 중...' : '모든 다른 세션 종료'}
					</Button>
				</CardHeader>
				<CardBody className="space-y-1">
					{sessionsLoading && (
						<div className="py-4 text-center text-fg-3 text-[12px]">활성 세션을 불러오는 중...</div>
					)}
					{!sessionsLoading && sessions.length === 0 && (
						<div className="py-4 text-center text-fg-3 text-[12px]">활성 세션이 없습니다.</div>
					)}
					{sessions.map((s) => {
						const Icon = deviceIcon(s.device);
						return (
							<div
								key={s.id}
								className="flex items-center gap-3 py-3 border-b border-border last:border-0"
							>
								<div className="w-9 h-9 rounded-md grid place-items-center bg-bg-1 border border-border">
									<Icon size={14} className="text-fg-2" />
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="text-[12.5px] font-semibold text-fg">
											{s.device}
										</span>
										{s.current && <Badge tone="accent">현재</Badge>}
									</div>
									<div className="flex items-center gap-2 text-[11px] text-fg-3 mt-0.5">
										<MapPin size={10} />
										<span className="mono">{s.ipAddress ?? 'IP 미상'}</span>
										<span>·</span>
										<Clock size={10} />
										<span>{relativeTime(s.createdAt)}</span>
									</div>
								</div>
								{!s.current && (
									<Button
										size="sm"
										variant="ghost"
										disabled={revokeSession.isPending}
										onClick={() => {
											if (window.confirm(`"${s.device}" 세션을 종료하시겠습니까?`)) {
												revokeSession.mutate(s.id);
											}
										}}
									>
										종료
									</Button>
								)}
							</div>
						);
					})}
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>최근 보안 활동</CardTitle>
				</CardHeader>
				<CardBody className="space-y-2 text-[12px]">
					{!securityLog || securityLog.items.length === 0 ? (
						<div className="py-4 text-center text-fg-3 text-[12px]">보안 활동 기록이 없습니다.</div>
					) : (
						securityLog.items.map((item) => (
							<div key={item.id} className="flex items-center justify-between py-1">
								<div>
									<div className="text-fg-1">{ACTION_LABELS[item.action] ?? item.action}</div>
									<div className="text-[11px] text-fg-3">{item.actor?.name ?? item.actorId}</div>
								</div>
								<div className="text-[11px] text-fg-3 mono">
									{new Date(item.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
								</div>
							</div>
						))
					)}
				</CardBody>
			</Card>
		</Section>
	);
}
