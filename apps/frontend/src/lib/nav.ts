/**
 * 사이드바 / 명령 팔레트 / 토스트에서 공유하는 정적 네비게이션 트리.
 *
 * UI 라우팅 메타데이터로, 백엔드 API 가 아닌 앱 자체 구성이다.
 * (이전에는 lib/fixtures.ts 에 함께 묶여 있었으나 USE_MOCK 정리에 따라 분리.)
 */
import type { NavSection } from './types';

export const NAV: NavSection[] = [
  { sect: '워크스페이스', items: [
    { id: 'home', label: '대시보드', icon: 'LayoutDashboard', href: '/' },
    { id: 'projects', label: '프로젝트', icon: 'FolderKanban', href: '/projects' },
    { id: 'tasks', label: '내 태스크', icon: 'CheckSquare', href: '/tasks' },
    { id: 'gantt', label: '간트차트', icon: 'GanttChart', href: '/gantt' },
    { id: 'issues', label: '이슈 관리', icon: 'AlertCircle', href: '/issues' },
    { id: 'approvals', label: '결재함', icon: 'FileCheck2', href: '/approvals' },
    { id: 'calendar', label: '캘린더', icon: 'Calendar', href: '/calendar' },
    { id: 'docs', label: '문서 / 위키', icon: 'FileText', href: '/docs' },
    { id: 'chat', label: '팀 채팅', icon: 'MessageSquare', href: '/chat' },
  ]},
  { sect: '영업 / 고객사', items: [
    { id: 'progress', label: '진행률 관리', icon: 'TrendingUp', href: '/progress' },
    { id: 'clients', label: '고객사 (CRM)', icon: 'Building2', href: '/clients' },
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
    { id: 'notif', label: '알림 센터', icon: 'Bell', href: '/notifications' },
    { id: 'settings', label: '개인 설정', icon: 'Settings', href: '/settings' },
  ]},
];
