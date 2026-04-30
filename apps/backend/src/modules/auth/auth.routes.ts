import { ValidationError } from '@all-flow/shared/errors';
/**
 * auth 모듈 — 토큰 라이프사이클.
 *
 * 라우트:
 *   POST /auth/tokens/revoke
 *
 * 현재 구현(BE-N8):
 *  - 입력 검증 + 인증 후 audit 로그(`auth.token.revoke`) 기록 → 200.
 *  - 실제 토큰 블록리스트 영속화는 follow-up (Prisma RevokedToken 모델 + auth 플러그인 검사).
 *  - 컨트랙트(openapi)와 FE 와이어링은 본 stub 단계에서 정합 — 영속화는 도메인 후속 작업.
 *
 * 멱등: 이미 revoke 된 tokenId 라도 200 (블록리스트 도입 후 동일 시맨틱 유지).
 */
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { getEnv } from '../../config/env.js';

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

    app.log.info(
      {
        action: 'auth.token.revoke',
        actorId: userId,
        tokenId,
        ...(reason ? { reason } : {}),
      },
      'auth token revoke',
    );

    return { revoked: true, tokenId };
  });
}
