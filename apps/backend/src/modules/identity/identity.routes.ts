import { createHash, randomBytes } from 'node:crypto';
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
  avatarUrl: true,
  mfaEnabled: true,
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
  avatarUrl: string | null;
  mfaEnabled: boolean;
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
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  });
}

// 2 MB binary cap (base64 expansion ~33%, stored as data URL).
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

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

  // 프로필 사진 업로드 — multipart, image/* 만, 2MB 이내. base64 data URL로 인라인 저장.
  // S3 등 외부 스토리지를 도입하기 전 단순화: 트래픽 작은 프로필 이미지에 충분.
  app.post('/users/me/avatar', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const data = await req.file({ limits: { fileSize: AVATAR_MAX_BYTES } });
    if (!data) throw new ValidationError('파일이 없습니다', []);
    if (!AVATAR_ALLOWED_MIME.has(data.mimetype)) {
      throw new ValidationError('지원하지 않는 이미지 형식입니다 (jpeg/png/gif/webp)', []);
    }
    const buf = await data.toBuffer();
    if (buf.byteLength > AVATAR_MAX_BYTES) {
      throw new ValidationError('파일 크기가 2MB를 초과합니다', []);
    }
    const avatarUrl = `data:${data.mimetype};base64,${buf.toString('base64')}`;

    await app.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  });

  // PATCH /users/:id — admin: role / status (=userStatus 가 아닌 활성/비활성) 변경.
  // 본 사이클 단순 RBAC: 호출자 role 이 'admin' 또는 'PM' 일 때만 허용.
  // status: 'active' | 'inactive' — soft-delete 토글로 매핑.
  app.patch('/users/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const actorId = req.user!.id;

    const Body = z
      .object({
        role: z.string().min(1).max(60).optional(),
        status: z.enum(['active', 'inactive']).optional(),
      })
      .strict()
      .refine((d) => Object.keys(d).length > 0, {
        message: '변경할 필드를 1개 이상 전달하세요',
      });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const actor = (await app.prisma.user.findFirst({
      where: { id: actorId, deletedAt: null },
      select: { role: true },
    })) as { role: string } | null;
    if (!actor) throw new NotFoundError('User', actorId);
    if (actor.role !== 'admin' && actor.role !== 'PM') {
      throw new ValidationError('권한이 없습니다 (admin/PM 만 가능)');
    }

    const target = (await app.prisma.user.findFirst({
      where: { id },
      select: { id: true, deletedAt: true },
    })) as { id: string; deletedAt: Date | null } | null;
    if (!target) throw new NotFoundError('User', id);

    const data: Record<string, unknown> = {};
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.status === 'inactive' && target.deletedAt === null) {
      data.deletedAt = new Date();
    } else if (parsed.data.status === 'active' && target.deletedAt !== null) {
      data.deletedAt = null;
    }

    const updated = (await app.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    })) as UserRow;

    app.log.info(
      { action: 'users.patch', actorId, targetId: id, fields: Object.keys(data) },
      'user updated by admin',
    );

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

  // PATCH /identity/profile — alias of PATCH /users/me (FE 스펙 호환)
  app.patch('/identity/profile', { preHandler: [app.authenticate] }, async (req) => {
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

  // GET /identity/notification-settings — single-row per user, defaults if absent.
  app.get('/identity/notification-settings', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const row = await app.prisma.userNotificationSettings.findUnique({ where: { userId } });
    if (row) {
      return {
        channels: row.channels,
        types: row.types,
        digestHour: row.digestHour,
      };
    }
    return {
      channels: { email: true, inApp: true, desktop: false, mobile: false },
      types: { approvals: true, mentions: true, digests: false },
      digestHour: 9,
    };
  });

  // PATCH /identity/notification-settings — upsert. 부분 갱신.
  app.patch('/identity/notification-settings', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const Body = z
      .object({
        channels: z.record(z.string(), z.boolean()).optional(),
        types: z.record(z.string(), z.boolean()).optional(),
        digestHour: z.number().int().min(0).max(23).optional(),
      })
      .strict()
      .refine((d) => Object.keys(d).length > 0, { message: '변경할 필드를 1개 이상 전달하세요' });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const existing = await app.prisma.userNotificationSettings.findUnique({ where: { userId } });
    const merged = {
      channels: parsed.data.channels
        ? { ...((existing?.channels as Record<string, boolean>) ?? {}), ...parsed.data.channels }
        : ((existing?.channels as Record<string, boolean>) ?? {
            email: true,
            inApp: true,
            desktop: false,
            mobile: false,
          }),
      types: parsed.data.types
        ? { ...((existing?.types as Record<string, boolean>) ?? {}), ...parsed.data.types }
        : ((existing?.types as Record<string, boolean>) ?? {
            approvals: true,
            mentions: true,
            digests: false,
          }),
      digestHour: parsed.data.digestHour ?? existing?.digestHour ?? 9,
    };

    const row = await app.prisma.userNotificationSettings.upsert({
      where: { userId },
      create: { userId, ...merged },
      update: merged,
    });
    return {
      channels: row.channels,
      types: row.types,
      digestHour: row.digestHour,
    };
  });

  // GET /identity/api-tokens — list (해시 본문 노출 금지, prefix 만)
  app.get('/identity/api-tokens', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const rows = await app.prisma.apiToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return rows;
  });

  // POST /identity/api-tokens — issue new token (plaintext returned ONCE)
  app.post('/identity/api-tokens', { preHandler: [app.authenticate] }, async (req, reply) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const Body = z
      .object({
        name: z.string().min(1).max(80),
        scopes: z.array(z.enum(['read', 'write', 'admin'])).min(1).max(3),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      })
      .strict();
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const raw = randomBytes(24).toString('base64url');
    const token = `av_${raw}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const prefix = token.slice(0, 8);
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 86400000)
      : null;

    const row = await app.prisma.apiToken.create({
      data: {
        userId,
        name: parsed.data.name,
        tokenHash,
        prefix,
        scopes: parsed.data.scopes,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return reply.code(201).send({ ...row, token });
  });

  // DELETE /identity/api-tokens/:id — revoke (soft, revokedAt set)
  app.delete('/identity/api-tokens/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const row = await app.prisma.apiToken.findFirst({ where: { id, userId, revokedAt: null } });
    if (!row) throw new NotFoundError('ApiToken', id);
    await app.prisma.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return reply.code(204).send();
  });
}
