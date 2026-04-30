/**
 * nav-counts 모듈 — 사이드바 배지용 집계 엔드포인트.
 *
 * GET /nav-counts — 인증 사용자의 메뉴별 카운트 일괄 반환.
 *
 * 반환 필드:
 *   - projects:      내가 멤버인 활성(done 아님) 프로젝트 수
 *   - tasks:         내 미완료 태스크 수 (assignee = me, status != done)
 *   - issues:        미해결 이슈 수 (status != resolved, 전체)
 *   - approvals:     pending 결재 수 (in-memory store)
 *   - clients:       고객사 전체 수 (in-memory store)
 *   - notifications: 읽지 않은 알림 수 (userId = me, read = false)
 */
import type { FastifyInstance } from 'fastify';
import { getPendingApprovalsCount } from '../approvals/approvals.routes.js';
import { getClientsCount } from '../clients/clients.routes.js';

export async function navCountsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/nav-counts', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const [projects, tasks, issues, notifications] = await Promise.all([
      app.prisma.projectMember.count({
        where: { userId, project: { status: { not: 'done' } } },
      }),
      app.prisma.task.count({
        where: {
          assigneeId: userId,
          status: { not: 'done' },
          deletedAt: null,
        },
      }),
      app.prisma.issue.count({
        where: { status: { not: 'resolved' } },
      }),
      app.prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return {
      projects,
      tasks,
      issues,
      approvals: getPendingApprovalsCount(),
      clients: getClientsCount(),
      notifications,
    };
  });
}
