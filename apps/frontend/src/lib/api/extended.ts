/**
 * Extended API surface — endpoints introduced in PDCA-01.
 *
 * Covers: issues mutations, approvals, CRM clients, schedule events,
 * resources, docs, chat channels/messages, org/RBAC, profile,
 * notifications mutations.
 *
 * Mock branches return minimal but type-correct fixtures so UI flows can
 * be developed before the backend exposes the corresponding endpoint.
 */
import { z } from 'zod';
import { http, parsed, sleep, USE_MOCK } from './http';
import {
  ApprovalSchema,
  type Approval,
  type ApprovalCreate,
  type ApprovalDecision,
  ChannelSchema,
  type Channel,
  ClientSchema,
  type Client,
  type ClientCreate,
  CommentSchema,
  type Comment,
  type CommentCreate,
  DocSchema,
  type Doc,
  type DocCreate,
  EventSchema,
  type Event,
  type EventCreate,
  type InviteUser,
  IssueSchema,
  type Issue,
  type IssueCreate,
  type IssueTransition,
  type BulkMarkRead,
  type MessageSend,
  OrgUnitSchema,
  type OrgUnit,
  type ProfilePatch,
  ResourceSchema,
  type Resource,
  type ResourceBooking,
  type RevokeToken,
  UserSchema,
  type User,
} from '../schemas';

export interface GanttTask {
  id: string;
  title: string;
  kind: string;
  projectId: string;
  projectColor?: string | null;
  assigneeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress: number;
  status: string;
  priority: string;
}

export interface GanttDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
}

export interface GanttResponse {
  range?: { from: string; to: string };
  tasks: GanttTask[];
  dependencies: GanttDependency[];
}

const TODAY = new Date();
const d = (offset: number) => {
  const dd = new Date(TODAY);
  dd.setDate(dd.getDate() + offset);
  return dd.toISOString().slice(0, 10);
};

const MOCK_GANTT_RESPONSE: GanttResponse = {
  range: { from: d(-7), to: d(30) },
  tasks: [
    { id: 't1', title: '모바일 앱 UI 리뉴얼', kind: 'task', projectId: 'p1', projectColor: '#5B6CFF', startDate: d(-5), endDate: d(5), progress: 60, status: 'doing', priority: 'high' },
    { id: 't2', title: 'B2B 어드민 대시보드 설계', kind: 'task', projectId: 'p2', projectColor: '#34B27D', startDate: d(0), endDate: d(10), progress: 20, status: 'todo', priority: 'med' },
    { id: 't3', title: 'Q2 마케팅 랜딩페이지', kind: 'task', projectId: 'p3', projectColor: '#FF7A6B', startDate: d(3), endDate: d(12), progress: 45, status: 'doing', priority: 'med' },
    { id: 't4', title: '결제 모듈 리팩터링', kind: 'task', projectId: 'p4', projectColor: '#A66CFF', startDate: d(7), endDate: d(20), progress: 10, status: 'todo', priority: 'high' },
    { id: 't5', title: 'API 문서화', kind: 'task', projectId: 'p1', projectColor: '#5B6CFF', startDate: d(-2), endDate: d(8), progress: 80, status: 'review', priority: 'low' },
    { id: 't6', title: '배포 자동화 파이프라인', kind: 'milestone', projectId: 'p2', projectColor: '#34B27D', startDate: d(14), endDate: d(14), progress: 0, status: 'todo', priority: 'high' },
  ],
  dependencies: [
    { id: 'd1', predecessorId: 't1', successorId: 't4', type: 'FS', lagDays: 2 },
  ],
};

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

const mockComments = (parentId: string, kind: 't' | 'i'): Comment[] => [
  {
    id: `${kind}-${parentId}-c1`,
    body: kind === 't' ? '진행 상황 공유 부탁드립니다.' : '재현 절차 추가했습니다. 확인 부탁드려요.',
    author: { id: 'u1', name: '김민수' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: `${kind}-${parentId}-c2`,
    body: kind === 't' ? '오늘 안에 PR 올릴 예정입니다.' : '로그 분석 완료, 백엔드 라우팅 이슈로 보입니다.',
    author: { id: 'u2', name: '이서연' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

const mockNewComment = (input: CommentCreate): Comment => ({
  id: newId('cmt'),
  body: input.body,
  author: { id: 'me', name: '나' },
  createdAt: nowIso(),
});

export const extendedApi = {
  /* Issues mutations ------------------------------------------------------ */
  createIssue: async (input: IssueCreate): Promise<Issue> =>
    USE_MOCK
      ? (await sleep(),
        {
          id: newId('ISS'),
          title: input.title,
          proj: input.projectId,
          assignee: input.assigneeId ?? '',
          reporter: '',
          projColor: '#3B82F6',
          status: 'open',
          sev: input.sev,
          prio: input.prio,
          tags: input.tags ?? [],
          created: nowIso(),
          sla: input.sla ?? '24h',
          slaPct: 100,
          comments: 0,
          linked: 0,
        } as Issue)
      : parsed(http.post('issues', { json: input }).json(), IssueSchema),

  transitionIssue: async (id: string, input: IssueTransition): Promise<Issue> =>
    USE_MOCK
      ? (await sleep(), { id, status: input.status } as Issue)
      : parsed(http.post(`issues/${id}/transition`, { json: input }).json(), IssueSchema),

  /* Tasks deletion (complement to existing update) ----------------------- */
  deleteTask: async (id: string): Promise<{ id: string; deleted: true }> =>
    USE_MOCK
      ? (await sleep(), { id, deleted: true })
      : http.delete(`tasks/${id}`).json<{ id: string; deleted: true }>(),

  /* Approvals ------------------------------------------------------------- */
  listApprovals: async (filters?: { status?: string }): Promise<Approval[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(
          http.get('approvals', { searchParams: (filters ?? {}) as Record<string, string> }).json(),
          z.array(ApprovalSchema),
        ),

  createApproval: async (input: ApprovalCreate): Promise<Approval> =>
    USE_MOCK
      ? (await sleep(),
        {
          id: newId('AP'),
          ...input,
          requester: 'me',
          status: 'pending',
          createdAt: nowIso(),
        } as Approval)
      : parsed(http.post('approvals', { json: input }).json(), ApprovalSchema),

  decideApproval: async (id: string, input: ApprovalDecision): Promise<Approval> =>
    USE_MOCK
      ? (await sleep(),
        {
          id,
          title: '',
          requester: '',
          approver: '',
          status: input.decision,
          decidedAt: nowIso(),
          createdAt: nowIso(),
        } as Approval)
      : parsed(http.post(`approvals/${id}/decision`, { json: input }).json(), ApprovalSchema),

  /* Clients (CRM) --------------------------------------------------------- */
  listClients: async (): Promise<Client[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(http.get('clients').json(), z.array(ClientSchema)),

  createClient: async (input: ClientCreate): Promise<Client> =>
    USE_MOCK
      ? (await sleep(), { id: newId('CLI'), ...input, createdAt: nowIso() } as Client)
      : parsed(http.post('clients', { json: input }).json(), ClientSchema),

  /* Schedule events ------------------------------------------------------- */
  listEvents: async (filters?: { from?: string; to?: string }): Promise<Event[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(
          http.get('events', { searchParams: (filters ?? {}) as Record<string, string> }).json(),
          z.array(EventSchema),
        ),

  createEvent: async (input: EventCreate): Promise<Event> =>
    USE_MOCK
      ? (await sleep(), { id: newId('EVT'), source: 'internal', ...input } as Event)
      : parsed(http.post('events', { json: input }).json(), EventSchema),

  /* Resources ------------------------------------------------------------- */
  listResources: async (): Promise<Resource[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(http.get('resources').json(), z.array(ResourceSchema)),

  bookResource: async (input: ResourceBooking): Promise<ResourceBooking> =>
    USE_MOCK
      ? (await sleep(), input)
      : http.post('resources/book', { json: input }).json<ResourceBooking>(),

  /* Documents (TipTap) ---------------------------------------------------- */
  listDocs: async (): Promise<Doc[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(http.get('docs').json(), z.array(DocSchema)),

  createDoc: async (input: DocCreate): Promise<Doc> =>
    USE_MOCK
      ? (await sleep(),
        { id: newId('DOC'), title: input.title, ownerId: 'me', updatedAt: nowIso() } as Doc)
      : parsed(http.post('docs', { json: input }).json(), DocSchema),

  /* Chat ------------------------------------------------------------------ */
  listChannels: async (): Promise<Channel[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(http.get('channels').json(), z.array(ChannelSchema)),

  sendMessage: async (input: MessageSend): Promise<{ id: string }> =>
    USE_MOCK
      ? (await sleep(), { id: newId('MSG') })
      : http.post(`channels/${input.channelId}/messages`, { json: { text: input.text } })
          .json<{ id: string }>(),

  /* Org / RBAC ------------------------------------------------------------ */
  listOrgUnits: async (): Promise<OrgUnit[]> =>
    USE_MOCK
      ? (await sleep(), [])
      : parsed(http.get('org/units').json(), z.array(OrgUnitSchema)),

  inviteUser: async (input: InviteUser): Promise<{ id: string; pending: true }> =>
    USE_MOCK
      ? (await sleep(), { id: newId('INV'), pending: true })
      : http.post('org/invitations', { json: input }).json<{ id: string; pending: true }>(),

  revokeToken: async (input: RevokeToken): Promise<{ id: string; revoked: true }> =>
    USE_MOCK
      ? (await sleep(), { id: input.tokenId, revoked: true })
      : http.post('auth/tokens/revoke', { json: input }).json<{ id: string; revoked: true }>(),

  /* Notifications mutations ---------------------------------------------- */
  markNotificationRead: async (id: string): Promise<{ id: string; read: true }> =>
    USE_MOCK
      ? (await sleep(), { id, read: true })
      : http.post(`notifications/${id}/read`).json<{ id: string; read: true }>(),

  bulkMarkRead: async (input: BulkMarkRead): Promise<{ count: number }> =>
    USE_MOCK
      ? (await sleep(), { count: input.ids.length })
      : http.post('notifications/read-all', { json: input }).json<{ count: number }>(),

  /* Profile --------------------------------------------------------------- */
  updateProfile: async (input: ProfilePatch): Promise<User> =>
    USE_MOCK
      ? (await sleep(), { id: 'me', name: '', role: '', dept: '', initials: '', color: '', ...input } as User)
      : parsed(http.patch('users/me', { json: input }).json(), UserSchema),

  /* Comments (tasks · issues) ------------------------------------------- */
  listTaskComments: async (taskId: string): Promise<Comment[]> =>
    USE_MOCK
      ? (await sleep(), mockComments(taskId, 't'))
      : parsed(http.get(`tasks/${taskId}/comments`).json(), z.array(CommentSchema)),

  createTaskComment: async (taskId: string, input: CommentCreate): Promise<Comment> =>
    USE_MOCK
      ? (await sleep(), mockNewComment(input))
      : parsed(http.post(`tasks/${taskId}/comments`, { json: input }).json(), CommentSchema),

  listIssueComments: async (issueId: string): Promise<Comment[]> =>
    USE_MOCK
      ? (await sleep(), mockComments(issueId, 'i'))
      : parsed(http.get(`issues/${issueId}/comments`).json(), z.array(CommentSchema)),

  createIssueComment: async (issueId: string, input: CommentCreate): Promise<Comment> =>
    USE_MOCK
      ? (await sleep(), mockNewComment(input))
      : parsed(http.post(`issues/${issueId}/comments`, { json: input }).json(), CommentSchema),

  /* Reports send --------------------------------------------------------- */
  sendReport: async (
    reportId: string,
    input: { recipients: string[] },
  ): Promise<{ queued: number; recipients: string[] }> =>
    USE_MOCK
      ? (await sleep(600), { queued: input.recipients.length, recipients: input.recipients })
      : http
          .post(`reports/${reportId}/send`, { json: input })
          .json<{ queued: number; recipients: string[] }>(),

  /* Gantt ----------------------------------------------------------------- */
  getGantt: async (params?: {
    projectId?: string;
    assigneeId?: string;
    from?: string;
    to?: string;
  }): Promise<GanttResponse> => {
    if (USE_MOCK) {
      await sleep();
      return MOCK_GANTT_RESPONSE;
    }
    return http
      .get('gantt', { searchParams: params as Record<string, string> })
      .json<GanttResponse>();
  },

  /* LLM Connections (admin) --------------------------------------------- */
  listLlmConnections: async (): Promise<LlmConnection[]> => {
    if (USE_MOCK) {
      await sleep();
      return MOCK_LLM_CONNECTIONS;
    }
    return http.get('llm-connections').json<LlmConnection[]>();
  },

  createLlmConnection: async (input: LlmConnectionInput): Promise<LlmConnection> => {
    if (USE_MOCK) {
      await sleep();
      const created: LlmConnection = {
        id: newId('llm'),
        name: input.name,
        kind: input.kind,
        baseUrl: input.baseUrl,
        model: input.model,
        hasApiKey: !!input.apiKey,
        isActive: false,
        isDefault: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      MOCK_LLM_CONNECTIONS.push(created);
      return created;
    }
    return http.post('llm-connections', { json: input }).json<LlmConnection>();
  },

  updateLlmConnection: async (
    id: string,
    input: Partial<LlmConnectionInput>,
  ): Promise<LlmConnection> => {
    if (USE_MOCK) {
      await sleep();
      const idx = MOCK_LLM_CONNECTIONS.findIndex((c) => c.id === id);
      if (idx >= 0) {
        MOCK_LLM_CONNECTIONS[idx] = {
          ...(MOCK_LLM_CONNECTIONS[idx] as LlmConnection),
          ...input,
          updatedAt: nowIso(),
        };
        return MOCK_LLM_CONNECTIONS[idx] as LlmConnection;
      }
      throw new Error('not found');
    }
    return http.patch(`llm-connections/${id}`, { json: input }).json<LlmConnection>();
  },

  deleteLlmConnection: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      await sleep();
      const idx = MOCK_LLM_CONNECTIONS.findIndex((c) => c.id === id);
      if (idx >= 0) MOCK_LLM_CONNECTIONS.splice(idx, 1);
      return;
    }
    await http.delete(`llm-connections/${id}`);
  },

  activateLlmConnection: async (id: string): Promise<LlmConnection> => {
    if (USE_MOCK) {
      await sleep();
      for (const c of MOCK_LLM_CONNECTIONS) c.isActive = c.id === id;
      return MOCK_LLM_CONNECTIONS.find((c) => c.id === id) as LlmConnection;
    }
    return http.post(`llm-connections/${id}/activate`).json<LlmConnection>();
  },

  testLlmConnection: async (
    id: string,
  ): Promise<{ ok: boolean; latencyMs: number; detail?: string }> => {
    if (USE_MOCK) {
      await sleep(400);
      return { ok: true, latencyMs: 87 };
    }
    return http
      .post(`llm-connections/${id}/test`)
      .json<{ ok: boolean; latencyMs: number; detail?: string }>();
  },
};

/* LLM Connection types — kept inline to avoid expanding the schemas barrel. */
export type LlmKind =
  | 'lmstudio'
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'custom_openai_compat';

export interface LlmConnection {
  id: string;
  name: string;
  kind: LlmKind;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LlmConnectionInput {
  name: string;
  kind: LlmKind;
  baseUrl: string;
  model: string;
  apiKey?: string | null;
}

const MOCK_LLM_CONNECTIONS: LlmConnection[] = [
  {
    id: 'llm-default-lmstudio',
    name: 'LMStudio (local)',
    kind: 'lmstudio',
    baseUrl: 'http://192.168.0.104:1234',
    model: 'gemma-4-e4b-it',
    hasApiKey: false,
    isActive: true,
    isDefault: true,
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
  },
];
