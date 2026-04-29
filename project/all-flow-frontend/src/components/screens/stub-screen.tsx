'use client';

import { AppShell } from '@/components/shell/app-shell';
import { PageStub } from '@/components/screens/_stub';

const STUBS: Record<string, { title: string; subtitle: string; body: string }> = {
  tasks: { title: '내 태스크', subtitle: '담당/멘션/마감 임박', body: '리스트 + 칸반 + 캘린더 뷰 — 디자인 캔버스 화면 03 참조.' },
  calendar: { title: '캘린더', subtitle: '미팅 · 마감 · 이벤트', body: '월/주/일 뷰 + Google/Outlook 연동 — 화면 07 참조.' },
  docs: { title: '문서 / 위키', subtitle: '팀 지식 베이스', body: '공유 문서 + AI 요약 + 양방향 링크 — 화면 08 참조.' },
  chat: { title: '팀 채팅', subtitle: '채널 + DM + AI 어시스턴트', body: '채널/DM/스레드 + 인-라인 AI — 화면 06 참조.' },
  progress: { title: '진행률 관리', subtitle: '포트폴리오 · 간트 · 헬스', body: '디자인 캔버스 화면 17 참조.' },
  clients: { title: '고객사 (CRM)', subtitle: '8개사 · MRR/ARR 추적', body: '화면 18-19 참조.' },
  'ai-auto': { title: 'AI 자동 등록', subtitle: '회의록 → 액션 아이템', body: '5개 입력 소스 · 신뢰도 표시 — 화면 04 참조.' },
  notion: { title: 'Notion 연동', subtitle: '6개 DB 양방향 동기화', body: '화면 05 참조.' },
  'reports/weekly': { title: '주간 보고', subtitle: 'AI 자동 작성', body: '7개 데이터 소스 + 인용 칩 — 화면 15 참조.' },
  'reports/monthly': { title: '월간 보고', subtitle: '임원용 Executive Summary', body: 'KPI 6개 + OKR + 리스크 매트릭스 — 화면 16 참조.' },
  org: { title: '조직도', subtitle: '부서/팀 구조', body: '화면 09 참조.' },
  users: { title: '사용자 관리', subtitle: '10명 · 5종 RBAC', body: 'MFA · 일괄 액션 — 화면 20 참조.' },
  admin: { title: '관리자 콘솔', subtitle: '시스템 헬스 · 감사 로그', body: 'SSO/SCIM/AI 거버넌스 — 화면 21 참조.' },
  notifications: { title: '알림 센터', subtitle: '8건 · 우선순위 정렬', body: '화면 11 참조.' },
};

export function StubScreen({ slug }: { slug: keyof typeof STUBS }) {
  const s = STUBS[slug];
  return (
    <AppShell title={s.title} subtitle={s.subtitle}>
      <PageStub title={`${s.title} (스텁)`} body={s.body} />
    </AppShell>
  );
}

export { STUBS };
