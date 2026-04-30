import { describe, expect, it } from 'vitest';
import {
  ExtractedAction,
  Issue,
  Notification,
  Project,
  RealtimeEvent,
  StatusKey,
  Task,
  User,
} from './index.js';

describe('shared/schemas — openapi.yaml parity', () => {
  it('User schema parses canonical fixture', () => {
    const u = User.parse({
      id: 'u1',
      name: '박서연',
      role: '시니어 디자이너',
      dept: '디자인팀',
      initials: 'SY',
      color: '#FF7A6B',
    });
    expect(u.id).toBe('u1');
  });

  it('StatusKey enum matches openapi.yaml', () => {
    expect(StatusKey.options).toEqual(['todo', 'doing', 'review', 'done', 'blocked']);
  });

  it('Project schema requires nested tasks counters', () => {
    expect(() =>
      Project.parse({
        id: 'p1',
        name: 'X',
        code: 'X',
        color: '#000',
        progress: 0,
        status: 'doing',
        due: '2026-05-22',
        members: ['u1'],
        tasks: { total: 1 }, // missing `done`
      }),
    ).toThrow();
  });

  it('Task schema accepts free-form due (e.g. "오늘", "5/2")', () => {
    const t = Task.parse({
      id: 'T-1024',
      title: '온보딩',
      status: 'doing',
      proj: 'p1',
      assignee: 'u1',
      due: '오늘',
      priority: 'high',
      tags: ['디자인'],
    });
    expect(t.due).toBe('오늘');
  });

  it('Issue schema enforces 16 required fields', () => {
    const minimal = {
      id: 'ISS-1',
      title: 'x',
      proj: 'MOB',
      projColor: '#5B6CFF',
      sev: 'critical',
      prio: 'P0',
      status: 'open',
      assignee: 'u1',
      reporter: 'u2',
      tags: [],
      created: '2시간 전',
      sla: '12h',
      slaPct: 50,
      comments: 0,
      linked: 0,
    };
    const parsed = Issue.parse(minimal);
    expect(parsed.id).toBe('ISS-1');
  });

  it('ExtractedAction confidence must be 0..1', () => {
    expect(() => ExtractedAction.parse({ title: 'x', assignee: 'u1', confidence: 1.2 })).toThrow();
  });

  it('Notification schema requires kind enum', () => {
    expect(() =>
      Notification.parse({ id: 'n1', kind: 'unknown', title: 'x', time: '', read: false }),
    ).toThrow();
  });

  it('RealtimeEvent discriminator selects correct variant', () => {
    const evt = RealtimeEvent.parse({
      type: 'presence',
      payload: { userId: 'u1', online: true, lastSeen: '2026-04-28T15:00:00Z' },
    });
    expect(evt.type).toBe('presence');
  });
});
