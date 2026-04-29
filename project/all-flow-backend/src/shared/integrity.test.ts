import { describe, expect, it } from 'vitest';
import {
  type PrismaIntegrityTx,
  softDeleteIssue,
  softDeleteProject,
  softDeleteTask,
} from './integrity.js';

interface CallLog {
  projectUpdate?: { where: { id: string }; data: { deletedAt: Date } };
  taskUpdate?: { where: unknown; data: { deletedAt: Date } };
  issueUpdate?: { where: unknown; data: { deletedAt: Date } };
  commentUpdate?: { where: unknown; data: { deletedAt: Date } };
}

function makeTx(opts: {
  taskIds?: string[];
  issueIds?: string[];
  taskCount?: number;
  issueCount?: number;
  commentCount?: number;
}): { tx: PrismaIntegrityTx; log: CallLog } {
  const log: CallLog = {};
  const tx: PrismaIntegrityTx = {
    project: {
      update: async (args: unknown) => {
        log.projectUpdate = args as CallLog['projectUpdate'];
        return {};
      },
    },
    task: {
      findMany: async () => (opts.taskIds ?? []).map((id) => ({ id })),
      updateMany: async (args: unknown) => {
        log.taskUpdate = args as CallLog['taskUpdate'];
        return { count: opts.taskCount ?? opts.taskIds?.length ?? 0 };
      },
    },
    issue: {
      findMany: async () => (opts.issueIds ?? []).map((id) => ({ id })),
      updateMany: async (args: unknown) => {
        log.issueUpdate = args as CallLog['issueUpdate'];
        return { count: opts.issueCount ?? opts.issueIds?.length ?? 0 };
      },
    },
    comment: {
      updateMany: async (args: unknown) => {
        log.commentUpdate = args as CallLog['commentUpdate'];
        return { count: opts.commentCount ?? 0 };
      },
    },
  };
  return { tx, log };
}

describe('shared/integrity', () => {
  it('softDeleteProject → 프로젝트/태스크/이슈/코멘트 모두 같은 deletedAt 으로 soft-delete', async () => {
    const { tx, log } = makeTx({
      taskIds: ['t1', 't2'],
      issueIds: ['i1'],
      commentCount: 5,
    });
    const r = await softDeleteProject(tx, 'p1');

    expect(r.projectId).toBe('p1');
    expect(r.taskCount).toBe(2);
    expect(r.issueCount).toBe(1);
    expect(r.commentCount).toBe(5);

    expect(log.projectUpdate?.where.id).toBe('p1');
    expect(log.taskUpdate?.data.deletedAt).toEqual(r.deletedAt);
    expect(log.issueUpdate?.data.deletedAt).toEqual(r.deletedAt);
    expect(log.commentUpdate?.data.deletedAt).toEqual(r.deletedAt);
  });

  it('softDeleteProject → 자식 없으면 comment.updateMany 호출 안 됨', async () => {
    const { tx, log } = makeTx({ taskIds: [], issueIds: [] });
    const r = await softDeleteProject(tx, 'p-empty');
    expect(r.taskCount).toBe(0);
    expect(r.issueCount).toBe(0);
    expect(r.commentCount).toBe(0);
    expect(log.commentUpdate).toBeUndefined();
  });

  it('softDeleteTask → 태스크 + 코멘트 cascade', async () => {
    let taskUpdateCalled = false;
    let commentUpdateArg: unknown = null;
    const tx = {
      task: {
        findMany: async () => [],
        updateMany: async () => {
          taskUpdateCalled = true;
          return { count: 1 };
        },
      },
      comment: {
        updateMany: async (args: unknown) => {
          commentUpdateArg = args;
          return { count: 3 };
        },
      },
    };
    const r = await softDeleteTask(tx, 't1');
    expect(taskUpdateCalled).toBe(true);
    expect(r.commentCount).toBe(3);
    expect((commentUpdateArg as { where: { taskId: string } }).where.taskId).toBe('t1');
  });

  it('softDeleteIssue → 이슈 + 코멘트 cascade', async () => {
    let issueUpdateCalled = false;
    let commentUpdateArg: unknown = null;
    const tx = {
      issue: {
        findMany: async () => [],
        updateMany: async () => {
          issueUpdateCalled = true;
          return { count: 1 };
        },
      },
      comment: {
        updateMany: async (args: unknown) => {
          commentUpdateArg = args;
          return { count: 2 };
        },
      },
    };
    const r = await softDeleteIssue(tx, 'i1');
    expect(issueUpdateCalled).toBe(true);
    expect(r.commentCount).toBe(2);
    expect((commentUpdateArg as { where: { issueId: string } }).where.issueId).toBe('i1');
  });

  it('invariant: 모든 soft-delete 결과의 deletedAt 이 호출 시점 이후', async () => {
    const before = new Date();
    const { tx } = makeTx({ taskIds: ['t1'], issueIds: ['i1'], commentCount: 1 });
    const r = await softDeleteProject(tx, 'p1');
    expect(r.deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
