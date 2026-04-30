/**
 * identity 모듈 — `GET /users/me`, `PATCH /users/me`.
 *
 * GET 동작:
 *  1) `app.authenticate` preHandler가 JWT를 검증하고 `req.user.id`를 주입한다.
 *  2) Prisma에서 사용자 단건을 조회 → soft-delete 제외.
 *  3) frontend openapi.yaml `User` 스키마와 동일한 형태로 직렬화.
 *
 * PATCH 동작:
 *  1) 본인 식별 후 ProfilePatch 입력을 부분 적용한다.
 *  2) name/role/dept/initials/color/email 모두 optional. 빈 객체 = no-op.
 *  3) 갱신 후 GET 과 동일한 직렬화로 응답.
 *
 * 참고: T-103(auth) + T-101(prisma) 의존. RBAC는 적용하지 않는다 — 본인 식별만 수행.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { User as UserSchema } from '../../shared/schemas/index.js';

const ProfilePatch = z
  .object({
    name: z.string().min(1).max(120).optional(),
    role: z.string().min(1).max(60).optional(),
    dept: z.string().min(1).max(80).optional(),
    initials: z.string().min(1).max(8).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    email: z.string().email().optional(),
  })
  .strict();

const USER_SELECT = {
  id: true,
  name: true,
  role: true,
  dept: true,
  initials: true,
  color: true,
  email: true,
} as const;

interface UserRow {
  id: string;
  name: string;
  role: string;
  dept: string;
  initials: string;
  color: string;
  email: string | null;
}

function serializeUser(user: UserRow): unknown {
  return UserSchema.parse({
    id: user.id,
    name: user.name,
    role: user.role,
    dept: user.dept,
    initials: user.initials,
    color: user.color,
    ...(user.email ? { email: user.email } : {}),
  });
}

export async function identityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users/me', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const user = (await app.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: USER_SELECT,
    })) as UserRow | null;

    if (!user) throw new NotFoundError('User', userId);
    return serializeUser(user);
  });

  app.patch('/users/me', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const parsed = ProfilePatch.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const existing = (await app.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    })) as { id: string } | null;
    if (!existing) throw new NotFoundError('User', userId);

    const updated = (await app.prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: USER_SELECT,
    })) as UserRow;

    return serializeUser(updated);
  });
}
