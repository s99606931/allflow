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
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  color: z.string(),
  progress: z.number().int().min(0).max(100),
  status: StatusKeySchema,
  due: z.string(),
  members: z.array(z.string()),
  tasks: z.object({ total: z.number().int(), done: z.number().int() }),
});
export const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  color: z.string().optional(),
  due: z.string().optional(),
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
});
export const TaskCreateSchema = z.object({
  title: z.string().min(1),
  proj: z.string(),
  assignee: z.string(),
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

/* Inferred types — single source of truth --------------------------------- */
export type StatusKey = z.infer<typeof StatusKeySchema>;
export type User = z.infer<typeof UserSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectPatch = z.infer<typeof ProjectPatchSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type TaskPatch = z.infer<typeof TaskPatchSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type IssueSev = z.infer<typeof IssueSevSchema>;
export type IssuePrio = z.infer<typeof IssuePrioSchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ExtractedAction = z.infer<typeof ExtractedActionSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
