/**
 * Extended API surface — endpoints introduced in PDCA-01.
 *
 * Covers: issues mutations, approvals, CRM clients, schedule events,
 * resources, docs, chat channels/messages, org/RBAC, profile,
 * notifications mutations, gantt, LLM connections.
 */
import { z } from 'zod';
import { http, parsed } from './http';
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

export interface SessionItem {
  id: string;
  jti: string;
  device: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

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

export const extendedApi = {
  /* Issues mutations ------------------------------------------------------ */
  createIssue: async (input: IssueCreate): Promise<Issue> =>
    parsed(http.post('issues', { json: input }).json(), IssueSchema),

  transitionIssue: async (id: string, input: IssueTransition): Promise<Issue> =>
    parsed(http.post(`issues/${id}/transition`, { json: input }).json(), IssueSchema),

  deleteIssue: async (id: string): Promise<void> => {
    await http.delete(`issues/${id}`);
  },

  updateIssue: async (id: string, patch: { title?: string; sev?: string; prio?: string; assigneeId?: string }): Promise<Issue> =>
    parsed(http.patch(`issues/${id}`, { json: patch }).json(), IssueSchema),

  /* Tasks deletion (complement to existing update) ----------------------- */
  deleteTask: async (id: string): Promise<{ id: string; deleted: true }> =>
    http.delete(`tasks/${id}`).json<{ id: string; deleted: true }>(),

  /* Approvals ------------------------------------------------------------- */
  listApprovals: async (filters?: { status?: string }): Promise<Approval[]> =>
    parsed(
      http.get('approvals', { searchParams: (filters ?? {}) as Record<string, string> }).json(),
      z.array(ApprovalSchema),
    ),

  createApproval: async (input: ApprovalCreate): Promise<Approval> =>
    parsed(http.post('approvals', { json: input }).json(), ApprovalSchema),

  decideApproval: async (id: string, input: ApprovalDecision): Promise<Approval> =>
    parsed(http.post(`approvals/${id}/decision`, { json: input }).json(), ApprovalSchema),

  deleteApproval: async (id: string): Promise<void> => {
    await http.delete(`approvals/${id}`);
  },

  updateApproval: async (id: string, patch: { title?: string; amount?: number; reason?: string }): Promise<Approval> =>
    parsed(http.patch(`approvals/${id}`, { json: patch }).json(), ApprovalSchema),

  /* Clients (CRM) --------------------------------------------------------- */
  listClients: async (): Promise<Client[]> =>
    parsed(http.get('clients').json(), z.array(ClientSchema)),

  createClient: async (input: ClientCreate): Promise<Client> =>
    parsed(http.post('clients', { json: input }).json(), ClientSchema),

  deleteClient: async (id: string): Promise<void> => {
    await http.delete(`clients/${id}`);
  },

  updateClient: async (id: string, patch: { name?: string; contact?: string; email?: string; phone?: string; industry?: string }): Promise<Client> =>
    parsed(http.patch(`clients/${id}`, { json: patch }).json(), ClientSchema),

  listClientActivities: async (clientId: string) =>
    parsed(
      http.get(`clients/${clientId}/activities`).json(),
      z.array(z.object({
        id: z.string(),
        clientId: z.string(),
        authorId: z.string(),
        kind: z.enum(['note', 'call', 'meeting', 'email']),
        text: z.string(),
        createdAt: z.string(),
        author: z.object({ id: z.string(), name: z.string() }),
      })),
    ),

  createClientActivity: async (clientId: string, input: { kind: 'note' | 'call' | 'meeting' | 'email'; text: string }) =>
    parsed(
      http.post(`clients/${clientId}/activities`, { json: input }).json(),
      z.object({
        id: z.string(),
        clientId: z.string(),
        authorId: z.string(),
        kind: z.enum(['note', 'call', 'meeting', 'email']),
        text: z.string(),
        createdAt: z.string(),
        author: z.object({ id: z.string(), name: z.string() }),
      }),
    ),

  /* Schedule events ------------------------------------------------------- */
  listEvents: async (filters?: { from?: string; to?: string }): Promise<Event[]> =>
    parsed(
      http.get('events', { searchParams: (filters ?? {}) as Record<string, string> }).json(),
      z.array(EventSchema),
    ),

  createEvent: async (input: EventCreate): Promise<Event> =>
    parsed(http.post('events', { json: input }).json(), EventSchema),

  deleteEvent: async (id: string): Promise<void> => {
    await http.delete(`events/${id}`);
  },

  updateEvent: async (id: string, patch: { title?: string; start?: string; end?: string; location?: string }): Promise<Event> =>
    parsed(http.patch(`events/${id}`, { json: patch }).json(), EventSchema),

  /* Resources ------------------------------------------------------------- */
  listResources: async (): Promise<Resource[]> =>
    parsed(http.get('resources').json(), z.array(ResourceSchema)),

  listBookings: async (date?: string): Promise<ResourceBooking[]> =>
    http.get('resources/bookings', { searchParams: date ? { date } : {} }).json<ResourceBooking[]>(),

  bookResource: async (input: ResourceBooking): Promise<ResourceBooking> =>
    http.post('resources/book', { json: input }).json<ResourceBooking>(),

  cancelBooking: async (id: string): Promise<void> => {
    await http.delete(`resources/bookings/${id}`);
  },

  updateBooking: async (
    id: string,
    patch: { start?: string; end?: string },
  ): Promise<ResourceBooking> =>
    http.patch(`resources/bookings/${id}`, { json: patch }).json<ResourceBooking>(),

  /* Documents (TipTap) ---------------------------------------------------- */
  listDocs: async (): Promise<Doc[]> =>
    parsed(http.get('docs').json(), z.array(DocSchema)),

  createDoc: async (input: DocCreate): Promise<Doc> =>
    parsed(http.post('docs', { json: input }).json(), DocSchema),

  updateDoc: async (id: string, patch: { title?: string; content?: string }): Promise<Doc> =>
    parsed(http.patch(`docs/${id}`, { json: patch }).json(), DocSchema),

  deleteDoc: async (id: string): Promise<void> => {
    await http.delete(`docs/${id}`);
  },

  /* Chat ------------------------------------------------------------------ */
  listChannels: async (): Promise<Channel[]> =>
    parsed(http.get('channels').json(), z.array(ChannelSchema)),

  createChannel: async (input: { name: string; kind: 'public' | 'private' | 'dm' }): Promise<Channel> =>
    parsed(http.post('channels', { json: input }).json(), ChannelSchema),

  sendMessage: async (input: MessageSend): Promise<{ id: string }> =>
    http.post(`channels/${input.channelId}/messages`, { json: { text: input.text } })
      .json<{ id: string }>(),

  listPins: async (channelId: string): Promise<PinnedMessageItem[]> =>
    http.get(`channels/${channelId}/pins`).json<PinnedMessageItem[]>(),

  pinMessage: async (channelId: string, msgId: string): Promise<{ id: string }> =>
    http.post(`channels/${channelId}/messages/${msgId}/pin`).json<{ id: string }>(),

  unpinMessage: async (channelId: string, msgId: string): Promise<void> => {
    await http.delete(`channels/${channelId}/messages/${msgId}/pin`);
  },

  /* Org / RBAC ------------------------------------------------------------ */
  listOrgUnits: async (): Promise<OrgUnit[]> =>
    parsed(http.get('org/units').json(), z.array(OrgUnitSchema)),

  inviteUser: async (input: InviteUser): Promise<{ id: string; pending: true }> =>
    http.post('org/invitations', { json: input }).json<{ id: string; pending: true }>(),

  createOrgUnit: async (input: { name: string; parentId?: string | null }): Promise<OrgUnit> =>
    parsed(http.post('org/units', { json: input }).json(), OrgUnitSchema),

  updateOrgUnit: async (id: string, patch: { name?: string; parentId?: string | null }): Promise<OrgUnit> =>
    parsed(http.patch(`org/units/${id}`, { json: patch }).json(), OrgUnitSchema),

  deleteOrgUnit: async (id: string): Promise<void> => {
    await http.delete(`org/units/${id}`);
  },

  addProjectMember: async (projectId: string, userId: string): Promise<{ projectId: string; userId: string; role: string }> =>
    http.post(`projects/${projectId}/members`, { json: { userId } }).json<{ projectId: string; userId: string; role: string }>(),

  removeProjectMember: async (projectId: string, userId: string): Promise<void> => {
    await http.delete(`projects/${projectId}/members/${userId}`);
  },

  revokeToken: async (input: RevokeToken): Promise<{ id: string; revoked: true }> =>
    http.post('auth/tokens/revoke', { json: input }).json<{ id: string; revoked: true }>(),

  /* Sessions (활성 세션 관리) -------------------------------------------- */
  listSessions: async (): Promise<{ items: SessionItem[] }> =>
    http.get('auth/sessions').json<{ items: SessionItem[] }>(),

  revokeSession: async (id: string): Promise<{ revoked: true; id: string }> => {
    return http.delete(`auth/sessions/${id}`).json<{ revoked: true; id: string }>();
  },

  revokeAllOtherSessions: async (): Promise<{ revoked: number }> => {
    return http.delete('auth/sessions').json<{ revoked: number }>();
  },

  /* Notifications mutations ---------------------------------------------- */
  markNotificationRead: async (id: string): Promise<{ id: string; read: true }> =>
    http.post(`notifications/${id}/read`).json<{ id: string; read: true }>(),

  bulkMarkRead: async (input: BulkMarkRead): Promise<{ count: number }> =>
    http.post('notifications/read-all', { json: input }).json<{ count: number }>(),

  /* Users metrics --------------------------------------------------------- */
  getUserMetrics: async (): Promise<{ total: number; pendingInvites: number }> =>
    http.get('users/metrics').json<{ total: number; pendingInvites: number }>(),

  /* Profile --------------------------------------------------------------- */
  updateProfile: async (input: ProfilePatch): Promise<User> =>
    parsed(http.patch('users/me', { json: input }).json(), UserSchema),

  /** Alias of updateProfile mapped to /identity/profile (FE 스펙 호환). */
  updateIdentityProfile: async (input: ProfilePatch): Promise<User> =>
    parsed(http.patch('identity/profile', { json: input }).json(), UserSchema),

  deleteAccount: async (): Promise<void> => {
    await http.delete('users/me');
  },

  /** Admin: 사용자 role 또는 status(active|inactive) 변경. */
  updateUser: async (
    id: string,
    patch: { role?: string; status?: 'active' | 'inactive' },
  ): Promise<User> => parsed(http.patch(`users/${id}`, { json: patch }).json(), UserSchema),

  /* Notification settings (per-user, single row) ------------------------ */
  getNotificationSettings: async (): Promise<{
    channels: Record<string, boolean>;
    types: Record<string, boolean>;
    digestHour: number;
  }> => http.get('identity/notification-settings').json(),

  updateNotificationSettings: async (input: {
    channels?: Record<string, boolean>;
    types?: Record<string, boolean>;
    digestHour?: number;
  }): Promise<{
    channels: Record<string, boolean>;
    types: Record<string, boolean>;
    digestHour: number;
  }> => http.patch('identity/notification-settings', { json: input }).json(),

  /* Personal API tokens -------------------------------------------------- */
  listApiTokens: async (): Promise<
    Array<{
      id: string;
      name: string;
      prefix: string;
      scopes: string[];
      lastUsedAt: string | null;
      expiresAt: string | null;
      createdAt: string;
    }>
  > => http.get('identity/api-tokens').json(),

  createApiToken: async (input: {
    name: string;
    scopes: Array<'read' | 'write' | 'admin'>;
    expiresInDays?: number;
  }): Promise<{
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    expiresAt: string | null;
    createdAt: string;
    /** Plain-text token, returned ONCE. */
    token: string;
  }> => http.post('identity/api-tokens', { json: input }).json(),

  revokeApiToken: async (id: string): Promise<void> => {
    await http.delete(`identity/api-tokens/${id}`);
  },

  /* OTel runtime config -------------------------------------------------- */
  getOtelConfig: async (): Promise<{
    enabled: boolean;
    endpoint: string | null;
    serviceName: string;
  }> => http.get('otel/config').json(),

  updateOtelConfig: async (input: {
    enabled?: boolean;
    endpoint?: string | null;
    serviceName?: string;
  }): Promise<{
    enabled: boolean;
    endpoint: string | null;
    serviceName: string;
    note?: string;
  }> => http.patch('otel/config', { json: input }).json(),

  /* Notion sync + status ------------------------------------------------- */
  getNotionStatus: async (): Promise<{
    connected: boolean;
    connectionCount: number;
    lastWorkspaceName: string | null;
    lastSyncedAt: string | null;
  }> => http.get('integrations/notion/status').json(),

  syncNotion: async (): Promise<{
    synced: number;
    syncedAt?: string;
    message?: string;
  }> => http.post('integrations/notion/sync').json(),

  /* Org invitations ------------------------------------------------------ */
  cancelInvitation: async (id: string): Promise<void> => {
    await http.delete(`org/invitations/${id}`);
  },

  /** Admin destructive: workspace 전체 삭제 (orgUnits + invitations). */
  deleteWorkspace: async (confirm: 'DELETE'): Promise<void> => {
    await http.delete('org/workspace', { json: { confirm } });
  },

  /* Comments (tasks · issues) ------------------------------------------- */
  listTaskComments: async (taskId: string): Promise<Comment[]> =>
    parsed(http.get(`tasks/${taskId}/comments`).json(), z.array(CommentSchema)),

  createTaskComment: async (taskId: string, input: CommentCreate): Promise<Comment> =>
    parsed(http.post(`tasks/${taskId}/comments`, { json: input }).json(), CommentSchema),

  listIssueComments: async (issueId: string): Promise<Comment[]> =>
    parsed(http.get(`issues/${issueId}/comments`).json(), z.array(CommentSchema)),

  createIssueComment: async (issueId: string, input: CommentCreate): Promise<Comment> =>
    parsed(http.post(`issues/${issueId}/comments`, { json: input }).json(), CommentSchema),

  /* Reports ------------------------------------------------------------- */
  listReports: async (): Promise<ReportSummary[]> =>
    http.get('reports').json<ReportSummary[]>(),

  getReport: async (id: string): Promise<ReportSummary> =>
    http.get(`reports/${id}`).json<ReportSummary>(),

  sendReport: async (
    reportId: string,
    input: { recipients: string[] },
  ): Promise<{ queued: number; recipients: string[] }> =>
    http
      .post(`reports/${reportId}/send`, { json: input })
      .json<{ queued: number; recipients: string[] }>(),

  updateReport: async (
    reportId: string,
    input: { tldr?: string; kpis?: unknown[]; sections?: unknown[] },
  ): Promise<ReportSummary> =>
    http.patch(`reports/${reportId}`, { json: input }).json<ReportSummary>(),

  /* Gantt ----------------------------------------------------------------- */
  getGantt: async (params?: {
    projectId?: string;
    assigneeId?: string;
    from?: string;
    to?: string;
  }): Promise<GanttResponse> =>
    http
      .get('gantt', { searchParams: params as Record<string, string> })
      .json<GanttResponse>(),

  getGanttByAssignee: async (): Promise<GanttResponse> =>
    http.get('gantt/by-assignee').json<GanttResponse>(),

  /* Task dependencies ----------------------------------------------------- */
  listTaskDependencies: async (taskId: string): Promise<GanttDependency[]> =>
    http.get(`tasks/${taskId}/dependencies`).json<GanttDependency[]>(),

  createTaskDependency: async (
    taskId: string,
    input: { predecessorId: string; type: GanttDependency['type']; lagDays?: number },
  ): Promise<GanttDependency> =>
    http.post(`tasks/${taskId}/dependencies`, { json: input }).json<GanttDependency>(),

  deleteTaskDependency: async (taskId: string, depId: string): Promise<void> => {
    await http.delete(`tasks/${taskId}/dependencies/${depId}`);
  },

  /* MCP Connections (admin) ---------------------------------------------- */
  listMcpConnections: async (): Promise<McpConnection[]> =>
    http.get('ai/mcp-connections').json<McpConnection[]>(),

  createMcpConnection: async (input: McpConnectionInput): Promise<McpConnection> =>
    http.post('ai/mcp-connections', { json: input }).json<McpConnection>(),

  updateMcpConnection: async (id: string, isEnabled: boolean): Promise<McpConnection> =>
    http.patch(`ai/mcp-connections/${id}`, { json: { isEnabled } }).json<McpConnection>(),

  deleteMcpConnection: async (id: string): Promise<void> => {
    await http.delete(`ai/mcp-connections/${id}`);
  },

  /* LLM Connections (admin) --------------------------------------------- */
  listLlmConnections: async (): Promise<LlmConnection[]> =>
    http.get('llm-connections').json<LlmConnection[]>(),

  createLlmConnection: async (input: LlmConnectionInput): Promise<LlmConnection> =>
    http.post('llm-connections', { json: input }).json<LlmConnection>(),

  updateLlmConnection: async (
    id: string,
    input: Partial<LlmConnectionInput>,
  ): Promise<LlmConnection> =>
    http.patch(`llm-connections/${id}`, { json: input }).json<LlmConnection>(),

  deleteLlmConnection: async (id: string): Promise<void> => {
    await http.delete(`llm-connections/${id}`);
  },

  activateLlmConnection: async (id: string): Promise<LlmConnection> =>
    http.post(`llm-connections/${id}/activate`).json<LlmConnection>(),

  testLlmConnection: async (
    id: string,
  ): Promise<{ ok: boolean; latencyMs: number; detail?: string }> =>
    http
      .post(`llm-connections/${id}/test`)
      .json<{ ok: boolean; latencyMs: number; detail?: string }>(),

  /* Semantic search ------------------------------------------------------- */
  semanticSearch: async (input: SemanticSearchInput): Promise<SemanticSearchResponse> =>
    http.post('search/semantic', { json: input }).json<SemanticSearchResponse>(),

  /* Business flows -------------------------------------------------------- */
  listBusinessFlows: async (): Promise<{ flows: BusinessFlow[] }> =>
    http.get('business-flows').json<{ flows: BusinessFlow[] }>(),

  getBusinessFlow: async (id: string): Promise<BusinessFlow> =>
    http.get(`business-flows/${id}`).json<BusinessFlow>(),

  suggestBusinessFlowNext: async (
    id: string,
    input: { currentStepId: string; context?: string },
  ): Promise<BusinessFlowSuggestion> =>
    http
      .post(`business-flows/${id}/suggest`, { json: input })
      .json<BusinessFlowSuggestion>(),

  /* Business flow progress (4차 PDCA) -------------------------------------- */
  listBusinessFlowProgress: async (): Promise<{ progress: BusinessFlowProgress[] }> =>
    http.get('business-flows/progress').json<{ progress: BusinessFlowProgress[] }>(),

  getBusinessFlowProgress: async (
    id: string,
  ): Promise<BusinessFlowProgress | { flowId: string; progress: null }> =>
    http
      .get(`business-flows/${id}/progress`)
      .json<BusinessFlowProgress | { flowId: string; progress: null }>(),

  patchBusinessFlowProgress: async (
    id: string,
    input: { currentStepId: string; completedSteps?: string[] },
  ): Promise<BusinessFlowProgress> =>
    http
      .patch(`business-flows/${id}/progress`, { json: input })
      .json<BusinessFlowProgress>(),

  /* Team progress aggregate (5차 PDCA) ------------------------------------ */
  getTeamFlowProgress: async (
    flowId?: string,
  ): Promise<{ team: TeamFlowProgressEntry[] }> =>
    http
      .get('business-flows/team-progress', {
        ...(flowId ? { searchParams: { flowId } } : {}),
      })
      .json<{ team: TeamFlowProgressEntry[] }>(),
};

/* Semantic search types --------------------------------------------------- */
export interface SemanticHit {
  id: string;
  title: string;
  kind: 'task' | 'issue';
  score: number;
  projectId: string;
}

export interface SemanticSearchInput {
  query: string;
  limit?: number;
  targets?: Array<'tasks' | 'issues'>;
  projectId?: string;
}

export interface SemanticSearchResponse {
  data: SemanticHit[];
  query: string;
}

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

export interface ReportSummary {
  id: string;
  kind: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  tldr: string;
  kpis: unknown[];
  sections: unknown[];
}

/* Pinned Message types ---------------------------------------------------- */
export interface PinnedMessageItem {
  id: string;
  channelId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: string;
  pinner: { id: string; name: string };
  message: {
    id: string;
    content: string;
    authorId: string;
    createdAt: string;
    author: { id: string; name: string; initials: string; color: string };
  };
}

/* MCP Connection types ---------------------------------------------------- */
export interface McpConnection {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  isEnabled: boolean;
  createdAt: string;
}

export interface McpConnectionInput {
  name: string;
  transport: 'stdio' | 'sse';
  config: Record<string, unknown>;
  isEnabled?: boolean;
}

/* Business flow types ----------------------------------------------------- */
export interface BusinessFlowStep {
  id: string;
  label: string;
  description: string;
  screen: string;
  action: string;
  aiHint: string;
}

export interface BusinessFlow {
  id: string;
  name: string;
  description: string;
  category: 'project' | 'task' | 'approval' | 'issue' | 'report';
  steps: BusinessFlowStep[];
}

export interface BusinessFlowSuggestion {
  flowId: string;
  currentStep: BusinessFlowStep;
  nextStep: BusinessFlowStep | null;
  suggestion: string;
  adapter: string;
}

/* Business flow progress (4차 PDCA) --------------------------------------- */
export interface BusinessFlowProgress {
  flowId: string;
  currentStepId: string;
  completedSteps: string[];
  updatedAt: string;
}

/* Team flow progress (5차 PDCA) ------------------------------------------- */
export interface TeamFlowProgressEntry {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  flowId: string;
  currentStepId: string;
  completedSteps: string[];
  /** 0..1 — 완료 단계 비율 (서버 계산). */
  progressRatio: number;
  updatedAt: string;
}
