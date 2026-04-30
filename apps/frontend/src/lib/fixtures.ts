import type { User, Project, Task, Issue, Activity, NavSection } from './types';

export const ME: User = {
  id: 'me', name: '김지우', role: '프로덕트 매니저', dept: '프로덕트팀',
  initials: 'JW', color: '#5B6CFF', email: 'jiwoo.kim@omelet.com',
};

export const TEAM: User[] = [
  ME,
  { id: 'u1', name: '박서연', role: '시니어 디자이너', dept: '디자인팀', initials: 'SY', color: '#FF7A6B' },
  { id: 'u2', name: '이도현', role: '프론트엔드 리드', dept: '엔지니어링', initials: 'DH', color: '#34B27D' },
  { id: 'u3', name: '최민지', role: '백엔드 개발자', dept: '엔지니어링', initials: 'MJ', color: '#A66CFF' },
  { id: 'u4', name: '정태훈', role: 'iOS 개발자', dept: '엔지니어링', initials: 'TH', color: '#F2A93B' },
  { id: 'u5', name: '한가영', role: '마케팅 매니저', dept: '마케팅팀', initials: 'GY', color: '#E94B8A' },
  { id: 'u6', name: '윤재석', role: 'CTO', dept: '경영진', initials: 'JS', color: '#2A86E0' },
];

export const PROJECTS: Project[] = [
  { id: 'p1', name: '모바일 앱 v3.0 리뉴얼', code: 'MOB', color: '#5B6CFF', progress: 68, status: 'doing', due: '2026-05-22', members: ['me','u1','u2','u4'], tasks: { total: 87, done: 59 } },
  { id: 'p2', name: 'B2B 어드민 대시보드', code: 'ADM', color: '#34B27D', progress: 42, status: 'doing', due: '2026-06-10', members: ['me','u3','u2'], tasks: { total: 64, done: 27 } },
  { id: 'p3', name: 'Q2 마케팅 캠페인', code: 'MKT', color: '#FF7A6B', progress: 91, status: 'review', due: '2026-05-05', members: ['u5','u1','me'], tasks: { total: 32, done: 29 } },
  { id: 'p4', name: '결제 시스템 리팩터링', code: 'PAY', color: '#A66CFF', progress: 23, status: 'doing', due: '2026-07-15', members: ['u3','u6'], tasks: { total: 51, done: 12 } },
  { id: 'p5', name: '신규 사옥 IT 구축', code: 'OFC', color: '#F2A93B', progress: 100, status: 'done', due: '2026-04-12', members: ['u6','u3'], tasks: { total: 24, done: 24 } },
];

export const TASKS: Task[] = [
  { id: 'T-1024', title: '온보딩 플로우 인터랙션 프로토타입', status: 'doing', proj: 'p1', assignee: 'u1', due: '오늘', priority: 'high', tags: ['디자인','UX'] },
  { id: 'T-1025', title: '결제 webhook 멱등성 검증', status: 'review', proj: 'p4', assignee: 'u3', due: '내일', priority: 'high', tags: ['백엔드'] },
  { id: 'T-1026', title: '주간 회고 회의록 정리', status: 'todo', proj: 'p1', assignee: 'me', due: '오늘', priority: 'med', tags: ['문서'] },
  { id: 'T-1027', title: '랜딩페이지 A/B 테스트 결과 리뷰', status: 'doing', proj: 'p3', assignee: 'u5', due: '5/2', priority: 'med', tags: ['마케팅','분석'] },
  { id: 'T-1028', title: '권한 정책 ABAC → RBAC 마이그레이션', status: 'todo', proj: 'p2', assignee: 'u3', due: '5/8', priority: 'low', tags: ['백엔드','보안'] },
  { id: 'T-1029', title: 'iOS 17 푸시 알림 카테고리 액션', status: 'blocked', proj: 'p1', assignee: 'u4', due: '5/4', priority: 'high', tags: ['iOS'] },
];

export const ISSUES: Issue[] = [
  { id: 'ISS-241', title: 'iOS 15.4에서 푸시 알림 수신 실패 (간헐적)', proj: 'MOB', projColor: '#5B6CFF', sev: 'critical', prio: 'P0', status: 'in-progress', assignee: 'u4', reporter: 'u5', tags: ['iOS','push','prod'], created: '2시간 전', sla: '12h', slaPct: 65, comments: 8, linked: 3 },
  { id: 'ISS-238', title: '결제 화면 PG 응답 지연 → 타임아웃', proj: 'PAY', projColor: '#A66CFF', sev: 'critical', prio: 'P0', status: 'open', assignee: 'u3', reporter: 'u6', tags: ['payment','PG','blocker'], created: '6시간 전', sla: '8h', slaPct: 92, comments: 14, linked: 5 },
  { id: 'ISS-235', title: '어드민 사용자 검색 결과 불일치 (정렬 버그)', proj: 'ADM', projColor: '#34B27D', sev: 'high', prio: 'P1', status: 'in-review', assignee: 'u3', reporter: 'me', tags: ['bug','search'], created: '어제', sla: '3d', slaPct: 38, comments: 5, linked: 1 },
  { id: 'ISS-232', title: '온보딩 인터랙션 끊김 (Android 저사양)', proj: 'MOB', projColor: '#5B6CFF', sev: 'high', prio: 'P1', status: 'open', assignee: 'u1', reporter: 'u4', tags: ['Android','perf','UX'], created: '어제', sla: '3d', slaPct: 22, comments: 3, linked: 2 },
  { id: 'ISS-228', title: 'Notion 연동 후 문서 일부 깨짐', proj: 'INFRA', projColor: '#2A86E0', sev: 'med', prio: 'P2', status: 'open', assignee: 'u2', reporter: 'u1', tags: ['integration','notion'], created: '2일 전', sla: '5d', slaPct: 45, comments: 2, linked: 0 },
  { id: 'ISS-225', title: '캘린더 반복 일정 시간대 어긋남', proj: 'INFRA', projColor: '#2A86E0', sev: 'med', prio: 'P2', status: 'in-progress', assignee: 'u3', reporter: 'u5', tags: ['calendar','tz'], created: '3일 전', sla: '5d', slaPct: 60, comments: 6, linked: 0 },
  { id: 'ISS-219', title: '다크모드에서 차트 색상 대비 부족', proj: 'ADM', projColor: '#34B27D', sev: 'low', prio: 'P3', status: 'in-progress', assignee: 'u1', reporter: 'me', tags: ['a11y','dark'], created: '4일 전', sla: '7d', slaPct: 55, comments: 1, linked: 0 },
  { id: 'ISS-208', title: 'CSV 내보내기 한글 깨짐 (Excel)', proj: 'ADM', projColor: '#34B27D', sev: 'med', prio: 'P2', status: 'resolved', assignee: 'u3', reporter: 'u5', tags: ['export','i18n'], created: '1주 전', sla: '5d', slaPct: 100, comments: 4, linked: 0, resolved: true },
];

export const ACTIVITY: Activity[] = [
  { who: 'u1', what: '디자인 시안 v2를', target: '온보딩 플로우', verb: '에 첨부했습니다', time: '12분 전', proj: 'p1', kind: 'attach' },
  { who: 'u3', what: '태스크', target: '결제 webhook 멱등성 검증', verb: '를 리뷰 상태로 이동했습니다', time: '38분 전', proj: 'p4', kind: 'status' },
  { who: 'ai', what: '회의록에서 자동으로', target: '7개의 액션 아이템', verb: '을 생성했습니다', time: '1시간 전', proj: 'p1', kind: 'ai' },
  { who: 'u5', what: '문서', target: 'Q2 마케팅 KPI 정리', verb: '를 발행했습니다', time: '2시간 전', proj: 'p3', kind: 'doc' },
];

export const NAV: NavSection[] = [
  { sect: '워크스페이스', items: [
    { id: 'home', label: '대시보드', icon: 'LayoutDashboard', href: '/' },
    { id: 'projects', label: '프로젝트', icon: 'FolderKanban', count: 5, href: '/projects' },
    { id: 'tasks', label: '내 태스크', icon: 'CheckSquare', count: 12, href: '/tasks' },
    { id: 'gantt', label: '간트차트', icon: 'GanttChart', href: '/gantt' },
    { id: 'issues', label: '이슈 관리', icon: 'AlertCircle', count: 9, href: '/issues' },
    { id: 'approvals', label: '결재함', icon: 'FileCheck2', count: 4, href: '/approvals' },
    { id: 'calendar', label: '캘린더', icon: 'Calendar', href: '/calendar' },
    { id: 'docs', label: '문서 / 위키', icon: 'FileText', href: '/docs' },
    { id: 'chat', label: '팀 채팅', icon: 'MessageSquare', count: 3, href: '/chat' },
  ]},
  { sect: '영업 / 고객사', items: [
    { id: 'progress', label: '진행률 관리', icon: 'TrendingUp', href: '/progress' },
    { id: 'clients', label: '고객사 (CRM)', icon: 'Building2', count: 8, href: '/clients' },
  ]},
  { sect: 'AI', items: [
    { id: 'ai-auto', label: 'AI 자동 등록', icon: 'Sparkles', href: '/ai-auto' },
    { id: 'notion', label: 'Notion 연동', icon: 'Database', href: '/notion' },
  ]},
  { sect: '보고', items: [
    { id: 'weekly', label: '주간 보고', icon: 'FileBarChart', href: '/reports/weekly' },
    { id: 'monthly', label: '월간 보고', icon: 'BarChart3', href: '/reports/monthly' },
  ]},
  { sect: '관리', items: [
    { id: 'org', label: '조직도', icon: 'Network', href: '/org' },
    { id: 'users-pro', label: '사용자 관리', icon: 'Users', href: '/users' },
    { id: 'hr', label: '인사 / HR', icon: 'BadgeCheck', href: '/hr' },
    { id: 'resources', label: '회의실 · 리소스', icon: 'CalendarRange', href: '/resources' },
    { id: 'admin', label: '관리자 콘솔', icon: 'Shield', href: '/admin' },
    { id: 'notif', label: '알림 센터', icon: 'Bell', count: 8, href: '/notifications' },
    { id: 'settings', label: '개인 설정', icon: 'Settings', href: '/settings' },
  ]},
];

export function userById(id: string): User | undefined {
  return TEAM.find(u => u.id === id);
}
