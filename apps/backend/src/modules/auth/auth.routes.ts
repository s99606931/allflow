import { randomUUID } from 'node:crypto';
import { ValidationError } from '@all-flow/shared/errors';
/**
 * auth 모듈 — 토큰 라이프사이클 + 활성 세션 관리.
 *
 * 라우트:
 *   POST /auth/login                 (dev/staging)
 *   POST /auth/tokens/revoke         (인증)
 *   GET  /auth/sessions              (인증)
 *   DELETE /auth/sessions/:id        (인증)
 *   DELETE /auth/sessions            (인증, 다른 모든 세션)
 *
 * 구현:
 *  - 로그인 시 jti(uuid) 발급 → JWT.jti 임베드 + Session 행 생성.
 *  - 세션 종료 = jti → RevokedToken 블록리스트 + Session 삭제 (멱등).
 *  - "다른 모든 세션" = 현재 jti 제외 전체 종료.
 */
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { getEnv } from '../../config/env.js';
import { writeAuditLog } from '../audit-log/write-audit-log.js';

const RevokeRequest = z
  .object({
    tokenId: z.string().min(1).max(200),
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

const LoginRequest = z
  .object({
    email: z.string().email(),
    password: z.string().min(1).max(200).optional(),
  })
  .strict();

const SESSION_TTL_HOURS = 1; // matches JWT exp '1h'

function deviceLabel(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown device';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone')) return 'iPhone · Safari/iOS';
  if (ua.includes('ipad')) return 'iPad · Safari/iOS';
  if (ua.includes('android')) return 'Android · Mobile';
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'Mac · Browser';
  if (ua.includes('windows')) return 'Windows · Browser';
  if (ua.includes('linux')) return 'Linux · Browser';
  return 'Browser';
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // dev/staging 한정 credentials 로그인 — User 모델에 password 컬럼이 없어 email 만으로 JWT 발급.
  // 운영에서는 OIDC(Google/Kakao) 사용 권장, 본 라우트는 NODE_ENV !== 'production' 에서만 활성.
  app.post('/auth/login', async (req, reply) => {
    const env = getEnv();
    if (env.NODE_ENV === 'production') {
      reply.status(404);
      return { error: { code: 'NOT_FOUND', message: 'Not found' } };
    }
    const parsed = LoginRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { email } = parsed.data;
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      reply.status(401);
      return { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } };
    }

    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);

    const accessToken = await new SignJWT({ sub: user.id, email: user.email ?? email })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_HOURS}h`)
      .sign(new TextEncoder().encode(env.AUTH_SECRET ?? ''));

    await app.prisma.session.create({
      data: {
        userId: user.id,
        jti,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
        expiresAt,
      },
    });

    writeAuditLog(app.prisma, { action: 'auth.login.success', actorId: user.id }).catch(() => {});
    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    };
  });

  app.post('/auth/tokens/revoke', { preHandler: [app.authenticate] }, async (req) => {
    const parsed = RevokeRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { tokenId, reason } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    await app.prisma.revokedToken.upsert({
      where: { tokenId },
      create: { tokenId, userId },
      update: {},
    });

    app.log.info(
      {
        action: 'auth.token.revoke',
        actorId: userId,
        tokenId,
        ...(reason ? { reason } : {}),
      },
      'auth token revoke',
    );
    writeAuditLog(app.prisma, {
      action: 'auth.token.revoke',
      actorId: userId,
      ...(reason ? { metadata: { reason } } : {}),
    }).catch(() => {});

    return { revoked: true, tokenId };
  });

  // 활성 세션 목록 — 만료되지 않은 본인 세션만 반환.
  app.get('/auth/sessions', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const currentJti = req.tokenJti;
    const now = new Date();
    const rows = await app.prisma.session.findMany({
      where: { userId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: rows.map((s) => ({
        id: s.id,
        jti: s.jti,
        device: deviceLabel(s.userAgent ?? undefined),
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: currentJti ? s.jti === currentJti : false,
      })),
    };
  });

  // 단일 세션 종료 — jti → RevokedToken + Session row 삭제.
  app.delete<{ Params: { id: string } }>(
    '/auth/sessions/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      const session = await app.prisma.session.findUnique({ where: { id: req.params.id } });
      if (!session || session.userId !== userId) {
        reply.status(404);
        return { error: { code: 'NOT_FOUND', message: 'Session not found' } };
      }
      await app.prisma.revokedToken.upsert({
        where: { tokenId: session.jti },
        create: { tokenId: session.jti, userId },
        update: {},
      });
      await app.prisma.session.delete({ where: { id: session.id } });
      writeAuditLog(app.prisma, {
        action: 'auth.session.revoke',
        actorId: userId,
        targetType: 'session',
        targetId: session.id,
      }).catch(() => {});
      return { revoked: true, id: session.id };
    },
  );

  // 다른 모든 세션 종료 — 현재 jti 는 보존.
  app.delete('/auth/sessions', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    const currentJti = req.tokenJti;
    const where = currentJti ? { userId, jti: { not: currentJti } } : { userId };
    const targets = await app.prisma.session.findMany({ where, select: { id: true, jti: true } });
    if (targets.length === 0) return { revoked: 0 };
    await app.prisma.$transaction([
      ...targets.map((s) =>
        app.prisma.revokedToken.upsert({
          where: { tokenId: s.jti },
          create: { tokenId: s.jti, userId },
          update: {},
        }),
      ),
      app.prisma.session.deleteMany({ where: { id: { in: targets.map((s) => s.id) } } }),
    ]);
    writeAuditLog(app.prisma, {
      action: 'auth.sessions.revoke_others',
      actorId: userId,
      metadata: { count: targets.length },
    }).catch(() => {});
    return { revoked: targets.length };
  });
}
