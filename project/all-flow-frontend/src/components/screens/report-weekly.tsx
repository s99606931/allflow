'use client';

import dynamic from 'next/dynamic';
import { Card, CardBody, CardHeader, CardTitle, Avatar, AvatarStack, Badge, Button, Progress } from '@/components/ui/primitives';
import { TEAM, userById } from '@/lib/fixtures';
import { Calendar, Download, FileBarChart, Mail, RefreshCw, Send, Sparkles } from 'lucide-react';

// react-pdf is client-only and heavy — lazy load to avoid SSR issues
const ReportDownloadButton = dynamic(
  () => import('@/lib/pdf-reports').then(m => m.ReportDownloadButton),
  { ssr: false, loading: () => <Button variant="secondary" size="sm" disabled><Download size={13} /> PDF 준비 중...</Button> },
);

const SAMPLE_REPORT = {
  id: 'rpt-w-2026w16',
  kind: 'weekly' as const,
  periodStart: '2026-04-22',
  periodEnd: '2026-04-28',
  generatedAt: '2026-04-28T09:00:00.000Z',
  author: 'AI Assistant',
  tldr: '이번 주 핵심 — 모바일 v3.0 진척 +12%p, Q2 캠페인 91% 달성으로 마감 임박, 결제 시스템 PG 지연(P0) 2회 발생해 SLA 92% 도달. 다음 주 우선순위는 iOS 푸시 인증서 갱신과 다크모드 QA 마무리.',
  kpis: [
    { label: '완료 태스크', value: '47', delta: '+12', dir: 'up' as const },
    { label: '활성 이슈', value: '8', delta: '-3', dir: 'down' as const },
    { label: '평균 SLA', value: '92%', delta: '-2pt', dir: 'down' as const },
    { label: '배포 횟수', value: '12', delta: '+4', dir: 'up' as const },
  ],
  sections: [
    { heading: '핵심 성과', body: '모바일 v3.0 빌드 진척 +12%p, Q2 마케팅 캠페인 91% 달성, AI 자동 등록 정확도 87→92%로 개선.', citations: [{ kind: 'task', id: 'TASK-204', label: 'TASK-204' }, { kind: 'doc', id: 'MTG-04-25', label: 'MTG-04-25' }] },
    { heading: '프로젝트별 진척도', body: '모바일 v3.0: 78% (전주 +9%) · B2B 어드민: 64% (+14%) · Q2 마케팅: 91% (+5%) · 결제 시스템: 56% (+2%)' },
    { heading: '리스크 / 이슈', body: 'BUG-204 결제 PG 지연 — 백업 라우트로 임시 해결, 근본 원인 분석 진행 중. P0 2건 발생으로 SLA 92%로 하락.' },
    { heading: '다음 주 계획', body: 'iOS 푸시 인증서 갱신, 다크모드 QA 마무리, CJ 1차 검수, ALL-Flow 다국어 베이스, 파트너 데모 (5/2)' },
  ],
};

export function ReportWeeklyPage() {
  return (
    <div className="p-6 grid grid-cols-12 gap-5 max-w-[1440px] mx-auto">
      {/* LEFT — settings */}
      <div className="col-span-4 space-y-4">
        <Card>
          <CardHeader><CardTitle>보고 설정</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">유형</div>
              <div className="flex gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
                {['주간', '격주', '월간'].map((c, i) => (
                  <button key={c} className={`flex-1 h-7 rounded text-[12px] font-medium transition-colors ${i === 0 ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">기간</div>
              <div className="flex items-center gap-2 text-[12px] text-fg-1 px-3 py-2 rounded-md border border-border bg-bg-1">
                <Calendar size={12} /><span className="mono">2026-04-22 — 2026-04-28</span>
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">대상 범위</div>
              {['모바일 앱 v3.0', 'B2B 어드민', 'Q2 마케팅', '결제 시스템'].map((p, i) => (
                <label key={p} className="flex items-center gap-2 text-[12.5px] text-fg-1 py-1">
                  <input type="checkbox" defaultChecked={i < 3} />
                  <span>{p}</span>
                </label>
              ))}
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">데이터 소스</div>
              {[
                { l: '태스크 (Jira/내부)', n: 87 },
                { l: '채팅 메시지', n: 412 },
                { l: '회의록', n: 14 },
                { l: 'GitHub 활동', n: 36 },
                { l: '캘린더', n: 28 },
                { l: 'Notion 문서', n: 12 },
                { l: '이슈 / 인시던트', n: 8 },
              ].map(s => (
                <label key={s.l} className="flex items-center gap-2 text-[12px] text-fg-1 py-1">
                  <input type="checkbox" defaultChecked />
                  <span className="flex-1">{s.l}</span>
                  <span className="mono text-[10.5px] text-fg-3">{s.n}건</span>
                </label>
              ))}
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">톤 / 형식</div>
              <select className="w-full h-8 px-2 rounded-md bg-bg-1 border border-border text-[12.5px]">
                <option>임원용 (요약 + KPI)</option>
                <option>팀 내부 (디테일 풍부)</option>
                <option>고객 보고 (성과 중심)</option>
              </select>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">자동 발송</div>
              <select className="w-full h-8 px-2 rounded-md bg-bg-1 border border-border text-[12.5px]">
                <option>매주 금요일 17:00</option>
                <option>매주 월요일 09:00</option>
                <option>수동 발송만</option>
              </select>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* RIGHT — preview */}
      <div className="col-span-8 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-fg flex-1">미리보기</h2>
          <Button variant="secondary" size="sm"><Sparkles size={13} /> AI 다시 생성</Button>
          <ReportDownloadButton
            report={SAMPLE_REPORT}
            fileName={`weekly-report-${SAMPLE_REPORT.periodStart}.pdf`}
            className="inline-flex items-center justify-center font-medium rounded-md transition-colors h-7 px-2.5 text-[12.5px] gap-1.5 bg-bg-elev border border-border text-fg-1 hover:bg-hover hover:border-border-strong"
          >
            <Download size={13} /> PDF
          </ReportDownloadButton>
          <Button variant="primary" size="sm"><Send size={13} /> 발송</Button>
        </div>

        <Card>
          <CardBody className="space-y-6 !p-8">
            <div>
              <div className="text-[11px] text-fg-3 uppercase tracking-wider font-semibold">주간 보고 · 16주차</div>
              <h1 className="text-[24px] font-bold text-fg mt-1 tracking-tight">2026-04-22 ~ 04-28</h1>
            </div>

            <div className="rounded-lg bg-accent-soft border border-accent/20 p-4">
              <div className="flex items-center gap-2 mb-2"><Sparkles size={13} className="text-accent-strong" /><span className="text-[12px] font-semibold text-accent-strong">TL;DR</span></div>
              <p className="text-[13px] text-fg-1 leading-relaxed">
                이번 주는 <strong>모바일 v3.0 진척 +12%p</strong> 가 핵심 성과. Q2 캠페인이 91% 달성으로 마감 임박이며, 결제 시스템 PG 지연(P0)이 2회 발생해 SLA 92% 도달.
                다음 주 우선순위는 <strong>iOS 푸시 인증서 갱신</strong> 과 <strong>다크모드 QA 마무리</strong>.
              </p>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-fg mb-3">KPI</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: '완료 태스크', v: '87', d: '+24' },
                  { l: '평균 사이클', v: '2.4d', d: '-0.3' },
                  { l: 'SLA 준수', v: '94%', d: '+2%' },
                  { l: '미팅 시간', v: '38h', d: '-6h' },
                ].map(m => (
                  <div key={m.l} className="rounded-md border border-border p-3">
                    <div className="text-[10.5px] text-fg-3">{m.l}</div>
                    <div className="text-[20px] font-bold mono mt-0.5">{m.v}</div>
                    <div className="text-[10.5px] mono text-success">{m.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-fg mb-2">핵심 성과</h3>
              <ul className="text-[13px] text-fg-1 leading-[1.7] list-disc pl-5 space-y-1">
                <li>모바일 앱 v3.0 디자인 단계 80% 완료 <span className="ml-1 text-[10.5px] mono px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong">TASK-204</span></li>
                <li>Q2 마케팅 KPI 91% 달성, 5/5 마감 임박 <span className="ml-1 text-[10.5px] mono px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong">MTG-04-25</span></li>
                <li>어드민 대시보드 권한 정책 RBAC 마이그레이션 완료</li>
              </ul>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-fg mb-2">프로젝트별 진척</h3>
              <div className="space-y-2.5">
                {[
                  { p: '모바일 v3.0', cur: 68, prev: 56, color: 'oklch(0.62 0.18 255)' },
                  { p: 'B2B 어드민', cur: 42, prev: 38, color: 'oklch(0.65 0.16 155)' },
                  { p: 'Q2 캠페인', cur: 91, prev: 82, color: 'oklch(0.62 0.2 25)' },
                ].map(p => (
                  <div key={p.p}>
                    <div className="flex justify-between text-[12px] mb-1"><span className="font-medium">{p.p}</span><span className="mono"><strong>{p.cur}%</strong> <span className="text-fg-3">+{p.cur - p.prev}%p</span></span></div>
                    <div className="h-1.5 bg-bg-2 rounded-full"><div className="h-full rounded-full" style={{ width: `${p.cur}%`, background: p.color }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-fg mb-2">이슈 / 리스크</h3>
              <ul className="text-[13px] text-fg-1 leading-[1.7] list-disc pl-5 space-y-1">
                <li><strong className="text-danger">P0:</strong> 결제 PG 지연 2회 (ISS-238) — 백업 라우트 활성화 검토 중</li>
                <li><strong className="text-warning">P1:</strong> iOS 푸시 인증서 만료 (T-1029) — 5/4까지 갱신 필요</li>
              </ul>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-fg mb-2">다음 주 계획</h3>
              <ul className="text-[13px] text-fg-1 leading-[1.7] list-disc pl-5 space-y-1">
                <li>모바일 v3.0 다크모드 QA 마무리 (5/2)</li>
                <li>iOS 푸시 인증서 갱신 + T-1029 재오픈 (5/4)</li>
                <li>Q2 캠페인 최종 보고 및 회고 (5/5)</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
