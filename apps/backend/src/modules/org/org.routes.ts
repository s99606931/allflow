import { ValidationError } from '@all-flow/shared/errors';
/**
 * org 모듈 — 조직 단위 + 구성원 초대 도메인 (BE-N7).
 *
 * 라우트:
 *   GET  /org/units          — 조직 단위 트리/목록 (시드 카탈로그)
 *   POST /org/invitations    — 구성원 초대 (email + orgUnitId + role)
 *
 * 현재 구현(BE-N7 1차):
 *  - in-memory OrgUnit 시드 + Invitation store (BE-N1~N6 동일 패턴).
 *  - audit log: `org.invite` (메일 발송 stub, 실제 SMTP 연동은 follow-up).
 *  - 멱등성: 동일 (email, orgUnitId) 재초대 시 기존 invitation id 반환 (200 OK).
 *  - orgUnitId 미존재 시 400 ValidationError.
 *
 * RBAC enforcement, 영속화(Prisma OrgUnit/Invitation), 토큰 만료, 메일 발송은 follow-up.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

interface OrgUnitRow {
  id: string;
  name: string;
  parentId: string | null;
  members: string[];
}

interface InvitationRow {
  id: string;
  email: string;
  orgUnitId: string;
  role: string;
  invitedBy: string;
  pending: true;
  createdAt: string;
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

const invitations = new Map<string, InvitationRow>();
let invSeq = 0;

export function __resetOrgInvitationsForTests(): void {
  invitations.clear();
  invSeq = 0;
}

const newInvId = (): string => {
  invSeq += 1;
  return `inv-${invSeq.toString(36)}-${Date.now().toString(36)}`;
};

const findExisting = (email: string, orgUnitId: string): InvitationRow | undefined => {
  for (const row of invitations.values()) {
    if (row.email === email && row.orgUnitId === orgUnitId) return row;
  }
  return undefined;
};

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

    const existing = findExisting(email, orgUnitId);
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

    const row: InvitationRow = {
      id: newInvId(),
      email,
      orgUnitId,
      role,
      invitedBy: userId,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    invitations.set(row.id, row);

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
