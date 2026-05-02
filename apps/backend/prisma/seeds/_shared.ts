/**
 * Seed 공통 유틸 — init / demo seed 가 함께 사용하는 도메인 데이터 정의.
 *
 * 정책:
 *   - init: 비어있는 DB + 1명의 owner 사용자만 (로그인 후 직접 입력 시작)
 *   - demo: USERS/PROJECTS/TASKS/ISSUES + 보조 데이터(approvals/clients/events/resources/notifications/channels/messages/leave/docs)
 *   - 두 시드 모두 멱등(upsert) — 재실행 안전
 *
 * 출처: apps/frontend/src/lib/fixtures.ts (TEAM/PROJECTS/TASKS/ISSUES) — 데모 일관성 유지
 */

export const ADMIN_USER = {
  id: 'me',
  name: '관리자',
  role: '관리자',
  dept: '운영',
  initials: 'AD',
  color: '#5B6CFF',
  email: 'admin@all-flow.local',
};

export interface SeedUser {
  id: string;
  name: string;
  role: string;
  dept: string;
  initials: string;
  color: string;
  email?: string;
}

export const DEMO_USERS: SeedUser[] = [
  {
    id: 'me',
    name: '김지우',
    role: '프로덕트 매니저',
    dept: '프로덕트팀',
    initials: 'JW',
    color: '#5B6CFF',
    email: 'jiwoo.kim@omelet.com',
  },
  { id: 'u1', name: '박서연', role: '시니어 디자이너', dept: '디자인팀', initials: 'SY', color: '#FF7A6B', email: 'seoyeon.park@omelet.com' },
  { id: 'u2', name: '이도현', role: '프론트엔드 리드', dept: '엔지니어링', initials: 'DH', color: '#34B27D', email: 'dohyun.lee@omelet.com' },
  { id: 'u3', name: '최민지', role: '백엔드 개발자', dept: '엔지니어링', initials: 'MJ', color: '#A66CFF', email: 'minji.choi@omelet.com' },
  { id: 'u4', name: '정태훈', role: 'iOS 개발자', dept: '엔지니어링', initials: 'TH', color: '#F2A93B', email: 'taehoon.jung@omelet.com' },
  { id: 'u5', name: '한가영', role: '마케팅 매니저', dept: '마케팅팀', initials: 'GY', color: '#E94B8A', email: 'gayoung.han@omelet.com' },
  { id: 'u6', name: '윤재석', role: 'CTO', dept: '경영진', initials: 'JS', color: '#2A86E0', email: 'jaeseok.yoon@omelet.com' },
];

export interface SeedProject {
  id: string;
  name: string;
  code: string;
  color: string;
  progress: number;
  budget?: number;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  due: string;
  members: string[];
}

export const DEMO_PROJECTS: SeedProject[] = [
  { id: 'p1', name: '모바일 앱 v3.0 리뉴얼', code: 'MOB', color: '#5B6CFF', progress: 68, budget: 120000000, status: 'doing', due: '2026-05-22', members: ['me', 'u1', 'u2', 'u4'] },
  { id: 'p2', name: 'B2B 어드민 대시보드', code: 'ADM', color: '#34B27D', progress: 42, budget: 80000000, status: 'doing', due: '2026-06-10', members: ['me', 'u3', 'u2'] },
  { id: 'p3', name: 'Q2 마케팅 캠페인', code: 'MKT', color: '#FF7A6B', progress: 91, budget: 50000000, status: 'review', due: '2026-05-05', members: ['u5', 'u1', 'me'] },
  { id: 'p4', name: '결제 시스템 리팩터링', code: 'PAY', color: '#A66CFF', progress: 23, budget: 45000000, status: 'doing', due: '2026-07-15', members: ['u3', 'u6'] },
  { id: 'p5', name: '신규 사옥 IT 구축', code: 'OFC', color: '#F2A93B', progress: 100, budget: 200000000, status: 'done', due: '2026-04-12', members: ['u6', 'u3'] },
  { id: 'p6', name: '데이터 파이프라인 v2', code: 'DAT', color: '#2A86E0', progress: 15, budget: 60000000, status: 'doing', due: '2026-08-30', members: ['u3', 'u6', 'u2'] },
  { id: 'p7', name: '온보딩 디자인 시스템', code: 'DSN', color: '#E94B8A', progress: 55, budget: 30000000, status: 'doing', due: '2026-06-20', members: ['u1', 'me'] },
  { id: 'p8', name: '백오피스 사용자 관리', code: 'USR', color: '#34B27D', progress: 30, status: 'todo', due: '2026-07-05', members: ['u3', 'me'] },
];

export interface SeedTask {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  proj: string;
  assignee: string;
  due: string;
  priority: 'high' | 'med' | 'low';
  tags: string[];
}

export const DEMO_TASKS: SeedTask[] = [
  { id: 'T-1024', title: '온보딩 플로우 인터랙션 프로토타입', status: 'doing', proj: 'p1', assignee: 'u1', due: '오늘', priority: 'high', tags: ['디자인', 'UX'] },
  { id: 'T-1025', title: '결제 webhook 멱등성 검증', status: 'review', proj: 'p4', assignee: 'u3', due: '내일', priority: 'high', tags: ['백엔드'] },
  { id: 'T-1026', title: '주간 회고 회의록 정리', status: 'todo', proj: 'p1', assignee: 'me', due: '오늘', priority: 'med', tags: ['문서'] },
  { id: 'T-1027', title: '랜딩페이지 A/B 테스트 결과 리뷰', status: 'doing', proj: 'p3', assignee: 'u5', due: '5/2', priority: 'med', tags: ['마케팅', '분석'] },
  { id: 'T-1028', title: '권한 정책 ABAC → RBAC 마이그레이션', status: 'todo', proj: 'p2', assignee: 'u3', due: '5/8', priority: 'low', tags: ['백엔드', '보안'] },
  { id: 'T-1029', title: 'iOS 17 푸시 알림 카테고리 액션', status: 'blocked', proj: 'p1', assignee: 'u4', due: '5/4', priority: 'high', tags: ['iOS'] },
  { id: 'T-1030', title: '모바일 햅틱 피드백 패턴 정의', status: 'todo', proj: 'p1', assignee: 'u4', due: '5/9', priority: 'low', tags: ['iOS', 'UX'] },
  { id: 'T-1031', title: '어드민 대시보드 차트 컴포넌트 개발', status: 'doing', proj: 'p2', assignee: 'u2', due: '5/10', priority: 'med', tags: ['프론트', '차트'] },
  { id: 'T-1032', title: '백엔드 API 캐싱 레이어 도입', status: 'doing', proj: 'p2', assignee: 'u3', due: '5/14', priority: 'med', tags: ['백엔드', '성능'] },
  { id: 'T-1033', title: '검색 결과 정렬 버그 재현', status: 'review', proj: 'p2', assignee: 'u3', due: '내일', priority: 'high', tags: ['버그', '검색'] },
  { id: 'T-1034', title: 'Q2 캠페인 KPI 보드 작성', status: 'doing', proj: 'p3', assignee: 'u5', due: '오늘', priority: 'high', tags: ['마케팅'] },
  { id: 'T-1035', title: '캠페인 영상 콘티 검토', status: 'todo', proj: 'p3', assignee: 'u1', due: '5/3', priority: 'low', tags: ['콘텐츠'] },
  { id: 'T-1036', title: 'PG 응답 지연 모니터링 알람', status: 'todo', proj: 'p4', assignee: 'u3', due: '5/7', priority: 'high', tags: ['백엔드', '운영'] },
  { id: 'T-1037', title: '결제 화면 에러 리커버리 흐름', status: 'doing', proj: 'p4', assignee: 'u1', due: '5/9', priority: 'med', tags: ['UX', '결제'] },
  { id: 'T-1038', title: '결제 시스템 부하 테스트 시나리오', status: 'todo', proj: 'p4', assignee: 'u3', due: '5/12', priority: 'med', tags: ['QA'] },
  { id: 'T-1039', title: '신규 사옥 네트워크 회선 점검', status: 'done', proj: 'p5', assignee: 'u6', due: '4/10', priority: 'med', tags: ['IT'] },
  { id: 'T-1040', title: '회의실 예약 시스템 검수', status: 'done', proj: 'p5', assignee: 'u3', due: '4/12', priority: 'low', tags: ['운영'] },
  { id: 'T-1041', title: 'ETL 워크플로 v2 설계', status: 'doing', proj: 'p6', assignee: 'u3', due: '5/20', priority: 'high', tags: ['데이터'] },
  { id: 'T-1042', title: 'Notion → DW 커넥터 PoC', status: 'todo', proj: 'p6', assignee: 'u2', due: '5/25', priority: 'med', tags: ['데이터', '연동'] },
  { id: 'T-1043', title: '디자인 토큰 v3 정의', status: 'doing', proj: 'p7', assignee: 'u1', due: '5/15', priority: 'high', tags: ['디자인'] },
  { id: 'T-1044', title: '컴포넌트 라이브러리 문서화', status: 'todo', proj: 'p7', assignee: 'me', due: '5/18', priority: 'med', tags: ['디자인', '문서'] },
  { id: 'T-1045', title: '관리자 권한 매트릭스 설계', status: 'todo', proj: 'p8', assignee: 'u3', due: '5/30', priority: 'high', tags: ['보안', 'RBAC'] },
  { id: 'T-1046', title: '사용자 초대 메일 템플릿', status: 'todo', proj: 'p8', assignee: 'u1', due: '5/28', priority: 'low', tags: ['UX'] },
  { id: 'T-1047', title: '알림 센터 IA 재설계', status: 'review', proj: 'p7', assignee: 'u1', due: '5/8', priority: 'med', tags: ['UX', 'IA'] },
  { id: 'T-1048', title: '다크모드 색상 대비 검증', status: 'todo', proj: 'p7', assignee: 'me', due: '5/19', priority: 'low', tags: ['a11y', '디자인'] },
  { id: 'T-1049', title: '백엔드 환경별 시크릿 분리', status: 'todo', proj: 'p4', assignee: 'u3', due: '5/16', priority: 'med', tags: ['보안', '운영'] },
  { id: 'T-1050', title: 'CI 파이프라인 캐시 최적화', status: 'doing', proj: 'p2', assignee: 'u2', due: '5/13', priority: 'low', tags: ['DevOps'] },
  { id: 'T-1051', title: 'iOS 위젯 신규 디자인 검토', status: 'todo', proj: 'p1', assignee: 'u4', due: '5/22', priority: 'med', tags: ['iOS', '디자인'] },
  { id: 'T-1052', title: '회의록 → 액션 자동 추출 PoC', status: 'doing', proj: 'p6', assignee: 'u3', due: '5/24', priority: 'high', tags: ['AI'] },
  { id: 'T-1053', title: '월간 보고 KPI 정의 워크숍', status: 'todo', proj: 'p3', assignee: 'me', due: '5/6', priority: 'med', tags: ['보고'] },
  { id: 'T-1054', title: '결제 영수증 PDF 양식 정비', status: 'todo', proj: 'p4', assignee: 'u1', due: '5/11', priority: 'low', tags: ['UX', '문서'] },
  { id: 'T-1055', title: '백엔드 OpenTelemetry 도입', status: 'todo', proj: 'p2', assignee: 'u3', due: '5/26', priority: 'med', tags: ['관측성'] },
];

export interface SeedIssue {
  id: string;
  title: string;
  proj: string;
  projColor: string;
  sev: 'critical' | 'high' | 'med' | 'low';
  prio: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'in_progress' | 'in_review' | 'resolved';
  assignee: string;
  reporter: string;
  tags: string[];
  sla: string;
  slaPct: number;
  linked: number;
  resolved?: boolean;
}

export const DEMO_ISSUES: SeedIssue[] = [
  { id: 'ISS-241', title: 'iOS 15.4에서 푸시 알림 수신 실패 (간헐적)', proj: 'p1', projColor: '#5B6CFF', sev: 'critical', prio: 'P0', status: 'in_progress', assignee: 'u4', reporter: 'u5', tags: ['iOS', 'push', 'prod'], sla: '12h', slaPct: 65, linked: 3 },
  { id: 'ISS-238', title: '결제 화면 PG 응답 지연 → 타임아웃', proj: 'p4', projColor: '#A66CFF', sev: 'critical', prio: 'P0', status: 'open', assignee: 'u3', reporter: 'u6', tags: ['payment', 'PG', 'blocker'], sla: '8h', slaPct: 92, linked: 5 },
  { id: 'ISS-235', title: '어드민 사용자 검색 결과 불일치 (정렬 버그)', proj: 'p2', projColor: '#34B27D', sev: 'high', prio: 'P1', status: 'in_review', assignee: 'u3', reporter: 'me', tags: ['bug', 'search'], sla: '3d', slaPct: 38, linked: 1 },
  { id: 'ISS-232', title: '온보딩 인터랙션 끊김 (Android 저사양)', proj: 'p1', projColor: '#5B6CFF', sev: 'high', prio: 'P1', status: 'open', assignee: 'u1', reporter: 'u4', tags: ['Android', 'perf', 'UX'], sla: '3d', slaPct: 22, linked: 2 },
  { id: 'ISS-228', title: 'Notion 연동 후 문서 일부 깨짐', proj: 'p6', projColor: '#2A86E0', sev: 'med', prio: 'P2', status: 'open', assignee: 'u2', reporter: 'u1', tags: ['integration', 'notion'], sla: '5d', slaPct: 45, linked: 0 },
  { id: 'ISS-225', title: '캘린더 반복 일정 시간대 어긋남', proj: 'p6', projColor: '#2A86E0', sev: 'med', prio: 'P2', status: 'in_progress', assignee: 'u3', reporter: 'u5', tags: ['calendar', 'tz'], sla: '5d', slaPct: 60, linked: 0 },
  { id: 'ISS-219', title: '다크모드에서 차트 색상 대비 부족', proj: 'p2', projColor: '#34B27D', sev: 'low', prio: 'P3', status: 'in_progress', assignee: 'u1', reporter: 'me', tags: ['a11y', 'dark'], sla: '7d', slaPct: 55, linked: 0 },
  { id: 'ISS-208', title: 'CSV 내보내기 한글 깨짐 (Excel)', proj: 'p2', projColor: '#34B27D', sev: 'med', prio: 'P2', status: 'resolved', assignee: 'u3', reporter: 'u5', tags: ['export', 'i18n'], sla: '5d', slaPct: 100, linked: 0, resolved: true },
];
