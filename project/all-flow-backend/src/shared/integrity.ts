/**
 * 프로젝트-태스크-이슈 관계 무결성 정책.
 *
 * 정의:
 *  - "삭제" 의 1차 시맨틱은 **soft-delete** (`deletedAt = now`).
 *  - 프로젝트 삭제 시: 하위 task/issue/comment 도 동일 시각으로 cascade soft-delete.
 *  - 이슈/태스크 삭제 시: 자식 comment 도 cascade soft-delete.
 *  - 하드 삭제(DB row 제거)는 운영자 전용 — Prisma onDelete: Cascade 가 보호.
 *
 * 본 모듈은 위 정책을 트랜잭션으로 일관되게 적용한다.
 *
 * 이 헬퍼는 도메인 라우트에서 직접 호출한다(라우트 자체는 후속 PR에서 노출).
 * T-206 의 핵심 기여는 정책 코드화 + 단위 테스트로 무결성 invariant 고정.
 */

interface SoftDeleteClient {
  project: {
    update: (args: { where: { id: string }; data: { deletedAt: Date } }) => Promise<unknown>;
  };
  task: {
    updateMany: (args: { where: { projectId: string }; data: { deletedAt: Date } }) => Promise<{
      count: number;
    }>;
  };
  issue: {
    updateMany: (args: { where: { projectId: string }; data: { deletedAt: Date } }) => Promise<{
      count: number;
    }>;
  };
  comment: {
    updateMany: (args: {
      where: { OR: { taskId?: { in: string[] }; issueId?: { in: string[] } }[] };
      data: { deletedAt: Date };
    }) => Promise<{ count: number }>;
  };
  task_findMany?: (args: { where: { projectId: string }; select: { id: true } }) => Promise<
    { id: string }[]
  >;
  issue_findMany?: (args: { where: { projectId: string }; select: { id: true } }) => Promise<
    { id: string }[]
  >;
}

/**
 * Prisma 트랜잭션 콜백 시그니처 — 우리가 사용하는 모델만 좁혀서 정의.
 * 호출부에서 `prisma.$transaction(async (tx) => softDeleteProject(tx, id))` 형태로 사용.
 */
export interface PrismaIntegrityTx {
  project: { update: (args: unknown) => Promise<unknown> };
  task: {
    updateMany: (args: unknown) => Promise<{ count: number }>;
    findMany: (args: unknown) => Promise<{ id: string }[]>;
  };
  issue: {
    updateMany: (args: unknown) => Promise<{ count: number }>;
    findMany: (args: unknown) => Promise<{ id: string }[]>;
  };
  comment: { updateMany: (args: unknown) => Promise<{ count: number }> };
}

export interface SoftDeleteResult {
  projectId: string;
  taskCount: number;
  issueCount: number;
  commentCount: number;
  deletedAt: Date;
}

/**
 * 프로젝트 + 모든 하위(태스크/이슈/코멘트) soft-delete.
 *
 * 시멘틱:
 *  - 모두 같은 `deletedAt` 타임스탬프를 공유 → 운영자가 일괄 복구 가능.
 *  - `updateMany` 라 cascade 가 발생하지 않으므로 명시적 코멘트 갱신 필요.
 */
export async function softDeleteProject(
  tx: PrismaIntegrityTx,
  projectId: string,
): Promise<SoftDeleteResult> {
  const now = new Date();

  const tasks = await tx.task.findMany({ where: { projectId }, select: { id: true } });
  const issues = await tx.issue.findMany({ where: { projectId }, select: { id: true } });
  const taskIds = tasks.map((t) => t.id);
  const issueIds = issues.map((i) => i.id);

  await tx.project.update({ where: { id: projectId }, data: { deletedAt: now } });
  const taskRes = await tx.task.updateMany({ where: { projectId }, data: { deletedAt: now } });
  const issueRes = await tx.issue.updateMany({ where: { projectId }, data: { deletedAt: now } });

  let commentCount = 0;
  if (taskIds.length > 0 || issueIds.length > 0) {
    const orClauses: { taskId?: { in: string[] }; issueId?: { in: string[] } }[] = [];
    if (taskIds.length > 0) orClauses.push({ taskId: { in: taskIds } });
    if (issueIds.length > 0) orClauses.push({ issueId: { in: issueIds } });
    const res = await tx.comment.updateMany({
      where: { OR: orClauses },
      data: { deletedAt: now },
    });
    commentCount = res.count;
  }

  return {
    projectId,
    taskCount: taskRes.count,
    issueCount: issueRes.count,
    commentCount,
    deletedAt: now,
  };
}

/**
 * 태스크 soft-delete + 자식 코멘트 cascade.
 */
export async function softDeleteTask(
  tx: { task: PrismaIntegrityTx['task']; comment: PrismaIntegrityTx['comment'] },
  taskId: string,
): Promise<{ taskId: string; commentCount: number; deletedAt: Date }> {
  const now = new Date();
  await tx.task.updateMany({ where: { id: taskId }, data: { deletedAt: now } });
  const res = await tx.comment.updateMany({
    where: { taskId },
    data: { deletedAt: now },
  } as unknown as Parameters<PrismaIntegrityTx['comment']['updateMany']>[0]);
  return { taskId, commentCount: res.count, deletedAt: now };
}

/**
 * 이슈 soft-delete + 자식 코멘트 cascade.
 */
export async function softDeleteIssue(
  tx: { issue: PrismaIntegrityTx['issue']; comment: PrismaIntegrityTx['comment'] },
  issueId: string,
): Promise<{ issueId: string; commentCount: number; deletedAt: Date }> {
  const now = new Date();
  await tx.issue.updateMany({ where: { id: issueId }, data: { deletedAt: now } });
  const res = await tx.comment.updateMany({
    where: { issueId },
    data: { deletedAt: now },
  } as unknown as Parameters<PrismaIntegrityTx['comment']['updateMany']>[0]);
  return { issueId, commentCount: res.count, deletedAt: now };
}

// 본 모듈은 호출부 단위테스트에 의해 검증된다 (src/shared/integrity.test.ts).
// SoftDeleteClient 인터페이스는 향후 라우트 노출 시 빠른 어댑터 작성을 위해 reserved.
export type { SoftDeleteClient };
