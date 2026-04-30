import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { issuesRoutes } from './issues.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;
interface PrismaIssueMock {
  issue: {
    findMany: (args: AnyArgs) => Promise<unknown[]>;
    create: (args: AnyArgs) => Promise<unknown>;
    findFirst?: (args: AnyArgs) => Promise<unknown>;
    update?: (args: AnyArgs) => Promise<unknown>;
  };
  project: {
    findFirst: (args: AnyArgs) => Promise<unknown>;
  };
  comment?: {
    create: (args: AnyArgs) => Promise<unknown>;
  };
}

async function buildTestApp(prismaMock: PrismaIssueMock) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  app.decorate('prisma', prismaMock as never);
  await app.register(authPlugin);
  await app.register(issuesRoutes);
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

const SAMPLE_ISSUE_ROW = {
  id: 'i1',
  title: '500 spike',
  projColor: '#5B7FFF',
  sev: 'critical',
  prio: 'P0',
  status: 'in_progress', // prisma 형태
  tags: ['infra'],
  sla: '4h',
  slaPct: 60,
  linked: 2,
  resolved: false,
  createdAt: new Date('2026-04-28T00:00:00Z'),
  project: { name: 'ALL-Flow', color: '#5B7FFF' },
  assignee: { name: '박서연' },
  reporter: { name: '김지우' },
  _count: { comments: 5 },
};

describe('modules/issues', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /issues → status/prio 필터 + Issue 스키마 직렬화', async () => {
    let receivedWhere: Record<string, unknown> = {};
    const app = await buildTestApp({
      issue: {
        findMany: async (args: AnyArgs) => {
          receivedWhere = args.where as Record<string, unknown>;
          return [SAMPLE_ISSUE_ROW];
        },
        create: async () => ({}),
      },
      project: { findFirst: async () => null },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/issues?status=in-progress&prio=P0',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as Array<{
      status: string;
      assignee: string;
      comments: number;
      proj: string;
    }>;
    expect(body[0]?.status).toBe('in-progress'); // API 형태로 변환
    expect(body[0]?.assignee).toBe('박서연');
    expect(body[0]?.comments).toBe(5);
    expect(body[0]?.proj).toBe('ALL-Flow');
    // 필터가 prisma where에 반영
    expect(receivedWhere.status).toBe('in_progress');
    expect(receivedWhere.prio).toBe('P0');
    await app.close();
  });

  it('GET /issues → 잘못된 status 필터 → 400', async () => {
    const app = await buildTestApp({
      issue: { findMany: async () => [], create: async () => ({}) },
      project: { findFirst: async () => null },
    });
    const r = await app.inject({
      method: 'GET',
      url: '/issues?status=nope',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /issues → 멤버 아니면 403', async () => {
    const app = await buildTestApp({
      issue: { findMany: async () => [], create: async () => ({}) },
      project: {
        findFirst: async () => ({ id: 'p1', color: '#5B7FFF', members: [] }),
      },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        projectId: 'p1',
        title: '버그',
        sev: 'high',
        prio: 'P1',
        sla: '24h',
      },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('POST /issues → 프로젝트 없으면 404', async () => {
    const app = await buildTestApp({
      issue: { findMany: async () => [], create: async () => ({}) },
      project: { findFirst: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        projectId: 'p-missing',
        title: '버그',
        sev: 'high',
        prio: 'P1',
        sla: '24h',
      },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /issues → 정상 생성 시 201 + Issue 응답', async () => {
    let createPayload: Record<string, unknown> = {};
    const app = await buildTestApp({
      issue: {
        findMany: async () => [],
        create: async (args: AnyArgs) => {
          createPayload = args.data as Record<string, unknown>;
          return SAMPLE_ISSUE_ROW;
        },
      },
      project: {
        findFirst: async () => ({
          id: 'p1',
          color: '#5B7FFF',
          members: [{ userId: 'u1' }],
        }),
      },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        projectId: 'p1',
        title: '버그',
        sev: 'high',
        prio: 'P1',
        sla: '24h',
        tags: ['infra'],
      },
    });
    expect(r.statusCode).toBe(201);
    expect(createPayload.reporterId).toBe('u1');
    expect(createPayload.projColor).toBe('#5B7FFF');
    expect(createPayload.resolved).toBe(false);
    await app.close();
  });

  it('POST /issues → 잘못된 입력(필수 필드 누락) → 400', async () => {
    const app = await buildTestApp({
      issue: { findMany: async () => [], create: async () => ({}) },
      project: { findFirst: async () => null },
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { title: '제목만' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});

describe('modules/issues — POST /issues/:id/transition', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  function buildAppForTransition(opts: {
    currentStatus: 'open' | 'in_progress' | 'in_review' | 'resolved';
    member: boolean;
    issueExists?: boolean;
    captureUpdate?: { args?: AnyArgs };
    captureComment?: { args?: AnyArgs };
  }) {
    return buildTestApp({
      issue: {
        findMany: async () => [],
        create: async () => ({}),
        findFirst: async () =>
          opts.issueExists === false
            ? null
            : {
                id: 'i1',
                status: opts.currentStatus,
                project: {
                  members: opts.member ? [{ userId: 'u1' }] : [],
                },
              },
        update: async (args: AnyArgs) => {
          if (opts.captureUpdate) opts.captureUpdate.args = args;
          return {
            ...SAMPLE_ISSUE_ROW,
            status: args.data.status,
            resolved: args.data.resolved ?? SAMPLE_ISSUE_ROW.resolved,
          };
        },
      },
      project: { findFirst: async () => null },
      comment: {
        create: async (args: AnyArgs) => {
          if (opts.captureComment) opts.captureComment.args = args;
          return { id: 'c1' };
        },
      },
    });
  }

  it('인증 없으면 401', async () => {
    const app = await buildAppForTransition({ currentStatus: 'open', member: true });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('정상 전이 open → in-progress (200 + 갱신본)', async () => {
    const captureUpdate: { args?: AnyArgs } = {};
    const app = await buildAppForTransition({
      currentStatus: 'open',
      member: true,
      captureUpdate,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(200);
    expect(captureUpdate.args?.data.status).toBe('in_progress');
    await app.close();
  });

  it('resolved 전이 시 resolved=true 플래그 설정', async () => {
    const captureUpdate: { args?: AnyArgs } = {};
    const app = await buildAppForTransition({
      currentStatus: 'in_progress',
      member: true,
      captureUpdate,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'resolved' },
    });
    expect(r.statusCode).toBe(200);
    expect(captureUpdate.args?.data.resolved).toBe(true);
    await app.close();
  });

  it('resolved → in-progress (재오픈 시 resolved=false)', async () => {
    const captureUpdate: { args?: AnyArgs } = {};
    const app = await buildAppForTransition({
      currentStatus: 'resolved',
      member: true,
      captureUpdate,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(200);
    expect(captureUpdate.args?.data.resolved).toBe(false);
    await app.close();
  });

  it('잘못된 전이 open → in-review (정의 없음) → 400', async () => {
    const app = await buildAppForTransition({ currentStatus: 'open', member: true });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'in-review' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('동일 상태로의 전이는 멱등 200', async () => {
    const app = await buildAppForTransition({ currentStatus: 'in_progress', member: true });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(200);
    await app.close();
  });

  it('comment 제공 시 issue Comment 생성', async () => {
    const captureComment: { args?: AnyArgs } = {};
    const app = await buildAppForTransition({
      currentStatus: 'in_progress',
      member: true,
      captureComment,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'in-review', comment: '검수 요청합니다' },
    });
    expect(r.statusCode).toBe(200);
    expect(captureComment.args?.data).toMatchObject({
      body: '검수 요청합니다',
      targetKind: 'issue',
      issueId: 'i1',
      authorId: 'u1',
    });
    await app.close();
  });

  it('멤버 아니면 403', async () => {
    const app = await buildAppForTransition({ currentStatus: 'open', member: false });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u-other')}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('이슈 없으면 404', async () => {
    const app = await buildAppForTransition({
      currentStatus: 'open',
      member: true,
      issueExists: false,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/missing/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('알 수 없는 status 값 → 400', async () => {
    const app = await buildAppForTransition({ currentStatus: 'open', member: true });
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/transition',
      headers: { authorization: `Bearer ${await token('u1')}` },
      payload: { status: 'bogus' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
