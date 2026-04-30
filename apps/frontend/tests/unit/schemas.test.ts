import { describe, expect, it } from 'vitest';
import {
  StatusKeySchema, IssueSevSchema, IssuePrioSchema, IssueStatusSchema,
  UserSchema, ProjectSchema, TaskSchema, IssueSchema,
  NotificationSchema, ReportSchema, ExtractedActionSchema,
  RealtimeEventSchema,
} from '@/lib/schemas';
import { TEAM, PROJECTS } from '@/lib/fixtures';

describe('스키마 — enum', () => {
  it('StatusKey', () => {
    expect(StatusKeySchema.safeParse('todo').success).toBe(true);
    expect(StatusKeySchema.safeParse('xxx').success).toBe(false);
  });
  it('IssueSev / Prio / Status', () => {
    expect(IssueSevSchema.safeParse('critical').success).toBe(true);
    expect(IssuePrioSchema.safeParse('P0').success).toBe(true);
    expect(IssueStatusSchema.safeParse('open').success).toBe(true);
    expect(IssuePrioSchema.safeParse('P9').success).toBe(false);
  });
});

describe('스키마 — 픽스처와 일치', () => {
  it('TEAM 의 모든 멤버가 UserSchema 통과', () => {
    for (const u of TEAM) expect(UserSchema.parse(u)).toBeDefined();
  });

  it('PROJECTS 모두가 ProjectSchema 통과', () => {
    for (const p of PROJECTS) expect(ProjectSchema.parse(p)).toBeDefined();
  });
});

describe('스키마 — 에러 케이스', () => {
  it('Project — progress 범위 벗어남', () => {
    const r = ProjectSchema.safeParse({
      id: 'X', name: 'x', code: 'X', color: '#f00',
      progress: 150, status: 'todo', due: '2026-04-30',
      members: [], tasks: { total: 0, done: 0 },
    });
    expect(r.success).toBe(false);
  });

  it('Task — priority 잘못된 값', () => {
    const r = TaskSchema.safeParse({
      id: 't', title: 't', status: 'todo', proj: 'p',
      assignee: 'u', due: '2026-04-30', priority: 'urgent', tags: [],
    });
    expect(r.success).toBe(false);
  });

  it('Issue — slaPct 누락', () => {
    const r = IssueSchema.safeParse({
      id: 'I', title: 'i', proj: 'p', projColor: '#f00',
      sev: 'high', prio: 'P1', status: 'open',
      assignee: 'u', reporter: 'u', tags: [],
      created: '2026-04-28', sla: '2h',
      comments: 0, linked: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe('스키마 — Realtime discriminated union', () => {
  it.each([
    { type: 'notification', payload: { id: 'n', kind: 'mention', title: 't', time: new Date().toISOString(), read: false } },
    { type: 'activity', payload: { who: 'A', what: 'P', target: 'T', verb: 'updated', time: '2026', proj: 'P', kind: 'status' } },
    { type: 'presence', payload: { userId: 'u', online: true } },
    { type: 'chat', payload: { channelId: 'g', messageId: 'm', authorId: 'u', text: 'hi', time: '2026' } },
  ])('type=%s 파싱', evt => {
    expect(RealtimeEventSchema.safeParse(evt).success).toBe(true);
  });

  it('알 수 없는 type 거부', () => {
    expect(RealtimeEventSchema.safeParse({ type: 'unknown', payload: {} }).success).toBe(false);
  });
});

describe('스키마 — Report / ExtractedAction / Notification', () => {
  it('Report 최소 필드', () => {
    expect(ReportSchema.parse({
      id: 'r', kind: 'weekly',
      periodStart: '2026-04-22', periodEnd: '2026-04-28',
      generatedAt: new Date().toISOString(),
      sections: [{ heading: 'X', body: 'Y' }],
    })).toBeDefined();
  });

  it('ExtractedAction — confidence 범위', () => {
    expect(ExtractedActionSchema.safeParse({ title: 'x', assignee: 'u', confidence: 1.5 }).success).toBe(false);
    expect(ExtractedActionSchema.parse({ title: 'x', assignee: 'u', confidence: 0.8 })).toBeDefined();
  });

  it('Notification — kind enum', () => {
    expect(NotificationSchema.parse({
      id: 'n', kind: 'sla', title: 't', time: new Date().toISOString(), read: false,
    })).toBeDefined();
  });
});
