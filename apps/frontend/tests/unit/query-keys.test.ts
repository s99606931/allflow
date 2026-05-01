/**
 * TEST-F15 — query-keys.ts 단위 테스트.
 * key factory 반환값이 일관된 배열 형태를 갖는지 검증.
 */
import { describe, expect, it } from 'vitest';
import { keys } from '@/lib/query-keys';

describe('keys factory (TEST-F15)', () => {
  describe('all()', () => {
    it('tasks.all → ["tasks"]', () => {
      expect(keys.tasks.all()).toEqual(['tasks']);
    });

    it('projects.all → ["projects"]', () => {
      expect(keys.projects.all()).toEqual(['projects']);
    });
  });

  describe('list()', () => {
    it('tasks.list() (no filter) → ["tasks", "list"]', () => {
      expect(keys.tasks.list()).toEqual(['tasks', 'list']);
    });

    it('tasks.list({projectId}) → includes filters', () => {
      const k = keys.tasks.list({ projectId: 'p1' });
      expect(k).toEqual(['tasks', 'list', { projectId: 'p1' }]);
    });

    it('tasks.list({}) (empty filter) → treats same as no filter', () => {
      expect(keys.tasks.list({})).toEqual(['tasks', 'list']);
    });

    it('approvals.list({status:"pending"}) includes status filter', () => {
      expect(keys.approvals.list({ status: 'pending' })).toEqual(['approvals', 'list', { status: 'pending' }]);
    });
  });

  describe('detail()', () => {
    it('tasks.detail → ["tasks", "detail", id]', () => {
      expect(keys.tasks.detail('t1')).toEqual(['tasks', 'detail', 't1']);
    });

    it('projects.detail → ["projects", "detail", id]', () => {
      expect(keys.projects.detail('PRJ-1')).toEqual(['projects', 'detail', 'PRJ-1']);
    });
  });

  describe('children / nested', () => {
    it('tasks.comments → ["tasks", "detail", taskId, "comments"]', () => {
      expect(keys.tasks.comments('t1')).toEqual(['tasks', 'detail', 't1', 'comments']);
    });

    it('issues.comments → ["issues", "detail", issueId, "comments"]', () => {
      expect(keys.issues.comments('i1')).toEqual(['issues', 'detail', 'i1', 'comments']);
    });
  });

  describe('cache invalidation semantics', () => {
    it('tasks.all() is a prefix of tasks.list()', () => {
      const all = keys.tasks.all();
      const list = keys.tasks.list();
      expect(list.slice(0, all.length)).toEqual(all);
    });

    it('tasks.all() is a prefix of tasks.detail()', () => {
      const all = keys.tasks.all();
      const det = keys.tasks.detail('t1');
      expect(det.slice(0, all.length)).toEqual(all);
    });

    it('different resources produce different root keys', () => {
      expect(keys.tasks.all()).not.toEqual(keys.issues.all());
      expect(keys.projects.all()).not.toEqual(keys.users.all());
    });
  });

  describe('special keys', () => {
    it('keys.me() → ["me"]', () => {
      expect(keys.me()).toEqual(['me']);
    });

    it('keys.navCounts.get() → includes "navCounts"', () => {
      expect(keys.navCounts.get()[0]).toBe('navCounts');
    });

    it('keys.gantt.data({from}) includes filter', () => {
      const k = keys.gantt.data({ from: '2026-05-01' });
      expect(k[k.length - 1]).toEqual({ from: '2026-05-01' });
    });
  });
});
