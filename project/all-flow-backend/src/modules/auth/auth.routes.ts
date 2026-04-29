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
import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

const RevokeRequest = z
  .object({
    tokenId: z.string().min(1).max(200),
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export async function authRoutes(app: FastifyInstance): Promise<void> {
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
