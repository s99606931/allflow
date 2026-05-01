import { ME, PROJECTS, userById } from '@/lib/fixtures';
import {
  ProjectSchema, TaskSchema, IssueSchema, NotificationSchema,
  ReportSchema, ExtractedActionSchema, UserSchema, HealthSchema,
  NavCountsSchema,
  type Issue, type Project, type Task, type Notification,
  type Report, type ExtractedAction, type User, type Health, type NavCounts,
  type ProjectCreate, type ProjectPatch, type TaskCreate, type TaskPatch,
} from './schemas';
import { z } from 'zod';
import { http, parsed, sleep, USE_MOCK } from './api/http';
import { extendedApi } from './api/extended';

/**
 * API 클라이언트 — 픽스처(현재) ↔ 백엔드(추후) 단일 시멘.
 * 모든 응답은 Zod 로 런타임 검증되어 타입 안정성 보장.
 *
 * 환경변수:
 *   NEXT_PUBLIC_USE_MOCK=false              → 실제 API 사용
 *   NEXT_PUBLIC_API_BASE_URL=https://...    → 백엔드 베이스 URL
 *
 * 확장 엔드포인트(approvals, clients, events, docs, channels, org, ...)는
 * `./api/extended.ts`에서 정의하여 본 파일이 500 LOC를 초과하지 않도록 분리.
 */

export interface AiUsageMetric {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number | null;
  model?: string;
}

export interface AiCompleteResult {
  text: string;
  citations?: { kind: string; id: string }[];
  usage?: AiUsageMetric;
}

const baseApi = {
  /* Health ----------------------------------------------------------------- */
  getHealth: async (): Promise<Health> =>
    USE_MOCK
      ? (await sleep(), { status: 'ok' as const, uptime: 86400, version: '0.0.0-mock' })
      : parsed(http.get('health').json(), HealthSchema),

  /* Identity --------------------------------------------------------------- */
  me: async (): Promise<User> =>
    USE_MOCK ? (await sleep(), ME) : parsed(http.get('users/me').json(), UserSchema),

  listUsers: async (): Promise<User[]> => {
    if (USE_MOCK) {
      await sleep();
      const { TEAM } = await import('./fixtures');
      return [...TEAM];
    }
    return parsed(http.get('users').json(), z.array(UserSchema));
  },

  inviteUserByEmail: async (email: string): Promise<{ id: string; pending: true }> =>
    USE_MOCK
      ? (await sleep(), { id: `inv-${Date.now().toString(36)}`, pending: true })
      : http.post('users/invite', { json: { email } }).json<{ id: string; pending: true }>(),

  /* Projects --------------------------------------------------------------- */
  listProjects: async (): Promise<Project[]> =>
    USE_MOCK
      ? (await sleep(), [...PROJECTS])
      : parsed(http.get('projects').json(), z.array(ProjectSchema)),

  getProject: async (id: string): Promise<Project | undefined> =>
    USE_MOCK
      ? (await sleep(), PROJECTS.find(p => p.id === id))
      : parsed(http.get(`projects/${id}`).json(), ProjectSchema),

  createProject: async (input: ProjectCreate): Promise<Project> =>
    USE_MOCK
      ? (await sleep(), { ...input, id: 'PRJ-NEW', color: input.color ?? '#3B82F6', progress: 0, status: 'todo', due: input.due ?? '', members: [], tasks: { total: 0, done: 0 } } as Project)
      : parsed(http.post('projects', { json: input }).json(), ProjectSchema),

  updateProject: async (id: string, patch: ProjectPatch): Promise<Project> =>
    USE_MOCK
      ? (await sleep(), {
          ...PROJECTS.find(p => p.id === id),
          ...patch,
        } as Project)
      : parsed(http.patch(`projects/${id}`, { json: patch }).json(), ProjectSchema),

  /* Tasks ------------------------------------------------------------------ */
  listTasks: async (params?: { projectId?: string; assigneeId?: string }): Promise<Task[]> => {
    if (USE_MOCK) {
      await sleep();
      const { TASKS } = await import('./fixtures');
      return TASKS.filter(t =>
        (!params?.projectId || t.proj === params.projectId) &&
        (!params?.assigneeId || t.assignee === params.assigneeId),
      );
    }
    return parsed(
      http.get('tasks', { searchParams: params as Record<string, string> }).json(),
      z.array(TaskSchema),
    );
  },

  createTask: async (input: TaskCreate): Promise<Task> =>
    USE_MOCK
      ? (await sleep(), { id: 'TASK-NEW', status: 'todo', tags: [], due: '', priority: 'med', proj: input.projectId, assignee: input.assigneeId } as unknown as Task)
      : parsed(http.post('tasks', { json: input }).json(), TaskSchema),

  updateTask: async (id: string, patch: TaskPatch): Promise<Task> =>
    USE_MOCK
      ? (await sleep(), { id, ...patch } as Task)
      : parsed(http.patch(`tasks/${id}`, { json: patch }).json(), TaskSchema),

  /* Issues ----------------------------------------------------------------- */
  listIssues: async (): Promise<Issue[]> => {
    if (USE_MOCK) {
      await sleep();
      const { ISSUES } = await import('./fixtures');
      return [...ISSUES];
    }
    return parsed(http.get('issues').json(), z.array(IssueSchema));
  },

  /* Notifications ---------------------------------------------------------- */
  listNotifications: async (): Promise<Notification[]> => {
    if (USE_MOCK) {
      await sleep();
      return [
        { id: 'n1', kind: 'mention', title: '@김민수 - 디자인 검토 요청', time: new Date().toISOString(), read: false },
        { id: 'n2', kind: 'sla', title: 'BUG-204 SLA 임박 (2시간 남음)', time: new Date().toISOString(), read: false },
        { id: 'n3', kind: 'ai', title: 'AI: 회의록에서 4개 액션 아이템 추출', time: new Date().toISOString(), read: true },
      ];
    }
    return parsed(http.get('notifications').json(), z.array(NotificationSchema));
  },

  /* Reports ---------------------------------------------------------------- */
  generateWeeklyReport: async (input: {
    periodStart: string; periodEnd: string; scopeIds: string[];
    tone?: 'exec' | 'team' | 'casual';
  }): Promise<Report> => {
    if (USE_MOCK) {
      await sleep(1200);
      return {
        id: 'rpt-w-' + Date.now(),
        kind: 'weekly',
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
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
      };
    }
    return parsed(http.post('reports/weekly', { json: input }).json(), ReportSchema);
  },

  generateMonthlyReport: async (input: {
    year: number; month: number;
  }): Promise<Report> => {
    if (USE_MOCK) {
      await sleep(1400);
      const periodStart = `${input.year}-${String(input.month).padStart(2, '0')}-01`;
      const lastDay = new Date(input.year, input.month, 0).getDate();
      const periodEnd = `${input.year}-${String(input.month).padStart(2, '0')}-${lastDay}`;
      return {
        id: 'rpt-m-' + Date.now(),
        kind: 'monthly',
        periodStart,
        periodEnd,
        generatedAt: new Date().toISOString(),
        author: 'AI Assistant',
        tldr: `${input.year}년 ${input.month}월 임원 요약 — 분기 OKR 진척도 72%, 리스크 1건(P0), NPS +8pt.`,
        kpis: [
          { label: '월간 ARR', value: '$2.1M', delta: '+8.4%', dir: 'up' },
          { label: 'OKR 진척도', value: '72%', delta: '+12pt', dir: 'up' },
          { label: '활성 이슈', value: '14', delta: '-6', dir: 'down' },
          { label: '월간 활성 사용자', value: '3,420', delta: '+412', dir: 'up' },
          { label: '평균 SLA', value: '93%', delta: '+1pt', dir: 'up' },
          { label: '배포 횟수', value: '47', delta: '+9', dir: 'up' },
        ],
        sections: [
          { heading: 'Executive Summary', body: `${input.month}월 핵심 성과 — CJ ENM 영상 분석 프로젝트 베타 종료, ALL-Flow 다국어 지원 출시.` },
          { heading: 'OKR 진척도', body: 'O1: 70% (목표 80%), O2: 85% (목표 75%), O3: 60% (목표 70%)' },
          { heading: '리스크 매트릭스', body: 'P0 1건(결제 PG 통합 지연), P1 3건, P2 7건. 완화 계획 첨부.' },
          { heading: '다음 달 계획', body: 'OKR 분기 마감 점검, 파트너 컨퍼런스, 신규 채용 5명.' },
        ],
      };
    }
    return parsed(http.post('reports/monthly', { json: input }).json(), ReportSchema);
  },

  /* AI -------------------------------------------------------------------- */
  aiComplete: async (prompt: string): Promise<AiCompleteResult> => {
    if (USE_MOCK) {
      await sleep(600);
      return {
        text: `[MOCK] ${prompt} 에 대한 응답입니다.`,
        usage: {
          promptTokens: prompt.length,
          completionTokens: 12,
          totalTokens: prompt.length + 12,
          costUSD: 0,
          model: 'mock',
        },
      };
    }
    const r = await http
      .post('ai/complete', { json: { prompt } })
      .json<AiCompleteResult>();
    return r;
  },

  aiExtractActions: async (input: {
    source: 'meeting' | 'email' | 'voice' | 'notion' | 'csv';
    content: string; threshold?: number;
  }): Promise<ExtractedAction[]> => {
    if (USE_MOCK) {
      await sleep(900);
      return [
        { title: 'CJ ENM 1차 검수 보고서 작성', assignee: '이서연', due: '2026-04-30', priority: 'high', confidence: 0.94, sourceQuote: '서연님이 다음 주까지 검수 보고서 정리해주시기로 했고...' },
        { title: 'AI 자동 등록 정확도 측정 데이터 수집', assignee: '박지호', due: '2026-04-29', priority: 'med', confidence: 0.88, sourceQuote: '지호님 이번 주 안에 정확도 측정 데이터 모아주세요.' },
        { title: '결제 모듈 백업 PG 우회 라우트 검증', assignee: '김민수', due: '2026-04-28', priority: 'high', confidence: 0.91 },
        { title: '다음 스프린트 KR 초안 공유', assignee: '최유진', due: '2026-05-02', priority: 'low', confidence: 0.72 },
      ];
    }
    return parsed(
      http.post('ai/extract-actions', { json: input }).json(),
      z.array(ExtractedActionSchema),
    );
  },

  /* Nav counts ------------------------------------------------------------- */
  getNavCounts: async (): Promise<NavCounts> => {
    if (USE_MOCK) {
      await sleep();
      return { projects: 5, tasks: 12, issues: 9, approvals: 4, clients: 8, notifications: 8 };
    }
    return parsed(http.get('nav-counts').json(), NavCountsSchema);
  },
};

/**
 * 단일 진입점 `api` — 기본 엔드포인트(`baseApi`) + 확장 엔드포인트(`extendedApi`) 병합.
 * 호출자는 `api.<method>` 단일 표면만 사용한다.
 */
export const api = { ...baseApi, ...extendedApi };

export { userById };
