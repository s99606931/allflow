'use client';

import dynamic from 'next/dynamic';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, Progress } from '@/components/ui/primitives';
import { Download, Send, Sparkles } from 'lucide-react';

const ReportDownloadButton = dynamic(
  () => import('@/lib/pdf-reports').then(m => m.ReportDownloadButton),
  { ssr: false, loading: () => <Button variant="secondary" size="sm" disabled><Download size={13} /> PDF 준비 중...</Button> },
);

const MONTHLY_REPORT = {
  id: 'rpt-m-2026-04',
  kind: 'monthly' as const,
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  generatedAt: '2026-04-30T09:00:00.000Z',
  author: 'AI Assistant — Executive Summary',
  tldr: '4월 핵심 — ALL-Flow 베타 출시 완료, 신규 고객 3사 (CJ ENM, 카카오게임즈, 토스), MRR +24% 성장. 다음 달 핵심 어젠다는 엔터프라이즈 SSO 패키지 + 다국어 베이스 + B2B 영업 확장.',
  kpis: [
    { label: 'MRR', value: '₩412M', delta: '+24%', dir: 'up' as const },
    { label: '신규 고객', value: '3', delta: '+2', dir: 'up' as const },
    { label: 'NPS', value: '64', delta: '+12pt', dir: 'up' as const },
    { label: '활성 사용자', value: '8.2K', delta: '+18%', dir: 'up' as const },
    { label: '평균 SLA', value: '94%', delta: '+2pt', dir: 'up' as const },
    { label: '인시던트', value: '4', delta: '-3', dir: 'down' as const },
  ],
  sections: [
    { heading: '핵심 성과 (4월)', body: 'ALL-Flow v1.0 GA 출시, 엔터프라이즈 고객 3사 온보딩, AI 자동 등록 정확도 92% 도달, Notion 양방향 동기화 GA.' },
    { heading: 'OKR 진척도', body: 'O1 (제품 신뢰성): 76% · O2 (고객 확장): 68% · O3 (AI 정확도): 92% · O4 (팀 빌딩): 85%' },
    { heading: '리스크 매트릭스', body: '결제 PG 의존성 (높음/대응중) · 다국어 지원 지연 (중간/계획) · 데이터 마이그레이션 부하 (낮음/모니터링)' },
    { heading: '5월 우선순위', body: 'SSO 패키지 (SAML/SCIM) · 다국어 베이스 (영/일) · B2B 영업 확장 (5사 파일럿) · 신규 인프라 (멀티 리전)' },
  ],
};


const KPIS = [
  { l: 'MAU', v: '2.4M', d: '+18%' },
  { l: '신규 가입', v: '142K', d: '+12%' },
  { l: 'NPS', v: '64', d: '+5' },
  { l: '월 매출', v: '₩3.2B', d: '+9%' },
  { l: '이탈률', v: '2.1%', d: '-0.4%' },
  { l: 'SLA 준수', v: '94%', d: '+2%' },
];

const OKR = [
  { kr: 'KR1: 모바일 MAU 2.5M', progress: 96 },
  { kr: 'KR2: NPS 70 달성', progress: 91 },
  { kr: 'KR3: 평균 응답 시간 150ms 이하', progress: 78 },
  { kr: 'KR4: 신규 시장 1개 진출', progress: 50 },
];

const RISKS = [
  { sev: 'critical', area: '결제', desc: 'PG 응답 지연 패턴', resp: '백업 PG 라우트 구축', owner: 'u3' },
  { sev: 'high', area: '인프라', desc: 'AI 토큰 사용량 급증', resp: '레이트 리미트 + 캐싱', owner: 'u2' },
  { sev: 'med', area: '인사', desc: '엔지니어링 채용 지연', resp: '리퍼럴 프로그램 강화', owner: 'u6' },
];

const SEV_TONE: any = { critical: 'danger', high: 'warning', med: 'info', low: 'neutral' };

export function ReportMonthlyPage() {
  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[16px] font-bold text-fg flex-1">월간 보고 — 2026년 4월</h2>
        <Button variant="secondary" size="sm"><Sparkles size={13} /> AI 다시 생성</Button>
        <ReportDownloadButton
          report={MONTHLY_REPORT}
          fileName={`monthly-report-${MONTHLY_REPORT.periodStart.slice(0, 7)}.pdf`}
          className="inline-flex items-center justify-center font-medium rounded-md transition-colors h-7 px-2.5 text-[12.5px] gap-1.5 bg-bg-elev border border-border text-fg-1 hover:bg-hover hover:border-border-strong"
        >
          <Download size={13} /> PDF
        </ReportDownloadButton>
        <Button variant="primary" size="sm"><Send size={13} /> 임원진 발송</Button>
      </div>

      <Card>
        <CardBody className="!p-10 space-y-8">
          <div>
            <div className="text-[11px] text-fg-3 uppercase tracking-wider font-semibold">EXECUTIVE SUMMARY · 임원진 발송용</div>
            <h1 className="text-[28px] font-bold text-fg mt-1 tracking-tight">2026년 4월 월간 보고</h1>
            <p className="text-[14px] text-fg-1 mt-3 leading-relaxed">
              4월은 <strong>MAU 2.4M(+18%)</strong> 달성으로 OKR 96% 진척, 모바일 v3.0 출시 D-22 일정 안에서 진행 중.
              결제 PG 안정성 이슈가 핵심 리스크로, 5월 초 백업 라우트 도입 예정.
            </p>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-fg mb-3">핵심 메트릭</h3>
            <div className="grid grid-cols-3 gap-3">
              {KPIS.map(k => (
                <div key={k.l} className="rounded-lg border border-border p-4">
                  <div className="text-[11px] text-fg-2">{k.l}</div>
                  <div className="text-[28px] font-bold mono mt-1 text-fg">{k.v}</div>
                  <div className="text-[12px] mono text-success mt-0.5">{k.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-fg mb-3">추이 (4월 vs 3월)</h3>
            <svg viewBox="0 0 800 200" className="w-full">
              {[0.25, 0.5, 0.75, 1].map(g => <line key={g} x1={20} x2={780} y1={20 + g * 160} y2={20 + g * 160} stroke="var(--color-border)" strokeDasharray="2 4" />)}
              <path d="M 20 130 L 90 120 L 160 110 L 230 95 L 300 100 L 370 85 L 440 75 L 510 70 L 580 65 L 650 55 L 720 45 L 780 40"
                fill="none" stroke="oklch(0.62 0.18 255)" strokeWidth="2.5" />
              <path d="M 20 150 L 90 145 L 160 140 L 230 135 L 300 130 L 370 125 L 440 120 L 510 115 L 580 110 L 650 105 L 720 100 L 780 95"
                fill="none" stroke="oklch(0.7 0.01 250)" strokeWidth="2" strokeDasharray="3 3" />
            </svg>
            <div className="flex gap-4 mt-2 text-[11px] text-fg-2">
              <span><span className="inline-block w-3 h-0.5 bg-accent mr-1.5" />4월</span>
              <span><span className="inline-block w-3 h-0.5 bg-fg-3 mr-1.5" />3월</span>
            </div>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-fg mb-3">OKR 진척도</h3>
            <div className="space-y-3">
              {OKR.map(o => (
                <div key={o.kr}>
                  <div className="flex justify-between text-[13px] mb-1.5"><span className="font-medium text-fg">{o.kr}</span><span className="mono font-bold text-fg-1">{o.progress}%</span></div>
                  <Progress value={o.progress} tone={o.progress >= 90 ? 'success' : o.progress >= 70 ? 'accent' : 'warning'} className="!h-2" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-fg mb-3">리스크 매트릭스</h3>
            <Card>
              <div className="grid grid-cols-[80px_100px_1fr_220px_120px] gap-3 px-4 h-9 items-center text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold border-b border-border">
                <div>심각도</div><div>영역</div><div>이슈</div><div>대응</div><div>오너</div>
              </div>
              {RISKS.map((r, i) => (
                <div key={i} className="grid grid-cols-[80px_100px_1fr_220px_120px] gap-3 px-4 py-3 items-center text-[12.5px] border-b border-border last:border-0">
                  <div><Badge tone={SEV_TONE[r.sev]}>{r.sev}</Badge></div>
                  <div className="text-fg-1">{r.area}</div>
                  <div className="text-fg font-medium">{r.desc}</div>
                  <div className="text-fg-1">{r.resp}</div>
                  <div className="text-fg-2 mono text-[11.5px]">{r.owner}</div>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <h3 className="text-[16px] font-bold text-fg mb-3">5월 우선순위</h3>
            <ul className="text-[14px] text-fg-1 leading-[1.8] list-disc pl-5 space-y-1">
              <li>모바일 v3.0 정식 출시 (5/22) — D-Day 카운트다운 시작</li>
              <li>결제 백업 PG 라우트 도입 — P0 이슈 재발 방지</li>
              <li>AI 토큰 거버넌스 정책 수립 + 캐싱 인프라 구축</li>
              <li>Q2 회고 + Q3 계획 수립</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
