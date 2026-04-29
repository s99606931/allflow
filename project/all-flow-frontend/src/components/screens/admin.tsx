'use client';

import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, Progress } from '@/components/ui/primitives';
import { TEAM, userById } from '@/lib/fixtures';
import { Activity, AlertTriangle, Cpu, Database, Lock, Server, Settings2, Shield } from 'lucide-react';

const HEALTH = [
  { l: 'Uptime', v: '99.97%', icon: Activity, tone: 'success' as const },
  { l: 'API p95', v: '142ms', icon: Cpu, tone: 'success' as const },
  { l: 'DB 연결', v: '34/100', icon: Database, tone: 'success' as const },
  { l: 'AI 토큰 사용', v: '68%', icon: Activity, tone: 'warning' as const },
  { l: '활성 세션', v: '47', icon: Lock, tone: 'success' as const },
  { l: '에러율 (24h)', v: '0.04%', icon: AlertTriangle, tone: 'success' as const },
];

const SETTINGS = [
  { l: 'SSO / SAML', desc: '엔터프라이즈 SSO 통합', enabled: true },
  { l: 'SCIM 자동 프로비저닝', desc: '사용자 자동 동기화', enabled: true },
  { l: 'AI 거버넌스', desc: '데이터 학습 차단 + 감사', enabled: true },
  { l: 'IP 화이트리스트', desc: '특정 IP에서만 접근', enabled: false },
  { l: '데이터 암호화 (at-rest)', desc: 'AES-256 자동 암호화', enabled: true },
  { l: '워터마크', desc: '문서 다운로드 추적', enabled: false },
  { l: '감사 로그 보존', desc: '5년 (규제 준수)', enabled: true },
];

const AUDIT = [
  { time: '14:23', who: 'me', action: '권한 정책 변경', target: 'Admin → Member', sev: 'high' },
  { time: '13:45', who: 'u6', action: 'SSO 설정 업데이트', target: 'SAML metadata', sev: 'med' },
  { time: '12:11', who: 'u3', action: '관리자 콘솔 진입', target: 'admin/console', sev: 'low' },
  { time: '11:02', who: 'u6', action: '사용자 비활성화', target: '@former.user', sev: 'high' },
  { time: '10:18', who: 'me', action: 'API 토큰 발급', target: 'webhook-prod', sev: 'med' },
];

export function AdminPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="grid grid-cols-6 gap-3">
        {HEALTH.map(h => (
          <Card key={h.l}>
            <CardBody className="!p-3.5">
              <div className="flex items-center justify-between">
                <h.icon size={13} className={`text-${h.tone === 'success' ? 'success' : 'warning'}`} />
                <Badge tone={h.tone}>OK</Badge>
              </div>
              <div className="text-[11px] text-fg-2 mt-1.5">{h.l}</div>
              <div className="text-[20px] font-bold mono text-fg leading-none mt-1">{h.v}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader><CardTitle>워크스페이스 설정</CardTitle></CardHeader>
          <CardBody className="!p-0">
            {SETTINGS.map(s => (
              <div key={s.l} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-fg">{s.l}</div>
                  <div className="text-[11.5px] text-fg-2 mt-0.5">{s.desc}</div>
                </div>
                <button className={`relative w-9 h-5 rounded-full transition-colors ${s.enabled ? 'bg-accent' : 'bg-bg-2 border border-border'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>플랜 / 사용량</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div>
                <div className="flex justify-between text-[11.5px] mb-1"><span className="text-fg-2">시트</span><span className="mono font-semibold">123 / 200</span></div>
                <Progress value={61} />
              </div>
              <div>
                <div className="flex justify-between text-[11.5px] mb-1"><span className="text-fg-2">스토리지</span><span className="mono font-semibold">412 / 1000 GB</span></div>
                <Progress value={41} />
              </div>
              <div>
                <div className="flex justify-between text-[11.5px] mb-1"><span className="text-fg-2">AI 토큰</span><span className="mono font-semibold">68%</span></div>
                <Progress value={68} tone="warning" />
              </div>
              <Button variant="secondary" size="sm" className="w-full">플랜 변경</Button>
            </CardBody>
          </Card>

          <Card className="!bg-danger-soft border-danger/20">
            <CardHeader><CardTitle className="text-danger">위험 작업</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              <Button variant="secondary" size="sm" className="w-full !text-danger">전체 세션 강제 종료</Button>
              <Button variant="secondary" size="sm" className="w-full !text-danger">API 토큰 일괄 회수</Button>
              <Button variant="secondary" size="sm" className="w-full !text-danger">워크스페이스 잠금</Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>실시간 감사 로그</CardTitle><Badge tone="accent">실시간</Badge></CardHeader>
        <div className="grid grid-cols-[60px_140px_1fr_220px_80px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
          <div>시각</div><div>사용자</div><div>액션</div><div>대상</div><div>심각도</div>
        </div>
        {AUDIT.map((a, i) => {
          const u = userById(a.who);
          return (
            <div key={i} className="grid grid-cols-[60px_140px_1fr_220px_80px] gap-3 px-4 py-2.5 items-center text-[12.5px] border-b border-border last:border-0">
              <div className="mono text-fg-3">{a.time}</div>
              <div className="flex items-center gap-2">{u && <Avatar user={u} size={20} />}<span className="text-fg-1 truncate">{u?.name}</span></div>
              <div className="text-fg font-medium truncate">{a.action}</div>
              <div className="mono text-[11.5px] text-fg-2 truncate">{a.target}</div>
              <div>{a.sev === 'high' ? <Badge tone="danger">High</Badge> : a.sev === 'med' ? <Badge tone="warning">Med</Badge> : <Badge tone="neutral">Low</Badge>}</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
