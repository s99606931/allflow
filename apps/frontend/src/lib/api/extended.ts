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

  sendMessage: async (input: MessageSend): Promise<{ id: string }> =>
    http.post(`channels/${input.channelId}/messages`, { json: { text: input.text } })
      .json<{ id: string }>(),

  /* Org / RBAC ------------------------------------------------------------ */
  listOrgUnits: async (): Promise<OrgUnit[]> =>
    parsed(http.get('org/units').json(), z.array(OrgUnitSchema)),

  inviteUser: async (input: InviteUser): Promise<{ id: string; pending: true }> =>
    http.post('org/invitations', { json: input }).json<{ id: string; pending: true }>(),

  revokeToken: async (input: RevokeToken): Promise<{ id: string; revoked: true }> =>
    http.post('auth/tokens/revoke', { json: input }).json<{ id: string; revoked: true }>(),

  /* Notifications mutations ---------------------------------------------- */
  markNotificationRead: async (id: string): Promise<{ id: string; read: true }> =>
    http.post(`notifications/${id}/read`).json<{ id: string; read: true }>(),

  bulkMarkRead: async (input: BulkMarkRead): Promise<{ count: number }> =>
    http.post('notifications/read-all', { json: input }).json<{ count: number }>(),

  /* Profile --------------------------------------------------------------- */
  updateProfile: async (input: ProfilePatch): Promise<User> =>
    parsed(http.patch('users/me', { json: input }).json(), UserSchema),

  /* Comments (tasks · issues) ------------------------------------------- */
  listTaskComments: async (taskId: string): Promise<Comment[]> =>
    parsed(http.get(`tasks/${taskId}/comments`).json(), z.array(CommentSchema)),

  createTaskComment: async (taskId: string, input: CommentCreate): Promise<Comment> =>
    parsed(http.post(`tasks/${taskId}/comments`, { json: input }).json(), CommentSchema),

  listIssueComments: async (issueId: string): Promise<Comment[]> =>
    parsed(http.get(`issues/${issueId}/comments`).json(), z.array(CommentSchema)),

  createIssueComment: async (issueId: string, input: CommentCreate): Promise<Comment> =>
    parsed(http.post(`issues/${issueId}/comments`, { json: input }).json(), CommentSchema),

  /* Reports send --------------------------------------------------------- */
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
