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

  createChannel: async (input: { name: string; kind: 'public' | 'private' }): Promise<Channel> =>
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

  deleteAccount: async (): Promise<void> => {
    await http.delete('users/me');
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
