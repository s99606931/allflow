import type { Prisma } from '@prisma/client';
/**
 * Reports 라우트 — T-404 (POST /reports/weekly), T-405 (POST /reports/monthly).
 *
 * 컨트랙트(frontend openapi.yaml `Report`):
 *   - 응답: { id, kind, periodStart, periodEnd, generatedAt, tldr, kpis[], sections[] }
 *   - kpis: ≥ 3, sections: ≥ 3 (acceptance criteria)
 *
 * 비동기 큐:
 *   - BullMQ 의존성을 추가하지 않고, 인라인 실행 + Report row 영속화 패턴.
 *   - 결과 row 는 멤버 권한이 있는 사용자만 후속 GET 으로 조회 가능 (추후 확장).
 *
 * 권한:
 *   - weekly: scopeIds 필수 — 호출자가 모든 scopeIds 의 멤버여야 한다.
 *   - monthly: 호출자가 멤버인 모든 프로젝트 자동 스코프.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ForbiddenError, ValidationError } from '../../shared/errors.js';
import type { AIAdapterRegistry } from '../ai/ai-adapter.js';
import { recordAICall } from './ai-observability.js';
import { type BuildReportOutput, type ReportPrismaClient, buildReport } from './report-builder.js';

const WeeklyRequest = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scopeIds: z.array(z.string().min(1)).min(1).max(50),
  tone: z.enum(['exec', 'team', 'casual']).optional(),
});

const MonthlyRequest = z.object({
  year: z.number().int().min(2000).max(3000),
  month: z.number().int().min(1).max(12),
  tone: z.enum(['exec', 'team', 'casual']).optional(),
});

interface ReportResponse {
  id: string;
  kind: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  tldr: string;
  kpis: unknown[];
  sections: unknown[];
}

export interface ReportsRoutesOptions {
  registry: AIAdapterRegistry;
}

export async function reportsRoutes(
  app: FastifyInstance,
  opts: ReportsRoutesOptions,
): Promise<void> {
  app.post('/reports/weekly', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = WeeklyRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { periodStart, periodEnd, scopeIds, tone } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    await assertMembershipForAll(app, userId, scopeIds);

    const result = await buildReport(opts.registry.get(), prismaShim(app), {
      kind: 'weekly',
      periodStart: parseDate(periodStart),
      periodEnd: parseDate(periodEnd, true),
      scopeIds,
      tone,
    });

    const persisted = await persistReport(app, {
      kind: 'weekly',
      periodStart,
      periodEnd,
      authorId: userId,
      result,
    });

    recordAICall(app.log, {
      route: '/reports/weekly',
      adapter: opts.registry.get().name,
      promptKey: 'reports.weekly',
      tone: tone ?? 'team',
      sectionCount: result.sections.length,
    });

    reply.code(200);
    return persisted;
  });

  app.post('/reports/monthly', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = MonthlyRequest.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);
    const { year, month, tone } = parsed.data;
    // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
    const userId = req.user!.id;

    const scopeIds = await listMemberProjectIds(app, userId);
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const result = await buildReport(opts.registry.get(), prismaShim(app), {
      kind: 'monthly',
      periodStart,
      periodEnd,
      scopeIds: scopeIds.length > 0 ? scopeIds : undefined,
      tone,
    });

    const persisted = await persistReport(app, {
      kind: 'monthly',
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
      authorId: userId,
      result,
    });

    recordAICall(app.log, {
      route: '/reports/monthly',
      adapter: opts.registry.get().name,
      promptKey: 'reports.monthly',
      tone: tone ?? 'team',
      sectionCount: result.sections.length,
    });

    reply.code(200);
    return persisted;
  });
}

async function assertMembershipForAll(
  app: FastifyInstance,
  userId: string,
  projectIds: string[],
): Promise<void> {
  const memberships = await app.prisma.projectMember.findMany({
    where: { userId, projectId: { in: projectIds } },
    select: { projectId: true },
  });
  const have = new Set(memberships.map((m) => m.projectId));
  for (const id of projectIds) {
    if (!have.has(id)) {
      throw new ForbiddenError(`프로젝트 ${id} 멤버가 아닙니다`);
    }
  }
}

async function listMemberProjectIds(app: FastifyInstance, userId: string): Promise<string[]> {
  const rows = await app.prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

interface PersistInput {
  kind: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  authorId: string;
  result: BuildReportOutput;
}

async function persistReport(app: FastifyInstance, input: PersistInput): Promise<ReportResponse> {
  const row = await app.prisma.report.create({
    data: {
      kind: input.kind,
      periodStart: parseDate(input.periodStart),
      periodEnd: parseDate(input.periodEnd, true),
      authorId: input.authorId,
      tldr: input.result.tldr,
      kpis: input.result.kpis as unknown as Prisma.InputJsonValue,
      sections: input.result.sections as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      kind: true,
      periodStart: true,
      periodEnd: true,
      generatedAt: true,
      tldr: true,
      kpis: true,
      sections: true,
    },
  });

  return {
    id: row.id,
    kind: row.kind as 'weekly' | 'monthly',
    periodStart: formatDate(row.periodStart),
    periodEnd: formatDate(row.periodEnd),
    generatedAt: row.generatedAt.toISOString(),
    tldr: row.tldr ?? '',
    kpis: (row.kpis as unknown as unknown[]) ?? [],
    sections: (row.sections as unknown as unknown[]) ?? [],
  };
}

function parseDate(yyyyMmDd: string, endOfDay = false): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) throw new ValidationError(`잘못된 날짜: ${yyyyMmDd}`);
  return new Date(Date.UTC(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Prisma client → ReportPrismaClient 어댑터.
 * builder 가 Prisma 의 광범위한 타입을 알 필요 없게 좁힌다.
 */
function prismaShim(app: FastifyInstance): ReportPrismaClient {
  return {
    task: {
      findMany: (args) => app.prisma.task.findMany(args) as never,
    },
    issue: {
      findMany: (args) => app.prisma.issue.findMany(args) as never,
    },
  };
}
