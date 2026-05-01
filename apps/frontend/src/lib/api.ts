import {
  ProjectSchema, TaskSchema, IssueSchema, NotificationSchema,
  ReportSchema, ExtractedActionSchema, UserSchema, HealthSchema,
  NavCountsSchema,
  type Issue, type Project, type Task, type Notification,
  type Report, type ExtractedAction, type User, type Health, type NavCounts,
  type ProjectCreate, type ProjectPatch, type TaskCreate, type TaskPatch,
} from './schemas';
import { z } from 'zod';
import { http, parsed } from './api/http';
import { extendedApi } from './api/extended';

/**
 * API 클라이언트 — BE `/api/v1` 단일 진입점, 모든 응답을 Zod 로 런타임 검증.
 *
 * 환경변수:
 *   NEXT_PUBLIC_API_BASE_URL=...    → 기본 `/api/v1`
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
    parsed(http.get('health').json(), HealthSchema),

  /* Identity --------------------------------------------------------------- */
  me: async (): Promise<User> =>
    parsed(http.get('users/me').json(), UserSchema),

  listUsers: async (): Promise<User[]> =>
    parsed(http.get('users').json(), z.array(UserSchema)),

  inviteUserByEmail: async (email: string): Promise<{ id: string; pending: true }> =>
    http.post('users/invite', { json: { email } }).json<{ id: string; pending: true }>(),

  /* Projects --------------------------------------------------------------- */
  listProjects: async (): Promise<Project[]> =>
    parsed(http.get('projects').json(), z.array(ProjectSchema)),

  getProject: async (id: string): Promise<Project | undefined> =>
    parsed(http.get(`projects/${id}`).json(), ProjectSchema),

  createProject: async (input: ProjectCreate): Promise<Project> =>
    parsed(http.post('projects', { json: input }).json(), ProjectSchema),

  updateProject: async (id: string, patch: ProjectPatch): Promise<Project> =>
    parsed(http.patch(`projects/${id}`, { json: patch }).json(), ProjectSchema),

  /* Tasks ------------------------------------------------------------------ */
  listTasks: async (params?: { projectId?: string; assigneeId?: string }): Promise<Task[]> =>
    parsed(
      http.get('tasks', { searchParams: params as Record<string, string> }).json(),
      z.array(TaskSchema),
    ),

  createTask: async (input: TaskCreate): Promise<Task> =>
    parsed(http.post('tasks', { json: input }).json(), TaskSchema),

  updateTask: async (id: string, patch: TaskPatch): Promise<Task> =>
    parsed(http.patch(`tasks/${id}`, { json: patch }).json(), TaskSchema),

  /* Issues ----------------------------------------------------------------- */
  listIssues: async (): Promise<Issue[]> =>
    parsed(http.get('issues').json(), z.array(IssueSchema)),

  /* Notifications ---------------------------------------------------------- */
  listNotifications: async (): Promise<Notification[]> =>
    parsed(http.get('notifications').json(), z.array(NotificationSchema)),

  /* Reports ---------------------------------------------------------------- */
  generateWeeklyReport: async (input: {
    periodStart: string; periodEnd: string; scopeIds: string[];
    tone?: 'exec' | 'team' | 'casual';
  }): Promise<Report> =>
    parsed(http.post('reports/weekly', { json: input }).json(), ReportSchema),

  generateMonthlyReport: async (input: {
    year: number; month: number;
  }): Promise<Report> =>
    parsed(http.post('reports/monthly', { json: input }).json(), ReportSchema),

  /* AI -------------------------------------------------------------------- */
  aiComplete: async (prompt: string): Promise<AiCompleteResult> =>
    http.post('ai/complete', { json: { prompt } }).json<AiCompleteResult>(),

  aiExtractActions: async (input: {
    source: 'meeting' | 'email' | 'voice' | 'notion' | 'csv';
    content: string; threshold?: number;
  }): Promise<ExtractedAction[]> =>
    parsed(
      http.post('ai/extract-actions', { json: input }).json(),
      z.array(ExtractedActionSchema),
    ),

  /* Nav counts ------------------------------------------------------------- */
  getNavCounts: async (): Promise<NavCounts> =>
    parsed(http.get('nav-counts').json(), NavCountsSchema),
};

/**
 * 단일 진입점 `api` — 기본 엔드포인트(`baseApi`) + 확장 엔드포인트(`extendedApi`) 병합.
 * 호출자는 `api.<method>` 단일 표면만 사용한다.
 */
export const api = { ...baseApi, ...extendedApi };
