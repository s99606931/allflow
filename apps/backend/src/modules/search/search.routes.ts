/**
 * search 모듈 — POST /search/semantic
 *
 * 요청: { query, limit?, targets?, projectId? }
 * 응답: { data: SemanticHit[], query: string }
 *
 * RBAC: app.authenticate 필수. projectId 지정 시 멤버 확인.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ForbiddenError } from '../../shared/errors.js';
import { type SemanticHit, semanticSearch } from './search.service.js';

const SearchBody = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).optional(),
  targets: z.array(z.enum(['tasks', 'issues'])).optional(),
  projectId: z.string().min(1).optional(),
});

export async function searchRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof SearchBody> }>(
    '/search/semantic',
    { preHandler: [app.authenticate] },
    async (req) => {
      const body = SearchBody.parse(req.body);
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;

      if (body.projectId) {
        const member = await app.prisma.projectMember.findFirst({
          where: { projectId: body.projectId, userId },
        });
        if (!member) throw new ForbiddenError('해당 프로젝트 멤버가 아닙니다');
      }

      const hits: SemanticHit[] = await semanticSearch(app.prisma, body);
      return { data: hits, query: body.query };
    },
  );
}
