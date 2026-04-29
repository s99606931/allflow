/**
 * identity 모듈 — `GET /users/me`.
 *
 * 동작:
 *  1) `app.authenticate` preHandler가 JWT를 검증하고 `req.user.id`를 주입한다.
 *  2) Prisma에서 사용자 단건을 조회 → soft-delete 제외.
 *  3) frontend openapi.yaml `User` 스키마와 동일한 형태로 직렬화.
 *
 * 참고: T-103(auth) + T-101(prisma) 의존. RBAC는 적용하지 않는다 — 본인 식별만 수행.
 */
import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../shared/errors.js';
import { User as UserSchema } from '../../shared/schemas/index.js';

export async function identityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users/me', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const user = await app.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        role: true,
        dept: true,
        initials: true,
        color: true,
        email: true,
      },
    });

    if (!user) throw new NotFoundError('User', userId);

    // OpenAPI: email은 optional. null → 필드 제거.
    return UserSchema.parse({
      id: user.id,
      name: user.name,
      role: user.role,
      dept: user.dept,
      initials: user.initials,
      color: user.color,
      ...(user.email ? { email: user.email } : {}),
    });
  });
}
