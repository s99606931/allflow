import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface WeeklyReportInput {
  periodStart?: string;
  periodEnd?: string;
  scopeIds?: string[];
  tone?: 'exec' | 'team' | 'casual';
}

export async function POST(req: Request) {
  const input: WeeklyReportInput = await req.json().catch(() => ({}));

  return NextResponse.json({
    id: 'rpt-w-' + Date.now(),
    kind: 'weekly',
    periodStart: input.periodStart ?? '2026-04-22',
    periodEnd: input.periodEnd ?? '2026-04-28',
    generatedAt: new Date().toISOString(),
    author: 'AI Assistant',
    tldr: '이번 주 핵심 — CJ ENM 영상 분석 프로젝트 베타 출시, BUG-204 결제 지연 이슈 핫픽스 배포, NPS +12pt.',
    kpis: [
      { label: '완료 태스크', value: '47', delta: '+12', dir: 'up' },
      { label: '활성 이슈', value: '8', delta: '-3', dir: 'down' },
      { label: '평균 SLA', value: '94%', delta: '+2pt', dir: 'up' },
      { label: '배포 횟수', value: '12', delta: '+4', dir: 'up' },
    ],
    sections: [
      { heading: '핵심 성과', body: 'CJ ENM 영상 분석 프로젝트 베타 출시 (TASK-204), AI 자동 등록 기능 정확도 87→92%로 개선.' },
      { heading: '프로젝트별 진척도', body: 'PRJ-201 (CJ): 78% (전주 +9%), PRJ-204 (ALL-Flow): 64% (전주 +14%)' },
      { heading: '리스크 / 이슈', body: 'BUG-204 결제 지연 이슈 — 백업 PG 우회 라우트로 임시 해결, 근본 원인 분석 진행 중.' },
      { heading: '다음 주 계획', body: 'CJ 1차 검수, ALL-Flow 다국어 지원 베이스, 파트너 데모 (5/2)' },
    ],
  });
}
