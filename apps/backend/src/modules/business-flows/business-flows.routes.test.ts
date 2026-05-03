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
  stepStartedAt: Date;
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
            stepStartedAt: args.create.stepStartedAt ?? now,
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

interface NotificationRow {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: Date;
}

function makeNotificationStore() {
  const rows: NotificationRow[] = [];
  let seq = 0;
  return {
    rows,
    create: async (args: {
      data: { userId: string; kind: string; title: string; body?: string; href?: string };
    }) => {
      seq += 1;
      const row: NotificationRow = {
        id: `n-${seq}`,
        userId: args.data.userId,
        kind: args.data.kind,
        title: args.data.title,
        body: args.data.body ?? null,
        href: args.data.href ?? null,
        createdAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    findFirst: async (args: {
      where: {
        userId?: string;
        kind?: string;
        href?: string;
        createdAt?: { gte?: Date };
        title?: { contains?: string };
      };
      select?: Record<string, true>;
    }) => {
      const w = args.where;
      const found = rows.find((r) => {
        if (w.userId && r.userId !== w.userId) return false;
        if (w.kind && r.kind !== w.kind) return false;
        if (w.href && r.href !== w.href) return false;
        if (w.createdAt?.gte && r.createdAt < w.createdAt.gte) return false;
        if (w.title?.contains && !r.title.includes(w.title.contains)) return false;
        return true;
      });
      return found ? { id: found.id } : null;
    },
  };
}

interface TestAppHandles {
  app: Awaited<ReturnType<typeof buildApp>>;
  progressStore: ReturnType<typeof makeProgressStore>;
  notificationStore: ReturnType<typeof makeNotificationStore>;
}

async function buildTestApp(userSeed: UserBriefRow[] = []): Promise<TestAppHandles['app']> {
  const handles = await buildTestAppWithHandles(userSeed);
  return handles.app;
}

async function buildTestAppWithHandles(
  userSeed: UserBriefRow[] = [],
): Promise<TestAppHandles> {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const progressStore = makeProgressStore();
  const userStore = makeUserStore(userSeed);
  const notificationStore = makeNotificationStore();
  app.decorate('prisma', {
    revokedToken: { findUnique: async () => null },
    userFlowProgress: progressStore,
    user: userStore,
    notification: notificationStore,
  } as never);
  await app.register(authPlugin);

  const adapter = new InMemoryAIAdapter({
    DEFAULT: '다음 단계로 결재선을 지정해 상신하세요.',
  });
  const registry = new StaticAIAdapterRegistry();
  registry.register(adapter, true);
  await app.register(businessFlowsRoutes, { registry });
  return { app, progressStore, notificationStore };
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

  // -------------------------------------------------------------------
  // 6차 PDCA: stepStartedAt 동작 검증 (overdue 경고 기준 시각)
  // -------------------------------------------------------------------

  it('PATCH /business-flows/:id/progress → 응답에 stepStartedAt 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { stepStartedAt: string };
    expect(typeof body.stepStartedAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.stepStartedAt))).toBe(false);
    await app.close();
  });

  it('PATCH 멱등: 같은 currentStepId 로 다시 호출해도 stepStartedAt 보존', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r1 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    const b1 = r1.json() as { stepStartedAt: string };

    // 약간의 시간 차 후 같은 단계로 PATCH (completedSteps 만 추가).
    await new Promise((r) => setTimeout(r, 10));

    const r2 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan', completedSteps: [] },
    });
    const b2 = r2.json() as { stepStartedAt: string };
    expect(b2.stepStartedAt).toBe(b1.stepStartedAt);
    await app.close();
  });

  it('PATCH: currentStepId 가 변경되면 stepStartedAt 도 갱신', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r1 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    const b1 = r1.json() as { stepStartedAt: string };

    await new Promise((r) => setTimeout(r, 10));

    const r2 = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'kickoff', completedSteps: ['plan'] },
    });
    const b2 = r2.json() as { stepStartedAt: string };
    expect(Date.parse(b2.stepStartedAt)).toBeGreaterThan(Date.parse(b1.stepStartedAt));
    await app.close();
  });

  it('GET /business-flows/:id → step 에 expectedDays 노출', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const flow = r.json() as { steps: Array<{ id: string; expectedDays?: number }> };
    // 모든 단계가 expectedDays 를 가져야 함 (6차 PDCA 정책).
    for (const step of flow.steps) {
      expect(typeof step.expectedDays).toBe('number');
      expect(step.expectedDays!).toBeGreaterThan(0);
    }
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

  // ---------------------------------------------------------------------
  // 9차 PDCA: GET /business-flows/:id/insights
  // ---------------------------------------------------------------------

  it('GET /business-flows/:id/insights → 빈 데이터: bottleneckStepId=null + fallback 문장', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle/insights',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      flowId: string;
      totalMembers: number;
      steps: Array<{ stepId: string; memberCount: number; isBottleneck: boolean }>;
      bottleneckStepId: string | null;
      aiExplanation: string;
    };
    expect(body.flowId).toBe('project-lifecycle');
    expect(body.totalMembers).toBe(0);
    expect(body.bottleneckStepId).toBeNull();
    expect(body.steps.every((s) => s.isBottleneck === false)).toBe(true);
    expect(body.aiExplanation.length).toBeGreaterThan(0);
    await app.close();
  });

  it('GET /business-flows/:id/insights → 병목 단계 식별 + AI 문장', async () => {
    const app = await buildTestApp([
      { id: 'user-a', name: 'Alice', email: 'a@x.io', avatarUrl: null, deletedAt: null },
      { id: 'user-b', name: 'Bob', email: 'b@x.io', avatarUrl: null, deletedAt: null },
      { id: 'user-c', name: 'Carol', email: 'c@x.io', avatarUrl: null, deletedAt: null },
    ]);
    const tokenA = await makeJws('user-a');
    const tokenB = await makeJws('user-b');
    const tokenC = await makeJws('user-c');

    // userA & userB : "kickoff" 단계에 머무름 (멤버 2명)
    // userC      : "plan" 단계 (멤버 1명)
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'kickoff', completedSteps: ['plan'] },
    });
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { currentStepId: 'kickoff', completedSteps: ['plan'] },
    });
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenC}` },
      payload: { currentStepId: 'plan' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle/insights',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      totalMembers: number;
      steps: Array<{
        stepId: string;
        memberCount: number;
        isBottleneck: boolean;
        avgDwellDays: number;
        overdueRatio: number;
      }>;
      bottleneckStepId: string | null;
      aiExplanation: string;
    };
    expect(body.totalMembers).toBe(3);
    // overdueRatio 가 모두 0인 상황 (방금 시작) → avgDwellDays desc 로 결정.
    // 동일하게 0에 가까우므로 멤버수가 큰 단계(kickoff:2)가 1순위로 정렬되도록 보장.
    // 실제로는 timing 영향 — 보장할 수 있는 invariant: bottleneck 은 멤버 1명 이상인 단계.
    const bottleneck = body.steps.find((s) => s.stepId === body.bottleneckStepId);
    expect(bottleneck).toBeDefined();
    expect(bottleneck!.memberCount).toBeGreaterThan(0);
    expect(bottleneck!.isBottleneck).toBe(true);
    expect(body.aiExplanation.length).toBeGreaterThan(0);
    await app.close();
  });

  it('GET /business-flows/:id/insights → soft-deleted 사용자 제외', async () => {
    const app = await buildTestApp([
      { id: 'active-a', name: 'Active', email: 'a@x.io', avatarUrl: null, deletedAt: null },
      {
        id: 'deleted-b',
        name: 'Deleted',
        email: 'b@x.io',
        avatarUrl: null,
        deletedAt: new Date(),
      },
    ]);
    const tokenA = await makeJws('active-a');
    const tokenB = await makeJws('deleted-b');

    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { currentStepId: 'plan' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { currentStepId: 'execute' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle/insights',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { totalMembers: number };
    expect(body.totalMembers).toBe(1);
    await app.close();
  });

  it('GET /business-flows/unknown/insights → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/no-such-flow/insights',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('GET /business-flows/:id/insights 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'GET',
      url: '/business-flows/project-lifecycle/insights',
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  // ---------------------------------------------------------------------
  // 10차 PDCA: 알림 센터 연동 — overdue 자동 알림 + suggest 저장
  // ---------------------------------------------------------------------

  it('PATCH /progress: stepStartedAt 가 expectedDays 초과면 flow_overdue 알림 자동 생성', async () => {
    const { app, progressStore, notificationStore } = await buildTestAppWithHandles();
    const token = await makeJws('u1');
    // 1차 호출 → plan 단계 (expectedDays=5).
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    // stepStartedAt 를 7일 전으로 강제 (expectedDays 5일 초과).
    const row = progressStore.rows.get('u1::project-lifecycle');
    if (!row) throw new Error('row not seeded');
    row.stepStartedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 2차 호출 → 같은 단계 멱등 PATCH. overdue 검사가 트리거되어 알림 생성.
    const r = await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    expect(r.statusCode).toBe(200);
    expect(notificationStore.rows.length).toBe(1);
    const n = notificationStore.rows[0]!;
    expect(n.kind).toBe('flow_overdue');
    expect(n.userId).toBe('u1');
    expect(n.title).toContain('"기획"');
    expect(n.href).toBe('/projects');
    await app.close();
  });

  it('PATCH /progress: 같은 날 두 번 overdue 면 알림 1건만 (dedup)', async () => {
    const { app, progressStore, notificationStore } = await buildTestAppWithHandles();
    const token = await makeJws('u1');
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    const row = progressStore.rows.get('u1::project-lifecycle');
    if (!row) throw new Error('row not seeded');
    row.stepStartedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 두 번 PATCH → 알림은 1건만 생성되어야 함.
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    expect(notificationStore.rows.length).toBe(1);
    await app.close();
  });

  it('PATCH /progress: stepStartedAt 가 expectedDays 미만이면 알림 없음', async () => {
    const { app, notificationStore } = await buildTestAppWithHandles();
    const token = await makeJws('u1');
    await app.inject({
      method: 'PATCH',
      url: '/business-flows/project-lifecycle/progress',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'plan' },
    });
    expect(notificationStore.rows.length).toBe(0);
    await app.close();
  });

  it('POST /suggest with saveToNotifications=true → 알림 저장 + notificationId 반환', async () => {
    const { app, notificationStore } = await buildTestAppWithHandles();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/business-flows/approval-lifecycle/suggest',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'draft', saveToNotifications: true },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { notificationId?: string; suggestion: string };
    expect(typeof body.notificationId).toBe('string');
    expect(notificationStore.rows.length).toBe(1);
    const n = notificationStore.rows[0]!;
    expect(n.kind).toBe('ai');
    expect(n.title).toContain('결재 라이프사이클');
    expect(n.body).toBe(body.suggestion);
    await app.close();
  });

  it('POST /suggest 기본값(saveToNotifications 미지정) → 알림 저장 안 함', async () => {
    const { app, notificationStore } = await buildTestAppWithHandles();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/business-flows/approval-lifecycle/suggest',
      headers: { authorization: `Bearer ${token}` },
      payload: { currentStepId: 'draft' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { notificationId?: string };
    expect(body.notificationId).toBeUndefined();
    expect(notificationStore.rows.length).toBe(0);
    await app.close();
  });
});
