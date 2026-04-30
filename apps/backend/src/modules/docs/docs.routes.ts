import { ValidationError } from '@all-flow/shared/errors';
/**
 * docs 모듈 — 문서 도메인 (BE-N5, Prisma 영속화).
 *
 * 라우트:
 *   GET  /docs   — 문서 목록 (updatedAt desc). 비어 있으면 3건 자동 시드.
 *   POST /docs   — 문서 생성 (201)
 *
 * preview 는 content 첫 200자 추출.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const DocCreate = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().max(50000).optional(),
  })
  .strict();

const PREVIEW_MAX = 200;

const DOC_SEEDS = [
  {
    title: '프로젝트 킥오프 회의록',
    content:
      '2026-05-01 킥오프 미팅. 참석자: 김민수, 이서연, 박준혁. 목표: Q2 로드맵 확정. 주요 결정사항: 백엔드 Prisma 이관 완료, 프론트엔드 API 훅 전환, E2E 테스트 스위트 구축.',
  },
  {
    title: 'API 설계 가이드',
    content:
      'REST API 설계 원칙. 1) 명사형 엔드포인트 사용. 2) 적절한 HTTP 메서드 선택. 3) 일관된 응답 형식. 4) 에러 코드 표준화. 5) 버전 관리 전략.',
  },
  {
    title: '온보딩 체크리스트',
    content:
      '신규 팀원 온보딩 가이드. □ 개발 환경 설정 (Node 22 LTS, pnpm, Docker) □ 코드 스타일 가이드 숙지 □ Prisma 스키마 이해 □ 주요 워크플로우 파악 □ 첫 PR 제출.',
  },
];

interface DocRow {
  id: string;
  title: string;
  ownerId: string;
  updatedAt: Date;
  content: string | null;
}

const serialize = (row: DocRow) => ({
  id: row.id,
  title: row.title,
  ownerId: row.ownerId,
  updatedAt: row.updatedAt.toISOString(),
  ...(row.content ? { preview: row.content.slice(0, PREVIEW_MAX) } : {}),
});

async function ensureDocsSeeded(app: FastifyInstance, ownerId: string): Promise<void> {
  const count = await app.prisma.doc.count();
  if (count > 0) return;
  await app.prisma.doc.createMany({
    data: DOC_SEEDS.map((s) => ({ title: s.title, content: s.content, ownerId })),
  });
}

export async function docsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/docs', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;
    await ensureDocsSeeded(app, userId);
    const rows = await app.prisma.doc.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(serialize);
  });

  app.post('/docs', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = DocCreate.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const row = await app.prisma.doc.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content ?? null,
        ownerId: userId,
      },
    });

    app.log.info(
      {
        action: 'docs.create',
        actorId: userId,
        docId: row.id,
        title: row.title,
      },
      'doc created',
    );

    return reply.code(201).send(serialize(row));
  });
}
