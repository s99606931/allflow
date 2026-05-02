/**
 * Zod 스키마 — OpenAPI 스펙과 lib/types.ts 양방향 동기화 단일 소스.
 * API 응답을 런타임에 검증하고, 타입을 자동 추론합니다.
 */
import { z } from 'zod';

export const StatusKeySchema = z.enum(['todo', 'doing', 'review', 'done', 'blocked']);
export const IssueSevSchema = z.enum(['critical', 'high', 'med', 'low']);
export const IssuePrioSchema = z.enum(['P0', 'P1', 'P2', 'P3']);
export const IssueStatusSchema = z.enum(['open', 'in-progress', 'in-review', 'resolved']);
export const PrioritySchema = z.enum(['high', 'med', 'low']);

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  dept: z.string(),
  initials: z.string(),
  color: z.string(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  userStatus: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  color: z.string(),
  progress: z.number().int().min(0).max(100),
  budget: z.number().int().nullable().optional(),
  status: StatusKeySchema,
  due: z.string().nullable(),
  members: z.array(z.string()),
  tasks: z.object({ total: z.number().int(), done: z.number().int() }),
});
export const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  color: z.string().optional(),
  due: z.string().optional(),
  budget: z.number().int().min(0).optional(),
});
export const ProjectPatchSchema = ProjectCreateSchema.partial().extend({
  progress: z.number().int().min(0).max(100).optional(),
  status: StatusKeySchema.optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: StatusKeySchema,
  proj: z.string(),
  assignee: z.string(),
  due: z.string(),
  priority: PrioritySchema,
  tags: z.array(z.string()),
  parentTaskId: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
});
export const TaskCreateSchema = z.object({
  title: z.string().min(1),
  projectId: z.string(),
  assigneeId: z.string(),
  due: z.string().optional(),
  priority: PrioritySchema.optional(),
});
export const TaskPatchSchema = TaskCreateSchema.partial().extend({
  status: StatusKeySchema.optional(),
});

export const IssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  proj: z.string(),
  projColor: z.string(),
  sev: IssueSevSchema,
  prio: IssuePrioSchema,
  status: IssueStatusSchema,
  assignee: z.string(),
  reporter: z.string(),
  tags: z.array(z.string()),
  created: z.string(),
  sla: z.string(),
  slaPct: z.number().int(),
  comments: z.number().int(),
  linked: z.number().int(),
  resolved: z.boolean().optional(),
});

export const ReportSchema = z.object({
  id: z.string(),
  kind: z.enum(['weekly', 'monthly']),
  periodStart: z.string(),
  periodEnd: z.string(),
  generatedAt: z.string(),
  author: z.string().optional(),
  tldr: z.string().optional(),
  kpis: z.array(z.object({
    label: z.string(),
    value: z.string(),
    delta: z.string().optional(),
    dir: z.enum(['up', 'down', 'flat']).optional(),
  })).optional(),
  sections: z.array(z.object({
    heading: z.string(),
    body: z.string(),
    citations: z.array(z.object({
      kind: z.string(),
      id: z.string(),
      label: z.string().optional(),
    })).optional(),
  })),
});

export const ExtractedActionSchema = z.object({
  title: z.string(),
  assignee: z.string(),
  due: z.string().optional(),
  priority: PrioritySchema.optional(),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().optional(),
});

export const NotificationSchema = z.object({
  id: z.string(),
  kind: z.enum(['mention', 'sla', 'ai', 'system', 'comment']),
  title: z.string(),
  body: z.string().optional(),
  actor: z.string().optional(),
  time: z.string(),
  read: z.boolean(),
  href: z.string().optional(),
});

/* Approvals --------------------------------------------------------------- */
export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export const ApprovalSchema = z.object({
  id: z.string(),
  title: z.string(),
  requester: z.string(),
  approver: z.string(),
  status: ApprovalStatusSchema,
  amount: z.number().optional(),
  reason: z.string().optional(),
  decidedAt: z.string().optional(),
  createdAt: z.string(),
});
export const ApprovalCreateSchema = z.object({
  title: z.string().min(1),
  approver: z.string(),
  amount: z.number().optional(),
  reason: z.string().optional(),
});
export const ApprovalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

/* CRM Clients ------------------------------------------------------------- */
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  ownerId: z.string().optional(),
  createdAt: z.string(),
});
export const ClientCreateSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
});

/* Schedule Events --------------------------------------------------------- */
export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.string()),
  resourceId: z.string().optional(),
  source: z.enum(['internal', 'google', 'outlook']).default('internal'),
});
export const EventCreateSchema = z.object({
  title: z.string().min(1),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  resourceId: z.string().optional(),
});

/* Resources --------------------------------------------------------------- */
export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['room', 'equipment']),
  capacity: z.number().int().optional(),
  location: z.string().optional(),
});
export const ResourceBookingSchema = z.object({
  resourceId: z.string(),
  start: z.string(),
  end: z.string(),
  bookedBy: z.string(),
});

/* Documents (TipTap) ------------------------------------------------------ */
export const DocSchema = z.object({
  id: z.string(),
  title: z.string(),
  ownerId: z.string(),
  updatedAt: z.string(),
  preview: z.string().optional(),
});
export const DocCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
});

/* Chat -------------------------------------------------------------------- */
export const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['public', 'private', 'dm']),
  members: z.array(z.string()),
});
export const MessageSendSchema = z.object({
  channelId: z.string(),
  text: z.string().min(1),
});

/* Org / RBAC -------------------------------------------------------------- */
export const OrgUnitSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  members: z.array(z.string()),
});
export const InviteUserSchema = z.object({
  email: z.string().email(),
  orgUnitId: z.string(),
  role: z.string(),
});
export const RevokeTokenSchema = z.object({
  tokenId: z.string(),
  reason: z.string().optional(),
});

/* Notifications mutations ------------------------------------------------- */
export const BulkMarkReadSchema = z.object({
  ids: z.array(z.string()).min(1),
});

/* Profile ----------------------------------------------------------------- */
export const ProfilePatchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  dept: z.string().optional(),
  initials: z.string().optional(),
  color: z.string().optional(),
  email: z.string().email().optional(),
  bio: z.string().max(200).optional(),
  userStatus: z.string().max(40).optional(),
});

/* Comments (tasks · issues) ----------------------------------------------- */
export const CommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  author: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string(),
});
export const CommentCreateSchema = z.object({
  body: z.string().min(1).max(4000),
});

/* Issue create/transition ------------------------------------------------- */
export const IssueCreateSchema = z.object({
  title: z.string().min(1),
  projectId: z.string(),
  assigneeId: z.string().optional(),
  sev: IssueSevSchema,
  prio: IssuePrioSchema,
  sla: z.string().default('24h'),
  tags: z.array(z.string()).default([]),
});
export const IssueTransitionSchema = z.object({
  status: IssueStatusSchema,
  comment: z.string().optional(),
});

/* Realtime events (discriminated union) ------------------------------------ */
export const RealtimeEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('notification'), payload: NotificationSchema }),
  z.object({
    type: z.literal('activity'),
    payload: z.object({
      who: z.string(), what: z.string(), target: z.string(),
      verb: z.string(), time: z.string(), proj: z.string(),
      kind: z.enum(['attach', 'status', 'ai', 'doc', 'comment', 'sync']),
    }),
  }),
  z.object({
    type: z.literal('presence'),
    payload: z.object({
      userId: z.string(),
      online: z.boolean(),
      lastSeen: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('chat'),
    payload: z.object({
      channelId: z.string(),
      messageId: z.string(),
      authorId: z.string(),
      text: z.string(),
      time: z.string(),
    }),
  }),
]);

/* Health ------------------------------------------------------------------ */
export const HealthSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number().int().nonnegative(),
  version: z.string(),
});

/* Inferred types — single source of truth --------------------------------- */
export type Health = z.infer<typeof HealthSchema>;
export type StatusKey = z.infer<typeof StatusKeySchema>;
export type User = z.infer<typeof UserSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectPatch = z.infer<typeof ProjectPatchSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type TaskPatch = z.infer<typeof TaskPatchSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type IssueSev = z.infer<typeof IssueSevSchema>;
export type IssuePrio = z.infer<typeof IssuePrioSchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ExtractedAction = z.infer<typeof ExtractedActionSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type ApprovalCreate = z.infer<typeof ApprovalCreateSchema>;
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type ClientCreate = z.infer<typeof ClientCreateSchema>;
export type Event = z.infer<typeof EventSchema>;
export type EventCreate = z.infer<typeof EventCreateSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceBooking = z.infer<typeof ResourceBookingSchema>;
export type Doc = z.infer<typeof DocSchema>;
export type DocCreate = z.infer<typeof DocCreateSchema>;
export type Channel = z.infer<typeof ChannelSchema>;
export type MessageSend = z.infer<typeof MessageSendSchema>;
export type OrgUnit = z.infer<typeof OrgUnitSchema>;
export type InviteUser = z.infer<typeof InviteUserSchema>;
export type RevokeToken = z.infer<typeof RevokeTokenSchema>;
export type BulkMarkRead = z.infer<typeof BulkMarkReadSchema>;
export type ProfilePatch = z.infer<typeof ProfilePatchSchema>;
export type IssueCreate = z.infer<typeof IssueCreateSchema>;
export type IssueTransition = z.infer<typeof IssueTransitionSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type CommentCreate = z.infer<typeof CommentCreateSchema>;


export const NavCountsSchema = z.object({
  projects: z.number().int().nonnegative(),
  tasks: z.number().int().nonnegative(),
  issues: z.number().int().nonnegative(),
  approvals: z.number().int().nonnegative(),
  clients: z.number().int().nonnegative(),
  notifications: z.number().int().nonnegative(),
});
export type NavCounts = z.infer<typeof NavCountsSchema>;
