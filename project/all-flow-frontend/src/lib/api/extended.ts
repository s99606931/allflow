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

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

export const extendedApi = {
  /* Issues mutations ------------------------------------------------------ */
  createIssue: async (input: IssueCreate): Promise<Issue> =>
    USE_MOCK
      ? (await sleep(),
        {
          id: newId('ISS'),
          ...input,
          projColor: '#3B82F6',
          status: 'open',
          created: nowIso(),
          sla: '24h',
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
};
