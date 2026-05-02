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
	useMfaStatus,
	useMfaSetup,
	useMfaVerify,
	useMfaDisable,
	useMfaRecoveryCodes,
} from "@/lib/hooks/use-admin";
import type { SessionItem } from "@/lib/api/extended";
import { Check, Clock, Eye, EyeOff, MapPin, Monitor, Smartphone, X as XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Row, Section } from "./shared";

type MfaStep = 'idle' | 'qr' | 'verify' | 'show-recovery' | 'disable' | 'view-recovery-auth';

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
	const [step, setStep] = useState<MfaStep>('idle');
	const [otpUri, setOtpUri] = useState('');
	const [mfaSecret, setMfaSecret] = useState('');
	const [codeInput, setCodeInput] = useState('');
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

	const { data: securityLog } = useSecurityLog(10);
	const { data: sessionsData, isLoading: sessionsLoading } = useSessions();
	const { data: mfaStatus, refetch: refetchMfaStatus } = useMfaStatus();
	const revokeSession = useRevokeSession();
	const revokeAllOthers = useRevokeAllOtherSessions();
	const mfaSetup = useMfaSetup();
	const mfaVerify = useMfaVerify();
	const mfaDisable = useMfaDisable();
	const mfaViewRecovery = useMfaRecoveryCodes();

	const sessions: SessionItem[] = sessionsData?.items ?? [];
	const hasOthers = sessions.some((s) => !s.current);

	const closeDialog = () => {
		setStep('idle');
		setCodeInput('');
		setOtpUri('');
		setMfaSecret('');
	};

	const startSetup = async () => {
		const result = await mfaSetup.mutateAsync();
		setOtpUri(result.otpUri);
		setMfaSecret(result.secret);
		setCodeInput('');
		setStep('qr');
	};

	const handleVerify = async () => {
		const result = await mfaVerify.mutateAsync({ code: codeInput });
		setRecoveryCodes(result.recoveryCodes);
		setStep('show-recovery');
	};

	const handleDisable = async () => {
		await mfaDisable.mutateAsync({ code: codeInput });
		closeDialog();
	};

	const handleViewRecovery = async () => {
		const result = await mfaViewRecovery.mutateAsync({ code: codeInput });
		setRecoveryCodes(result.recoveryCodes);
		setStep('show-recovery');
	};

	const qrUrl = otpUri
		? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(otpUri)}&size=180x180&margin=8`
		: null;

	return (
		<Section
			title="보안 / 세션"
			desc="비밀번호 · MFA · 활성 세션을 관리합니다."
		>
			{/* ── MFA Dialogs ── */}
			{step === 'qr' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-xl border border-border bg-bg-elev p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-[15px] font-semibold text-fg">MFA 설정</h3>
							<button type="button" onClick={closeDialog} className="text-fg-3 hover:text-fg-1"><XIcon size={16} /></button>
						</div>
						<p className="text-[12.5px] text-fg-2">Google Authenticator 등 TOTP 앱으로 QR 코드를 스캔하세요.</p>
						{qrUrl && (
							<div className="flex justify-center">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={qrUrl} alt="MFA QR Code" width={180} height={180} className="rounded-lg border border-border" />
							</div>
						)}
						{mfaSecret && (
							<div className="rounded-md bg-bg-1 border border-border p-3">
								<div className="text-[10.5px] text-fg-3 mb-1">수동 입력 코드</div>
								<code className="text-[11px] mono text-fg-1 break-all">{mfaSecret}</code>
							</div>
						)}
						<div className="flex gap-2 justify-end">
							<Button size="sm" variant="secondary" onClick={closeDialog}>취소</Button>
							<Button size="sm" variant="primary" onClick={() => { setCodeInput(''); setStep('verify'); }}>
								다음 — 코드 입력
							</Button>
						</div>
					</div>
				</div>
			)}

			{(step === 'verify' || step === 'disable' || step === 'view-recovery-auth') && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-xl border border-border bg-bg-elev p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-[15px] font-semibold text-fg">
								{step === 'disable' ? 'MFA 비활성화' : '인증 코드 확인'}
							</h3>
							<button type="button" onClick={closeDialog} className="text-fg-3 hover:text-fg-1"><XIcon size={16} /></button>
						</div>
						<p className="text-[12.5px] text-fg-2">
							{step === 'disable'
								? 'MFA를 비활성화하려면 Authenticator 앱의 현재 코드를 입력하세요.'
								: 'Authenticator 앱에 표시된 6자리 코드를 입력하세요.'}
						</p>
						<input
							autoFocus
							type="text"
							inputMode="numeric"
							maxLength={6}
							placeholder="000000"
							value={codeInput}
							onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))}
							className="w-full h-10 rounded-md border border-border bg-bg px-3 text-center text-[18px] mono font-bold text-fg tracking-[0.3em] focus:outline-none focus:border-accent"
						/>
						<div className="flex gap-2 justify-end">
							<Button size="sm" variant="secondary" onClick={closeDialog}>취소</Button>
							<Button
								size="sm"
								variant={step === 'disable' ? 'danger' : 'primary'}
								disabled={
									codeInput.length !== 6 ||
									mfaVerify.isPending ||
									mfaDisable.isPending ||
									mfaViewRecovery.isPending
								}
								onClick={
									step === 'disable'
										? handleDisable
										: step === 'view-recovery-auth'
										? handleViewRecovery
										: handleVerify
								}
							>
								{mfaVerify.isPending || mfaDisable.isPending || mfaViewRecovery.isPending
									? '확인 중...'
									: step === 'disable' ? 'MFA 비활성화' : '확인'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{step === 'show-recovery' && recoveryCodes.length > 0 && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-xl border border-border bg-bg-elev p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-[15px] font-semibold text-fg">복구 코드</h3>
							<button type="button" onClick={closeDialog} className="text-fg-3 hover:text-fg-1"><XIcon size={16} /></button>
						</div>
						<p className="text-[12.5px] text-fg-2">아래 복구 코드를 안전한 곳에 저장하세요. 인증 앱을 분실했을 때 사용합니다.</p>
						<div className="grid grid-cols-2 gap-2">
							{recoveryCodes.map(c => (
								<code key={c} className="rounded bg-bg-1 border border-border px-3 py-1.5 text-[12px] mono text-fg-1 text-center">
									{c}
								</code>
							))}
						</div>
						<Button
							size="sm"
							variant="secondary"
							className="w-full"
							onClick={() => { navigator.clipboard.writeText(recoveryCodes.join('\n')); toast.success('복구 코드를 클립보드에 복사했습니다'); }}
						>
							복사
						</Button>
						<Button size="sm" variant="primary" className="w-full" onClick={closeDialog}>완료</Button>
					</div>
				</div>
			)}

			<Card>
				<CardBody className="space-y-1">
					<Row label="비밀번호" sub="이메일 기반 인증 사용 중 (비밀번호 불필요)">
						<Badge tone="neutral">이메일 인증</Badge>
					</Row>
					<Row
						label="2단계 인증 (MFA)"
						sub={
							mfaStatus?.enabled
								? `활성화됨 · 복구 코드 ${mfaStatus.recoveryCodesRemaining}개 남음`
								: 'Authenticator 앱으로 로그인 보안 강화'
						}
					>
						{mfaStatus?.enabled ? (
							<Badge tone="success"><Check size={10} /> 활성화</Badge>
						) : (
							<Badge tone="neutral">비활성</Badge>
						)}
						<Button
							size="sm"
							variant={mfaStatus?.enabled ? 'ghost' : 'secondary'}
							disabled={mfaSetup.isPending}
							onClick={mfaStatus?.enabled
								? () => { setCodeInput(''); setStep('disable'); }
								: startSetup}
						>
							{mfaSetup.isPending ? '준비 중...' : mfaStatus?.enabled ? '비활성화' : '설정'}
						</Button>
					</Row>
					{mfaStatus?.enabled && (
						<Row label="복구 코드" sub={`MFA 분실 시 사용 · ${mfaStatus.recoveryCodesRemaining}개 미사용`}>
							<Button
								size="sm"
								variant="secondary"
								onClick={() => { setCodeInput(''); setStep('view-recovery-auth'); }}
							>
								코드 보기
							</Button>
						</Row>
					)}
					<Row label="API 키" sub="자동화 / CLI 도구용">
						<code className="text-[11px] mono px-2 py-1 rounded bg-bg-1 border border-border text-fg-2">
							{showApi ? "sk_live_8f3a92...e45c" : "•••••••••••••••••••"}
						</code>
						<IconButton size="sm" onClick={() => setShowApi((s) => !s)}>
							{showApi ? <EyeOff size={12} /> : <Eye size={12} />}
						</IconButton>
						<Button size="sm" variant="ghost" onClick={() => {
							toast('API 키를 재발급하면 기존 키는 즉시 만료됩니다. 계속하시겠습니까?', {
								action: { label: '재발급', onClick: () => toast.success('API 키가 재발급되었습니다. 새 키를 안전한 곳에 보관하세요.') },
								cancel: '취소',
							});
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
						onClick={() => toast('다른 모든 세션을 종료하시겠습니까?', { action: { label: '종료', onClick: () => revokeAllOthers.mutate() }, cancel: '취소' })}
					>
						{revokeAllOthers.isPending ? '종료 중...' : '모든 다른 세션 종료'}
					</Button>
				</CardHeader>
				<CardBody className="space-y-1">
					{sessionsLoading && <div className="py-4 text-center text-fg-3 text-[12px]">활성 세션을 불러오는 중...</div>}
					{!sessionsLoading && sessions.length === 0 && <div className="py-4 text-center text-fg-3 text-[12px]">활성 세션이 없습니다.</div>}
					{sessions.map((s) => {
						const Icon = deviceIcon(s.device);
						return (
							<div key={s.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
								<div className="w-9 h-9 rounded-md grid place-items-center bg-bg-1 border border-border">
									<Icon size={14} className="text-fg-2" />
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<span className="text-[12.5px] font-semibold text-fg">{s.device}</span>
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
										onClick={() => toast(`"${s.device}" 세션을 종료하시겠습니까?`, { action: { label: '종료', onClick: () => revokeSession.mutate(s.id) }, cancel: '취소' })}
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
				<CardHeader><CardTitle>최근 보안 활동</CardTitle></CardHeader>
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
