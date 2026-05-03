/**
 * business-flows 라우트 — 비즈니스 플로우 정의 조회 + AI 다음 단계 제안 + 사용자 진행 상태.
 *
 * 엔드포인트:
 *  - GET   /business-flows                          → 플로우 목록 (인증 필요)
 *  - GET   /business-flows/:id                      → 단일 플로우 (인증 필요)
 *  - POST  /business-flows/:id/suggest              → 현재 단계 기준 AI 다음 단계 제안
 *  - GET   /business-flows/:id/progress             → 본인의 단일 플로우 진행 상태 (4차 PDCA)
 *  - GET   /business-flows/progress                 → 본인의 모든 플로우 진행 상태 (4차 PDCA)
 *  - PATCH /business-flows/:id/progress             → 진행 상태 갱신 (멱등, 4차 PDCA)
 *  - GET   /business-flows/team-progress            → 팀원 전체 플로우 진행 현황 (5차 PDCA)
 *
 * 학습 동기:
 *  초급 사용자가 "지금 뭘 해야 하지?" 를 시각적으로 이해하고 AI 코칭으로
 *  다음 액션을 안내받기 위한 화면 보조 컴포넌트의 백엔드.
 *  4차 PDCA: localStorage 의존 → 서버사이드 영속화로 디바이스/세션 간 동기화.
 *  5차 PDCA: 8개 화면 enableServerSync 롤아웃 + 팀 진행 현황 집계 (대시보드 위젯).
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AIAdapterRegistry } from '../ai/ai-adapter.js';
import { NotFoundError, ValidationError } from '@all-flow/shared/errors';
import { getFlow, getNextStep, listFlows } from './flow-registry.js';
import {
  aggregateFlowInsight,
  buildFallbackExplanation,
  buildInsightPrompt,
  type FlowInsight,
  type ProgressRowForInsight,
} from './insights.js';

export interface BusinessFlowsRoutesOptions {
  registry: AIAdapterRegistry;
}

const SuggestBody = z.object({
  currentStepId: z.string().min(1).max(80),
  context: z.string().max(500).optional(),
});

const ProgressPatchBody = z.object({
  currentStepId: z.string().min(1).max(80),
  // 멱등: 클라이언트가 보낸 완료 단계 집합 그대로 저장 (서버는 중복 제거 + 정렬).
  completedSteps: z.array(z.string().min(1).max(80)).max(50).optional(),
});

interface ProgressRow {
  userId: string;
  flowId: string;
  currentStepId: string;
  completedSteps: string[];
  /** 6차 PDCA: 현재 단계가 시작된 시각 (overdue 경고의 기준). */
  stepStartedAt: Date;
  updatedAt: Date;
}

interface UserBrief {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TeamProgressEntry {
  user: UserBrief;
  flowId: string;
  currentStepId: string;
  completedSteps: string[];
  /** 0..1 비율. 완료 단계 / 전체 단계 (멱등하게 서버 측에서 계산). */
  progressRatio: number;
  stepStartedAt: string;
  updatedAt: string;
}

function toProgressWire(row: ProgressRow) {
  return {
    flowId: row.flowId,
    currentStepId: row.currentStepId,
    completedSteps: row.completedSteps,
    stepStartedAt: row.stepStartedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function dedupeSorted(items: readonly string[]): string[] {
  return Array.from(new Set(items)).sort();
}

export async function businessFlowsRoutes(
  app: FastifyInstance,
  opts: BusinessFlowsRoutesOptions,
): Promise<void> {
  app.get('/business-flows', { preHandler: [app.authenticate] }, async () => ({
    flows: listFlows(),
  }));

  app.get('/business-flows/:id', { preHandler: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const flow = getFlow(id);
    if (!flow) throw new NotFoundError('플로우를 찾을 수 없습니다');
    return flow;
  });

  app.post(
    '/business-flows/:id/suggest',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const flow = getFlow(id);
      if (!flow) throw new NotFoundError('플로우를 찾을 수 없습니다');

      const parsed = SuggestBody.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

      const { currentStepId, context } = parsed.data;
      const current = flow.steps.find((s) => s.id === currentStepId);
      if (!current) throw new ValidationError('currentStepId 가 플로우에 없습니다');

      const next = getNextStep(flow, currentStepId);
      const adapter = opts.registry.get();

      const promptParts = [
        `[비즈니스 플로우: ${flow.name}]`,
        `현재 단계: ${current.label} — ${current.description}`,
        next
          ? `다음 단계: ${next.label} — ${next.description}`
          : '다음 단계: 없음 (마지막 단계)',
        context ? `사용자 상황: ${context}` : '',
        '',
        next
          ? `사용자가 "${current.label}" 단계를 완료했다고 가정하고, "${next.label}" 단계로 넘어가기 위해 즉시 취해야 할 액션을 한국어 2~3문장으로 제안해 주세요.`
          : `사용자가 마지막 단계 "${current.label}" 에 도달했습니다. 회고/마무리에 필요한 액션을 한국어 2~3문장으로 제안해 주세요.`,
      ]
        .filter((line) => line.length > 0)
        .join('\n');

      const result = await adapter.complete(
        [
          {
            role: 'system',
            content: '당신은 협업 SaaS 의 업무 코치 AI 입니다. 간결하고 실행 가능한 다음 액션을 제안하세요.',
          },
          { role: 'user', content: promptParts },
        ],
        { maxTokens: 300, temperature: 0.4 },
      );

      reply.send({
        flowId: flow.id,
        currentStep: current,
        nextStep: next ?? null,
        suggestion: result.text,
        adapter: adapter.name,
      });
    },
  );

  // ---------------------------------------------------------------------
  // 4차 PDCA: 사용자 진행 상태 영속화 (서버사이드).
  // ---------------------------------------------------------------------

  // 본인의 모든 플로우 진행 상태.
  app.get(
    '/business-flows/progress',
    { preHandler: [app.authenticate] },
    async (req) => {
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      const rows = (await app.prisma.userFlowProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })) as ProgressRow[];
      return { progress: rows.map(toProgressWire) };
    },
  );

  // 본인의 단일 플로우 진행 상태. 행이 없으면 200 + null 로 응답 (FE 분기 단순화).
  app.get<{ Params: { id: string } }>(
    '/business-flows/:id/progress',
    { preHandler: [app.authenticate] },
    async (req) => {
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      const { id } = req.params;
      const flow = getFlow(id);
      if (!flow) throw new NotFoundError('플로우를 찾을 수 없습니다');
      const row = (await app.prisma.userFlowProgress.findUnique({
        where: { userId_flowId: { userId, flowId: id } },
      })) as ProgressRow | null;
      return row ? toProgressWire(row) : { flowId: id, progress: null };
    },
  );

  // 멱등 PATCH (upsert). 같은 currentStepId/completedSteps 로 여러 번 호출해도 동일 결과.
  app.patch<{ Params: { id: string } }>(
    '/business-flows/:id/progress',
    { preHandler: [app.authenticate] },
    async (req) => {
      // biome-ignore lint/style/noNonNullAssertion: app.authenticate guarantees req.user.
      const userId = req.user!.id;
      const { id } = req.params;
      const flow = getFlow(id);
      if (!flow) throw new NotFoundError('플로우를 찾을 수 없습니다');

      const parsed = ProgressPatchBody.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

      const validIds = new Set(flow.steps.map((s) => s.id));
      const { currentStepId, completedSteps } = parsed.data;
      if (!validIds.has(currentStepId))
        throw new ValidationError('currentStepId 가 플로우에 없습니다');

      const completed = dedupeSorted(
        (completedSteps ?? []).filter((s) => validIds.has(s)),
      );

      // 6차 PDCA: currentStepId 가 실제로 바뀐 경우에만 stepStartedAt 갱신.
      // 같은 단계로 멱등 PATCH (예: completedSteps 만 변경) → stepStartedAt 보존.
      const existing = (await app.prisma.userFlowProgress.findUnique({
        where: { userId_flowId: { userId, flowId: id } },
      })) as ProgressRow | null;

      const stepChanged = !existing || existing.currentStepId !== currentStepId;
      const now = new Date();
      const update: Record<string, unknown> = { currentStepId, completedSteps: completed };
      if (stepChanged) update.stepStartedAt = now;

      const row = (await app.prisma.userFlowProgress.upsert({
        where: { userId_flowId: { userId, flowId: id } },
        create: {
          userId,
          flowId: id,
          currentStepId,
          completedSteps: completed,
          stepStartedAt: now,
        },
        update,
      })) as ProgressRow;

      return toProgressWire(row);
    },
  );

  // ---------------------------------------------------------------------
  // 5차 PDCA: 팀 진행 현황 집계 (대시보드 FlowProgressSummary 위젯).
  // ---------------------------------------------------------------------
  //
  // 정책:
  //  - 인증된 사용자라면 누구나 호출 가능 (협업 가시성).
  //  - 옵션 쿼리 `flowId` 로 단일 플로우만 필터.
  //  - userId in deletedAt:null 인 활성 사용자만 포함.
  //  - 결과는 (flowId, updatedAt desc) 정렬, 최대 200건 (대시보드 카드 가시성 가드).
  app.get<{ Querystring: { flowId?: string } }>(
    '/business-flows/team-progress',
    { preHandler: [app.authenticate] },
    async (req) => {
      const flowId = req.query?.flowId;
      if (flowId && !getFlow(flowId)) {
        throw new NotFoundError('플로우를 찾을 수 없습니다');
      }

      const rows = (await app.prisma.userFlowProgress.findMany({
        where: flowId ? { flowId } : {},
        orderBy: [{ flowId: 'asc' }, { updatedAt: 'desc' }],
        take: 200,
      })) as ProgressRow[];

      if (rows.length === 0) return { team: [] as TeamProgressEntry[] };

      const userIds = Array.from(new Set(rows.map((r) => r.userId)));
      const users = (await app.prisma.user.findMany({
        where: { id: { in: userIds }, deletedAt: null },
        select: { id: true, name: true, email: true, avatarUrl: true },
      })) as UserBrief[];
      const userMap = new Map(users.map((u) => [u.id, u]));

      const team: TeamProgressEntry[] = [];
      for (const row of rows) {
        const user = userMap.get(row.userId);
        if (!user) continue; // soft-deleted 또는 누락 → 스킵
        const flow = getFlow(row.flowId);
        const total = flow?.steps.length ?? 0;
        const ratio = total > 0 ? row.completedSteps.length / total : 0;
        team.push({
          user,
          flowId: row.flowId,
          currentStepId: row.currentStepId,
          completedSteps: row.completedSteps,
          progressRatio: Math.min(1, Math.max(0, ratio)),
          stepStartedAt: row.stepStartedAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        });
      }
      return { team };
    },
  );

  // ---------------------------------------------------------------------
  // 9차 PDCA: 단일 플로우 인사이트 — 단계별 평균 체류일/오버듀/병목 + AI 2문장.
  // ---------------------------------------------------------------------
  //
  // 정책:
  //  - 인증된 사용자라면 누구나 호출 가능 (협업 가시성).
  //  - 활성 사용자(deletedAt:null)만 집계 대상.
  //  - AI 호출 실패 시 결정적 fallback 문장 사용 (위젯 항상 렌더 보장).
  app.get<{ Params: { id: string } }>(
    '/business-flows/:id/insights',
    { preHandler: [app.authenticate] },
    async (req): Promise<FlowInsight> => {
      const { id } = req.params;
      const flow = getFlow(id);
      if (!flow) throw new NotFoundError('플로우를 찾을 수 없습니다');

      const rows = (await app.prisma.userFlowProgress.findMany({
        where: { flowId: id },
        orderBy: { updatedAt: 'desc' },
      })) as ProgressRowForInsight[];

      const userIds = Array.from(new Set(rows.map((r) => r.userId)));
      const activeUsers = userIds.length > 0
        ? ((await app.prisma.user.findMany({
            where: { id: { in: userIds }, deletedAt: null },
            select: { id: true },
          })) as Array<{ id: string }>)
        : [];
      const activeIds = new Set(activeUsers.map((u) => u.id));

      const aggregate = aggregateFlowInsight(flow, rows, activeIds);

      let aiExplanation = buildFallbackExplanation(flow, aggregate);
      try {
        const adapter = opts.registry.get();
        const prompt = buildInsightPrompt(flow, aggregate);
        const result = await adapter.complete(
          [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          { maxTokens: 200, temperature: 0.3 },
        );
        const text = result.text.trim();
        if (text.length > 0) aiExplanation = text;
      } catch {
        // adapter 미등록/실패 → fallback 유지.
      }

      return { ...aggregate, aiExplanation };
    },
  );
}
