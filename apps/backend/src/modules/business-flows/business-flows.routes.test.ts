import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { InMemoryAIAdapter, StaticAIAdapterRegistry } from '../ai/ai-adapter.js';
import { businessFlowsRoutes } from './business-flows.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

interface ProgressStoreRow {
  userId: string;
  flowId: string;
  currentStepId: string;
  completedSteps: string[];
  updatedAt: Date;
  createdAt: Date;
}

function makeProgressStore() {
  const rows = new Map<string, ProgressStoreRow>();
  const key = (userId: string, flowId: string) => `${userId}::${flowId}`;
  return {
    rows,
    findMany: async (
      args: {
        where?: { userId?: string; flowId?: string };
        orderBy?: unknown;
        take?: number;
      } = {},
    ) => {
      let list = Array.from(rows.values());
      if (args.where?.userId !== undefined) {
        list = list.filter((r) => r.userId === args.where!.userId);
      }
      if (args.where?.flowId !== undefined) {
        list = list.filter((r) => r.flowId === args.where!.flowId);
      }
      list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return args.take ? list.slice(0, args.take) : list;
    },
    findUnique: async (args: {
      where: { userId_flowId: { userId: string; flowId: string } };
    }) => rows.get(key(args.where.userId_flowId.userId, args.where.userId_flowId.flowId)) ?? null,
    upsert: async (args: {
      where: { userId_flowId: { userId: string; flowId: string } };
      create: Omit<ProgressStoreRow, 'updatedAt' | 'createdAt'>;
      update: Partial<ProgressStoreRow>;
    }) => {
      const k = key(args.where.userId_flowId.userId, args.where.userId_flowId.flowId);
      const now = new Date();
      const existing = rows.get(k);
      const next: ProgressStoreRow = existing
        ? { ...existing, ...args.update, updatedAt: now }
        : {
            userId: args.create.userId,
            flowId: args.create.flowId,
            currentStepId: args.create.currentStepId,
            completedSteps: args.create.completedSteps,
            createdAt: now,
            updatedAt: now,
          };
      rows.set(k, next);
      return next;
    },
  };
}

interface UserBriefRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  deletedAt: Date | null;
}

function makeUserStore(seed: UserBriefRow[] = []) {
  const rows = new Map<string, UserBriefRow>(seed.map((u) => [u.id, u]));
  return {
    rows,
    findMany: async (args: {
      where?: { id?: { in?: string[] }; deletedAt?: Date | null };
      select?: Record<string, true>;
    }) => {
      const ids = args.where?.id?.in;
      const list = Array.from(rows.values()).filter((r) => {
        if (args.where?.deletedAt === null && r.deletedAt !== null) return false;
        if (ids && !ids.includes(r.id)) return false;
        return true;
      });
      // tests assert id/name/email/avatarUrl shape — return as-is.
      return list.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        avatarUrl: r.avatarUrl,
      }));
    },
  };
}

async function buildTestApp(userSeed: UserBriefRow[] = []) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const progressStore = makeProgressStore();
  const userStore = makeUserStore(userSeed);
  app.decorate('prisma', {
    revokedToken: { findUnique: async () => null },
    userFlowProgress: progressStore,
    user: userStore,
  } as never);
  await app.register(authPlugin);

  const adapter = new InMemoryAIAdapter({
    DEFAULT: '다음 단계로 결재선을 지정해 상신하세요.',
  });
  const registry = new StaticAIAdapterRegistry();
  registry.register(adapter, true);
  await app.register(businessFlowsRoutes, { registry });
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/business-flows', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /business-flows)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/business-flows' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /business-flows → 5개 표준 플로우 반환', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { flows: Array<{ id: string; steps: unknown[] }> };
    expect(body.flows.length).toBe(5);
    const ids = body.flows.map((f) => f.id);
    expect(ids).toContain('project-lifecycle');
    expect(ids).toContain('approval-lifecycle');
    expect(ids).toContain('issue-lifecycle');
    await app.close();
  });

  it('GET /business-flows/:id → 단일 플로우 + 모든 단계 노출', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const flow = r.json() as { id: string; steps: Array<{ id: string; aiHint: string }> };
    expect(flow.id).toBe('project-lifecycle');
    expect(flow.steps.length).toBeGreaterThanOrEqual(4);
    expect(flow.steps[0]?.aiHint).toBeTruthy();
    await app.close();
  });

  it('GET /business-flows/unknown → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/unknown-flow',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /business-flows/:id/suggest → AI 제안 + nextStep 반환', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/business-flows/approval-lifecycle/suggest',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'draft', context: '결재서 작성 중입니다' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      flowId: string;
      currentStep: { id: string };
      nextStep: { id: string } | null;
      suggestion: string;
      adapter: string;
    };
    expect(body.flowId).toBe('approval-lifecycle');
    expect(body.currentStep.id).toBe('draft');
    expect(body.nextStep?.id).toBe('submit');
    expect(typeof body.suggestion).toBe('string');
    expect(body.suggestion.length).toBeGreaterThan(0);
    expect(body.adapter).toBe('in-memory');
    await app.close();
  });

  it('POST /business-flows/:id/suggest → 마지막 단계 = nextStep null', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/business-flows/approval-lifecycle/suggest',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'archive' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { nextStep: unknown };
    expect(body.nextStep).toBeNull();
    await app.close();
  });

  it('POST /business-flows/:id/suggest → invalid step 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/business-flows/approval-lifecycle/suggest',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'no-such-step' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  // ---------------------------------------------------------------------
  // 4차 PDCA: server-side progress
  // ---------------------------------------------------------------------

  it('GET /business-flows/:id/progress → 행 없으면 progress=null', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { flowId: string; progress: null };
    expect(body.flowId).toBe('project-lifecycle');
    expect(body.progress).toBeNull();
    await app.close();
  });

  it('PATCH /business-flows/:id/progress → upsert + 멱등', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    // 1차: create
    const r1 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'kickoff', completedSteps: ['plan'] },
    });
    expect(r1.statusCode).toBe(200);
    const b1 = r1.json() as {
      flowId: string;
      currentStepId: string;
      completedSteps: string[];
    };
    expect(b1.flowId).toBe('project-lifecycle');
    expect(b1.currentStepId).toBe('kickoff');
    expect(b1.completedSteps).toEqual(['plan']);

    // 2차: 같은 입력 → 멱등 (정렬 + 중복 제거 검증)
    const r2 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'execute', completedSteps: ['kickoff', 'plan', 'plan'] },
    });
    expect(r2.statusCode).toBe(200);
    const b2 = r2.json() as { currentStepId: string; completedSteps: string[] };
    expect(b2.currentStepId).toBe('execute');
    expect(b2.completedSteps).toEqual(['kickoff', 'plan']);

    // 3차: GET 으로 동기화 확인
    const r3 = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r3.statusCode).toBe(200);
    const b3 = r3.json() as { currentStepId: string; completedSteps: string[] };
    expect(b3.currentStepId).toBe('execute');
    expect(b3.completedSteps).toEqual(['kickoff', 'plan']);

    await app.close();
  });

  it('PATCH /business-flows/:id/progress → 잘못된 stepId 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'no-such' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('PATCH /business-flows/:id/progress → completedSteps 의 unknown id 는 무시 (서버 정화)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan', completedSteps: ['plan', 'malicious-id'] },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { completedSteps: string[] };
    expect(body.completedSteps).toEqual(['plan']);
    await app.close();
  });

  it('GET /business-flows/progress → 본인의 모든 플로우 진행 상태 (다른 user 격리)', async () => {
    const app = await buildTestApp();
    const tokenA = await makeJws('user-a');
    const tokenB = await makeJws('user-b');
    // userA: 두 플로우 등록
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'plan' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/issue-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'open' },
    });
    // userB: 한 플로우만
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/task-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { currentStepId: 'create' },
    });

    const rA = await app.inject({
      method: 'GET',
      url: '/business-flows/progress',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(rA.statusCode).toBe(200);
    const bA = rA.json() as { progress: Array<{ flowId: string }> };
    expect(bA.progress.length).toBe(2);
    expect(bA.progress.map((p) => p.flowId).sort()).toEqual([
      'issue-lifecycle',
      'project-lifecycle',
    ]);

    const rB = await app.inject({
      method: 'GET',
      url: '/business-flows/progress',
      headers: { authorization: `Bearer ${tokenB}` },
    });
    const bB = rB.json() as { progress: Array<{ flowId: string }> };
    expect(bB.progress.length).toBe(1);
    expect(bB.progress[0]?.flowId).toBe('task-lifecycle');

    await app.close();
  });

  it('PATCH /business-flows/unknown/progress → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/business-flows/no-such-flow/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('progress 엔드포인트 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r1 = await app.inject({ method: 'GET', url: '/business-flows/progress' });
    expect(r1.statusCode).toBe(401);
    const r2 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      payload: { currentStepId: 'plan' },
    });
    expect(r2.statusCode).toBe(401);
    await app.close();
  });

  // ---------------------------------------------------------------------
  // 5차 PDCA: GET /business-flows/team-progress
  // ---------------------------------------------------------------------

  it('GET /business-flows/team-progress → 빈 결과', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/team-progress',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ team: [] });
    await app.close();
  });

  it('GET /business-flows/team-progress → 활성 사용자만 + progressRatio 계산', async () => {
    const app = await buildTestApp([
      { id: 'user-a', name: 'Alice', email: 'a@x.io', avatarUrl: null, deletedAt: null },
      { id: 'user-b', name: 'Bob', email: 'b@x.io', avatarUrl: null, deletedAt: null },
      // soft-deleted: 결과에서 제외되어야 함
      {
        id: 'user-c',
        name: 'Carol',
        email: 'c@x.io',
        avatarUrl: null,
        deletedAt: new Date(),
      },
    ]);
    const tokenA = await makeJws('user-a');
    const tokenB = await makeJws('user-b');
    const tokenC = await makeJws('user-c');

    // userA: project-lifecycle 의 2/5 단계 완료
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'execute', completedSteps: ['plan', 'kickoff'] },
    });
    // userB: project-lifecycle 의 0/5
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { currentStepId: 'plan' },
    });
    // userC: 행 존재하나 soft-deleted → 제외
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenC}` },
      payload: { currentStepId: 'plan' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/team-progress',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      team: Array<{
        user: { id: string; name: string };
        flowId: string;
        progressRatio: number;
        completedSteps: string[];
      }>;
    };
    expect(body.team.length).toBe(2);
    const ids = body.team.map((t) => t.user.id).sort();
    expect(ids).toEqual(['user-a', 'user-b']);
    const a = body.team.find((t) => t.user.id === 'user-a');
    expect(a?.progressRatio).toBeCloseTo(2 / 5);
    expect(a?.completedSteps).toEqual(['kickoff', 'plan']);

    await app.close();
  });

  it('GET /business-flows/team-progress?flowId=xxx → 단일 플로우 필터', async () => {
    const app = await buildTestApp([
      { id: 'user-a', name: 'Alice', email: 'a@x.io', avatarUrl: null, deletedAt: null },
    ]);
    const tokenA = await makeJws('user-a');
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'plan' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/issue-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'open' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/team-progress?flowId=issue-lifecycle',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { team: Array<{ flowId: string }> };
    expect(body.team.length).toBe(1);
    expect(body.team[0]?.flowId).toBe('issue-lifecycle');

    await app.close();
  });

  it('GET /business-flows/team-progress?flowId=unknown → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/team-progress?flowId=no-such-flow',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('GET /business-flows/team-progress 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/team-progress',
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });
});
