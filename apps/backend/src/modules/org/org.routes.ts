import { ValidationError } from '@all-flow/shared/errors';
/**
 * org 모듈 — 조직 단위 + 구성원 초대 도메인 (BE-N7).
 *
 * 라우트:
 *   GET  /org/units          — 조직 단위 트리/목록 (시드 카탈로그)
 *   POST /org/invitations    — 구성원 초대 (email + orgUnitId + role)
 *
 * Invitation 영속화: Prisma `invitations` 테이블 (T1 마이그레이션).
 * 멱등성: 동일 (email, orgUnitId) 재초대 시 기존 invitation id 반환 (200 OK).
 * orgUnitId 미존재 시 400 ValidationError.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

interface OrgUnitRow {
  id: string;
  name: string;
  parentId: string | null;
  members: string[];
}

const ORG_UNITS_SEED: OrgUnitRow[] = [
  { id: 'org-root', name: '본사', parentId: null, members: ['u1', 'u2', 'u3', 'u4', 'u5'] },
  { id: 'org-eng', name: '엔지니어링', parentId: 'org-root', members: ['u1', 'u2'] },
  { id: 'org-design', name: '디자인', parentId: 'org-root', members: ['u3'] },
  { id: 'org-platform', name: '플랫폼', parentId: 'org-eng', members: ['u1'] },
];

const InviteUser = z
  .object({
    email: z.string().email(),
    orgUnitId: z.string().min(1).max(80),
    role: z.string().min(1).max(80),
  })
  .strict();

export async function orgRoutes(app: FastifyInstance): Promise<void> {
  app.get('/org/units', { preHandler: [app.authenticate] }, async () => ORG_UNITS_SEED);

  app.post('/org/invitations', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = InviteUser.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const { email, orgUnitId, role } = parsed.data;
    const unit = ORG_UNITS_SEED.find((u) => u.id === orgUnitId);
    if (!unit) throw new ValidationError(`존재하지 않는 조직 단위: ${orgUnitId}`);

    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const existing = await app.prisma.invitation.findFirst({
      where: { email, orgUnitId },
    });

    if (existing) {
      app.log.info(
        {
          action: 'org.invite',
          actorId: userId,
          invitationId: existing.id,
          email,
          orgUnitId,
          idempotent: true,
        },
        'invitation idempotent re-issue',
      );
      return reply.code(200).send({ id: existing.id, pending: existing.pending });
    }

    const row = await app.prisma.invitation.create({
      data: { email, orgUnitId, role, invitedBy: userId },
    });

    app.log.info(
      {
        action: 'org.invite',
        actorId: userId,
        invitationId: row.id,
        email,
        orgUnitId,
        role,
      },
      'invitation issued',
    );

    return reply.code(201).send({ id: row.id, pending: row.pending });
  });
}
