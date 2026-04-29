import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { AIAdapterRegistry, InMemoryAIAdapter } from '../ai/ai-adapter.js';
import { reportsRoutes } from './reports.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

interface PrismaMock {
  projectMember: {
    findMany(args: unknown): Promise<{ projectId: string }[]>;
    findUnique(args: unknown): Promise<unknown>;
  };
  task: { findMany(args: unknown): Promise<unknown[]> };
  issue: { findMany(args: unknown): Promise<unknown[]> };
  report: {
    create(args: unknown): Promise<ReportRow>;
    findFirst?(args: unknown): Promise<unknown>;
  };
}

interface ReportRow {
  id: string;
  kind: 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  tldr: string | null;
  kpis: unknown;
  sections: unknown;
}

function makePrisma(opts: {
  members?: string[];
  tasks?: ReportTaskFixture[];
  issues?: ReportIssueFixture[];
  reportFindFirst?: (args: unknown) => Promise<unknown>;
}): PrismaMock {
  const reports: ReportRow[] = [];
  return {
    projectMember: {
      findMany: async (args: unknown) => {
        const where = (args as { where: { projectId?: { in: string[] } } }).where;
        const ids = opts.members ?? [];
        if (where.projectId?.in) {
          return where.projectId.in
            .filter((id) => ids.includes(id))
            .map((id) => ({ projectId: id }));
        }
        return ids.map((id) => ({ projectId: id }));
      },
      findUnique: async () => null,
    },
    task: { findMany: async () => opts.tasks ?? [] },
    issue: { findMany: async () => opts.issues ?? [] },
    report: {
      create: async (args: unknown) => {
        const data = (args as { data: ReportCreateData }).data;
        const row: ReportRow = {
          id: `rep_${reports.length + 1}`,
          kind: data.kind,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          generatedAt: new Date('2026-04-28T12:00:00Z'),
          tldr: data.tldr ?? '',
          kpis: data.kpis,
          sections: data.sections,
        };
        reports.push(row);
        return row;
      },
      findFirst: opts.reportFindFirst,
    },
  };
}

interface ReportCreateData {
  kind: 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  authorId: string;
  tldr?: string;
  kpis: unknown;
  sections: unknown;
}

interface ReportTaskFixture {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  priority: 'high' | 'med' | 'low';
  projectId: string;
  updatedAt: Date;
  createdAt: Date;
}

interface ReportIssueFixture {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'in_review' | 'resolved';
  prio: 'P0' | 'P1' | 'P2' | 'P3';
  sev: 'critical' | 'high' | 'med' | 'low';
  resolved: boolean;
  projectId: string;
  updatedAt: Date;
  createdAt: Date;
}

function makePrismaPlugin(mock: PrismaMock) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate('prisma', mock as never);
    },
    { name: 'prisma' },
  );
}

async function buildTestApp(opts: {
  members?: string[];
  tasks?: ReportTaskFixture[];
  issues?: ReportIssueFixture[];
  cannedAI?: Record<string, string>;
  reportFindFirst?: (args: unknown) => Promise<unknown>;
}) {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const reg = new AIAdapterRegistry();
  reg.register(new InMemoryAIAdapter(opts.cannedAI ?? {}), true);
  const app = await buildApp({ logger: false });
  await app.register(makePrismaPlugin(makePrisma(opts)));
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(reportsRoutes, { registry: reg });
  return app;
}

async function token(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

const fixtureTasks: ReportTaskFixture[] = [
  {
    id: 't1',
    title: '디자인 검토',
    status: 'done',
    priority: 'high',
    projectId: 'p1',
    updatedAt: new Date('2026-04-25T10:00:00Z'),
    createdAt: new Date('2026-04-20T10:00:00Z'),
  },
  {
    id: 't2',
    title: 'API 구현',
    status: 'doing',
    priority: 'med',
    projectId: 'p1',
    updatedAt: new Date('2026-04-26T10:00:00Z'),
    createdAt: new Date('2026-04-21T10:00:00Z'),
  },
  {
    id: 't3',
    title: 'QA',
    status: 'todo',
    priority: 'low',
    projectId: 'p1',
    updatedAt: new Date('2026-04-27T10:00:00Z'),
    createdAt: new Date('2026-04-22T10:00:00Z'),
  },
];

const fixtureIssues: ReportIssueFixture[] = [
  {
    id: 'i1',
    title: '로그인 실패',
    status: 'resolved',
    prio: 'P1',
    sev: 'high',
    resolved: true,
    projectId: 'p1',
    updatedAt: new Date('2026-04-25T10:00:00Z'),
    createdAt: new Date('2026-04-20T10:00:00Z'),
  },
  {
    id: 'i2',
    title: 'DB 락',
    status: 'open',
    prio: 'P0',
    sev: 'critical',
    resolved: false,
    projectId: 'p1',
    updatedAt: new Date('2026-04-26T10:00:00Z'),
    createdAt: new Date('2026-04-21T10:00:00Z'),
  },
];

describe('modules/reports/reports.routes', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('POST /reports/weekly → 200 + kpis≥3 + sections≥3 + citations 추출', async () => {
    const app = await buildTestApp({
      members: ['p1'],
      tasks: fixtureTasks,
      issues: fixtureIssues,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/reports/weekly',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        periodStart: '2026-04-21',
        periodEnd: '2026-04-27',
        scopeIds: ['p1'],
        tone: 'team',
      },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      id: string;
      kind: string;
      kpis: unknown[];
      sections: { heading: string; body: string; citations: unknown[] }[];
      tldr: string;
    };
    expect(body.kind).toBe('weekly');
    expect(body.kpis.length).toBeGreaterThanOrEqual(3);
    expect(body.sections.length).toBeGreaterThanOrEqual(3);
    // InMemoryAdapter echoes the prompt → 본문에 [task:t1]/[issue:i2] 마커 포함됨
    const allCitations = body.sections.flatMap((s) => s.citations);
    expect(allCitations.length).toBeGreaterThan(0);
    expect(body.tldr).toContain('주간');
    await app.close();
  });

  it('POST /reports/weekly → 비멤버 프로젝트 403', async () => {
    const app = await buildTestApp({ members: [], tasks: [], issues: [] });
    const r = await app.inject({
      method: 'POST',
      url: '/reports/weekly',
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        periodStart: '2026-04-21',
        periodEnd: '2026-04-27',
        scopeIds: ['p-other'],
      },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });

  it('POST /reports/weekly → 잘못된 입력 400', async () => {
    const app = await buildTestApp({ members: ['p1'] });
    const r = await app.inject({
      method: 'POST',
      url: '/reports/weekly',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { periodStart: 'bad', periodEnd: '2026-04-27', scopeIds: ['p1'] },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /reports/monthly → 200 + kpis≥3 + sections≥3 + Executive Summary 헤딩', async () => {
    const app = await buildTestApp({
      members: ['p1'],
      tasks: fixtureTasks,
      issues: fixtureIssues,
    });
    const r = await app.inject({
      method: 'POST',
      url: '/reports/monthly',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { year: 2026, month: 4, tone: 'exec' },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as {
      kind: string;
      periodStart: string;
      periodEnd: string;
      kpis: unknown[];
      sections: { heading: string }[];
      tldr: string;
    };
    expect(body.kind).toBe('monthly');
    expect(body.periodStart).toBe('2026-04-01');
    expect(body.periodEnd).toBe('2026-04-30');
    expect(body.kpis.length).toBeGreaterThanOrEqual(3);
    expect(body.sections.length).toBeGreaterThanOrEqual(3);
    expect(body.sections.map((s) => s.heading)).toContain('Executive Summary');
    expect(body.sections.map((s) => s.heading)).toContain('OKR 진척도');
    expect(body.sections.map((s) => s.heading)).toContain('리스크 매트릭스');
    expect(body.tldr).toContain('월간');
    await app.close();
  });

  it('POST /reports/monthly → 잘못된 month 400', async () => {
    const app = await buildTestApp({ members: ['p1'] });
    const r = await app.inject({
      method: 'POST',
      url: '/reports/monthly',
      headers: { authorization: `Bearer ${await token()}` },
      payload: { year: 2026, month: 13 },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /reports/weekly → 인증 없으면 401', async () => {
    const app = await buildTestApp({ members: ['p1'] });
    const r = await app.inject({
      method: 'POST',
      url: '/reports/weekly',
      payload: { periodStart: '2026-04-21', periodEnd: '2026-04-27', scopeIds: ['p1'] },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  describe('POST /reports/:id/send', () => {
    function buildSendApp(opts: { reportExists: boolean }) {
      return buildTestApp({
        members: ['p1'],
        reportFindFirst: async () =>
          opts.reportExists ? { id: 'r1', kind: 'weekly' } : null,
      });
    }

    it('인증 없으면 401', async () => {
      const app = await buildSendApp({ reportExists: true });
      const r = await app.inject({
        method: 'POST',
        url: '/reports/r1/send',
        payload: { recipients: ['a@b.co'] },
      });
      expect(r.statusCode).toBe(401);
      await app.close();
    });

    it('정상: queued + recipients 응답', async () => {
      const app = await buildSendApp({ reportExists: true });
      const r = await app.inject({
        method: 'POST',
        url: '/reports/r1/send',
        headers: { authorization: `Bearer ${await token()}` },
        payload: { recipients: ['a@b.co', 'c@d.co'] },
      });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { queued: number; recipients: string[] };
      expect(body.queued).toBe(2);
      expect(body.recipients).toEqual(['a@b.co', 'c@d.co']);
      await app.close();
    });

    it('빈 recipients → 400', async () => {
      const app = await buildSendApp({ reportExists: true });
      const r = await app.inject({
        method: 'POST',
        url: '/reports/r1/send',
        headers: { authorization: `Bearer ${await token()}` },
        payload: { recipients: [] },
      });
      expect(r.statusCode).toBe(400);
      await app.close();
    });

    it('잘못된 이메일 형식 → 400', async () => {
      const app = await buildSendApp({ reportExists: true });
      const r = await app.inject({
        method: 'POST',
        url: '/reports/r1/send',
        headers: { authorization: `Bearer ${await token()}` },
        payload: { recipients: ['not-an-email'] },
      });
      expect(r.statusCode).toBe(400);
      await app.close();
    });

    it('알 수 없는 필드 (strict) → 400', async () => {
      const app = await buildSendApp({ reportExists: true });
      const r = await app.inject({
        method: 'POST',
        url: '/reports/r1/send',
        headers: { authorization: `Bearer ${await token()}` },
        payload: { recipients: ['a@b.co'], extra: 'nope' },
      });
      expect(r.statusCode).toBe(400);
      await app.close();
    });

    it('리포트 없으면 400 (Report not found)', async () => {
      const app = await buildSendApp({ reportExists: false });
      const r = await app.inject({
        method: 'POST',
        url: '/reports/missing/send',
        headers: { authorization: `Bearer ${await token()}` },
        payload: { recipients: ['a@b.co'] },
      });
      expect(r.statusCode).toBe(400);
      await app.close();
    });
  });
});
