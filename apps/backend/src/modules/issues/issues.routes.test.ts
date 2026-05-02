import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { issuesRoutes } from './issues.routes.js';

const TEST_AUTH = 'c'.repeat(16) + 'd'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface IssueRow {
  id: string;
  title: string;
  status: string;
  sev: string;
  prio: string;
  projColor: string;
  tags: string[];
  sla: string;
  slaPct: number;
  linked: number;
  resolved: boolean;
  projectId: string;
  reporterId: string;
  assigneeId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectRow {
  id: string;
  color: string;
  name: string;
  deletedAt: Date | null;
  members: { userId: string }[];
}

interface CommentRow {
  id: string;
  body: string;
  targetKind: string;
  issueId: string | null;
  authorId: string;
}

function makeStore() {
  const issues = new Map<string, IssueRow>();
  const projects = new Map<string, ProjectRow>();
  const comments = new Map<string, CommentRow>();
  let seq = 0;

  const defaultProject: ProjectRow = {
    id: 'proj-1',
    color: '#ff0000',
    name: 'Test Project',
    deletedAt: null,
    members: [{ userId: 'u1' }],
  };
  projects.set(defaultProject.id, defaultProject);

  return {
    issues,
    projects,
    comments,
    issue: {
      findMany: async (args: AnyArgs) => {
        const where = args?.where ?? {};
        let list = Array.from(issues.values()).filter((r) => r.deletedAt === null);
        if (where.status) list = list.filter((r) => r.status === where.status);
        if (where.prio) list = list.filter((r) => r.prio === where.prio);
        if (where.project?.members?.some?.userId) {
          const uid = where.project.members.some.userId;
          list = list.filter((r) => {
            const proj = projects.get(r.projectId);
            return proj?.members.some((m) => m.userId === uid);
          });
        }
        return list.map((r) => toIncluded(r));
      },
      findFirst: async (args: AnyArgs) => {
        const id = args?.where?.id;
        const userId = args?.where?.project?.members?.some?.userId ?? args?.select?.project?.members?.where?.userId;
        const row = id ? issues.get(id) : null;
        if (!row || row.deletedAt !== null) return null;
        const proj = projects.get(row.projectId);
        const members = userId ? (proj?.members.filter((m) => m.userId === userId) ?? []) : (proj?.members ?? []);
        return { ...row, project: { members } };
      },
      create: async (args: AnyArgs) => {
        seq += 1;
        const now = new Date(Date.now() + seq);
        const row: IssueRow = {
          id: `issue-${seq}`,
          title: args.data.title,
          status: args.data.status ?? 'open',
          sev: args.data.sev,
          prio: args.data.prio,
          projColor: args.data.projColor,
          tags: args.data.tags ?? [],
          sla: args.data.sla,
          slaPct: args.data.slaPct ?? 0,
          linked: args.data.linked ?? 0,
          resolved: args.data.resolved ?? false,
          projectId: args.data.projectId,
          reporterId: args.data.reporterId,
          assigneeId: args.data.assigneeId ?? null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        issues.set(row.id, row);
        return toIncluded(row);
      },
      update: async (args: AnyArgs) => {
        const cur = issues.get(args.where.id);
        if (!cur) throw new Error('not found');
        const updated: IssueRow = { ...cur, ...args.data, updatedAt: new Date() };
        issues.set(cur.id, updated);
        return toIncluded(updated);
      },
    },
    project: {
      findFirst: async (args: AnyArgs) => {
        const { id, deletedAt } = args?.where ?? {};
        const userId = args?.where?.members?.some?.userId ?? args?.select?.members?.where?.userId;
        const row = id ? projects.get(id) : null;
        if (!row) return null;
        if (deletedAt !== undefined && row.deletedAt !== null) return null;
        const members = userId ? row.members.filter((m) => m.userId === userId) : row.members;
        return { id: row.id, color: row.color, members };
      },
    },
    comment: {
      create: async (args: AnyArgs) => {
        seq += 1;
        const row: CommentRow = {
          id: `cmt-${seq}`,
          body: args.data.body,
          targetKind: args.data.targetKind,
          issueId: args.data.issueId ?? null,
          authorId: args.data.authorId,
        };
        comments.set(row.id, row);
        return row;
      },
    },
    revokedToken: {
      findUnique: async (_args: AnyArgs) => null,
    },
  };

  function toIncluded(row: IssueRow) {
    const proj = projects.get(row.projectId);
    return {
      ...row,
      project: { name: proj?.name ?? '', color: proj?.color ?? '' },
      assignee: row.assigneeId ? { name: `user-${row.assigneeId}` } : null,
      reporter: row.reporterId ? { name: `user-${row.reporterId}` } : null,
      _count: { comments: 0 },
    };
  }
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', store as never);
  await app.register(authPlugin);
  await app.register(issuesRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/issues — T1 Prisma', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /issues)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/issues' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /issues)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      payload: { title: 'x', projectId: 'proj-1', sev: 'high', prio: 'P1', sla: '3d' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /issues/:id/transition)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/issues/issue-1/transition',
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /issues → 200 + 빈 배열', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
    await app.close();
  });

  it('POST /issues → 201 + Issue 반환', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        projectId: 'proj-1',
        title: '로그인 버그',
        sev: 'high',
        prio: 'P1',
        sla: '3d',
      },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json();
    expect(body).toMatchObject({
      title: '로그인 버그',
      sev: 'high',
      prio: 'P1',
      status: 'open',
      sla: '3d',
    });
    expect(typeof body.id).toBe('string');
    expect(typeof body.created).toBe('string');
    await app.close();
  });

  it('POST /issues → GET /issues 에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        projectId: 'proj-1',
        title: '페이지네이션 테스트',
        sev: 'low',
        prio: 'P3',
        sla: '7d',
      },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json() as { id: string };

    const get = await app.inject({
      method: 'GET',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list.some((item) => item.id === created.id)).toBe(true);
    await app.close();
  });

  it('POST /issues → 필수 필드 누락 시 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /issues → title 없으면 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', sev: 'high', prio: 'P1', sla: '3d' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET /issues?status=open 필터', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: 'open issue', sev: 'low', prio: 'P3', sla: '5d' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/issues?status=open',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ status: string }>;
    expect(list.every((item) => item.status === 'open')).toBe(true);
    await app.close();
  });

  it('GET /issues?prio=P0 필터', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: 'P0 크리티컬', sev: 'critical', prio: 'P0', sla: '1d' },
    });
    await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: 'P3 낮음', sev: 'low', prio: 'P3', sla: '7d' },
    });

    const r = await app.inject({
      method: 'GET',
      url: '/issues?prio=P0',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ prio: string }>;
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((item) => item.prio === 'P0')).toBe(true);
    await app.close();
  });

  it('POST /issues/:id/transition open → in-progress', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: '전이 테스트', sev: 'med', prio: 'P2', sla: '2d' },
    });
    const { id } = post.json() as { id: string };

    const r = await app.inject({
      method: 'POST',
      url: `/issues/${id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe('in-progress');
    await app.close();
  });

  it('POST /issues/:id/transition in-progress → resolved, resolved → in-progress (재오픈)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: '재오픈 테스트', sev: 'high', prio: 'P1', sla: '3d' },
    });
    const { id } = post.json() as { id: string };

    await app.inject({
      method: 'POST',
      url: `/issues/${id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'in-progress' },
    });

    const resolvedRes = await app.inject({
      method: 'POST',
      url: `/issues/${id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'resolved' },
    });
    expect(resolvedRes.statusCode).toBe(200);
    expect(resolvedRes.json().status).toBe('resolved');

    const reopenRes = await app.inject({
      method: 'POST',
      url: `/issues/${id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'in-progress', comment: '재오픈 사유: 재현됨' },
    });
    expect(reopenRes.statusCode).toBe(200);
    expect(reopenRes.json().status).toBe('in-progress');
    await app.close();
  });

  it('POST /issues/:id/transition 멱등 (동일 상태) → 200', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: '멱등 테스트', sev: 'low', prio: 'P3', sla: '5d' },
    });
    const { id } = post.json() as { id: string };

    const r = await app.inject({
      method: 'POST',
      url: `/issues/${id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'open' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe('open');
    await app.close();
  });

  it('POST /issues/:id/transition 허용되지 않는 전이 → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: '잘못된 전이', sev: 'low', prio: 'P3', sla: '5d' },
    });
    const { id } = post.json() as { id: string };

    const r = await app.inject({
      method: 'POST',
      url: `/issues/${id}/transition`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'in-review' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /issues/:id/transition 없는 id → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/issues/nonexistent-id/transition',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'in-progress' },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('POST /issues → 존재하지 않는 projectId → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        projectId: 'no-such-project',
        title: '없는 프로젝트',
        sev: 'low',
        prio: 'P3',
        sla: '5d',
      },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /issues/:id → 204 + GET 목록에서 제외 (소프트 삭제)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const post = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId: 'proj-1', title: '삭제될 이슈', sev: 'low', prio: 'P3', sla: '5d' },
    });
    const { id } = post.json() as { id: string };

    const del = await app.inject({
      method: 'DELETE',
      url: `/issues/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({
      method: 'GET',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
    });
    const list = get.json() as Array<{ id: string }>;
    expect(list.some((item) => item.id === id)).toBe(false);
    await app.close();
  });

  it('DELETE /issues/:id → 없는 id → 404', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'DELETE',
      url: '/issues/nonexistent-id',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
  });

  it('DELETE /issues/:id → 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'DELETE', url: '/issues/issue-1' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /issues → 멤버 아닌 사용자 → 403', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u-not-member');
    const r = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        projectId: 'proj-1',
        title: '권한 없음',
        sev: 'low',
        prio: 'P3',
        sla: '5d',
      },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
  });
});
