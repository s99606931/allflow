import { NotFoundError, ValidationError } from '@all-flow/shared/errors';
/**
 * identity 모듈 — `GET /users`, `POST /users/invite`, `GET /users/me`, `PATCH /users/me`.
 *
 * GET /users 동작:
 *  1) `app.authenticate` preHandler가 JWT를 검증한다.
 *  2) soft-delete 제외한 전체 사용자 목록을 name 오름차순으로 반환.
 *
 * POST /users/invite 동작:
 *  1) email 유효성 검증 후 중복 여부 확인.
 *  2) 이미 등록된 이메일이면 ValidationError. 아니면 초대 완료 응답 (scaffold).
 *
 * GET /users/me 동작:
 *  1) `app.authenticate` preHandler가 JWT를 검증하고 `req.user.id`를 주입한다.
 *  2) Prisma에서 사용자 단건을 조회 → soft-delete 제외.
 *  3) @all-flow/contracts `User` 스키마(packages/contracts/openapi.yaml)와 동일한 형태로 직렬화.
 *
 * PATCH /users/me 동작:
 *  1) 본인 식별 후 ProfilePatch 입력을 부분 적용한다.
 *  2) name/role/dept/initials/color/email 모두 optional. 빈 객체 = no-op.
 *  3) 갱신 후 GET 과 동일한 직렬화로 응답.
 *
 * 참고: T-103(auth) + T-101(prisma) 의존. RBAC는 적용하지 않는다 — 본인 식별만 수행.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
    bio: z.string().max(200).optional(),
    userStatus: z.string().max(40).optional(),
  })
  .strict();

const InviteBody = z
  .object({
    email: z.string().email(),
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
  bio: true,
  userStatus: true,
} as const;

interface UserRow {
  id: string;
  name: string;
  role: string;
  dept: string;
  initials: string;
  color: string;
  email: string | null;
  bio: string | null;
  userStatus: string | null;
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
    ...(user.bio ? { bio: user.bio } : {}),
    ...(user.userStatus ? { userStatus: user.userStatus } : {}),
  });
}

export async function identityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users', { preHandler: [app.authenticate] }, async () => {
    const users = (await app.prisma.user.findMany({
      where: { deletedAt: null },
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    })) as UserRow[];

    return users.map(serializeUser);
  });

  app.get('/users/metrics', { preHandler: [app.authenticate] }, async () => {
    const [total, pendingInvites] = await Promise.all([
      app.prisma.user.count({ where: { deletedAt: null } }),
      app.prisma.invitation.count({ where: { pending: true } }),
    ]);
    return { total, pendingInvites };
  });

  app.post('/users/invite', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const actorId = req.user!.id;
    const parsed = InviteBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const { email } = parsed.data;

    const existing = await app.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new ValidationError('이미 등록된 이메일입니다');

    app.log.info({ action: 'users.invite', actorId, email }, 'user invited');

    return { message: '초대 이메일을 발송했습니다.', email };
  });

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

  app.delete('/users/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('User', userId);

    await app.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        name: '탈퇴한 사용자',
        email: null,
        initials: '?',
      },
    });

    return reply.code(204).send();
  });
}
