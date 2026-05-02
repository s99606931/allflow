import { ValidationError } from '@all-flow/shared/errors';
/**
 * auth 모듈 — 토큰 라이프사이클.
 *
 * 라우트:
 *   POST /auth/tokens/revoke
 *
 * 구현:
 *  - 입력 검증 + 인증 후 RevokedToken 블록리스트에 영속화 → 200.
 *  - 멱등: 이미 revoke 된 tokenId 재시도 시 upsert 로 200 반환 (no-op).
 *  - auth 플러그인이 JWT 검증 후 blocklist 확인 → 존재 시 401.
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
    const accessToken = await new SignJWT({ sub: user.id, email: user.email ?? email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(env.AUTH_SECRET ?? ''));
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
}
