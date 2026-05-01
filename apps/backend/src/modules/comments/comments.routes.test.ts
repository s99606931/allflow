import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { commentsRoutes } from './comments.routes.js';

const TEST_AUTH = 'e'.repeat(16) + 'f'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface CommentRow {
  id: string;
  body: string;
  targetKind: string;
  taskId: string | null;
  issueId: string | null;
  authorId: string;
  deletedAt: Date | null;
  createdAt: Date;
  author: { id: string; name: string };
}

interface MemberParent {
  project: { members: { userId: string }[] };
}

function makeStore() {
  const comments = new Map<string, CommentRow>();
  let seq = 0;

  return {
    comments,
    task: {
      findFirst: async (_args: AnyArgs): Promise<MemberParent | null> => ({
        project: { members: [{ userId: 'u1' }] },
      }),
    },
    issue: {
      findFirst: async (_args: AnyArgs): Promise<MemberParent | null> => ({
        project: { members: [{ userId: 'u1' }] },
      }),
    },
    comment: {
      findMany: async (args: AnyArgs): Promise<CommentRow[]> => {
        let list = Array.from(comments.values()).filter((r) => r.deletedAt === null);
        if (args?.where?.taskId) list = list.filter((r) => r.taskId === args.where.taskId);
        if (args?.where?.issueId) list = list.filter((r) => r.issueId === args.where.issueId);
        return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
      create: async (args: AnyArgs): Promise<CommentRow> => {
        seq += 1;
        const now = new Date(Date.now() + seq);
        const row: CommentRow = {
          id: `cmt-${seq}`,
          body: args.data.body as string,
          targetKind: args.data.targetKind as string,
          taskId: (args.data.taskId as string | undefined) ?? null,
          issueId: (args.data.issueId as string | undefined) ?? null,
          authorId: args.data.authorId as string,
          deletedAt: null,
          createdAt: now,
          author: { id: args.data.authorId as string, name: '테스터' },
        };
        comments.set(row.id, row);
        return row;
      },
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeStore();
  app.decorate('prisma', {
    task: store.task,
    issue: store.issue,
    comment: store.comment,
  } as never);
  await app.register(authPlugin);
  await app.register(commentsRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/comments routes — T2 Prisma (buildApp + decorate)', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('GET /tasks/:id/comments — 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/tasks/t1/comments' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /tasks/:id/comments — 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      payload: { body: 'hello' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET /issues/:id/comments — 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/issues/i1/comments' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /issues/:id/comments — 인증 없으면 401', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/comments',
      payload: { body: 'hello' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('POST /tasks/:id/comments → 201 + comment 반환, GET 에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');

    const post = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${token}` },
      payload: { body: '작업 확인했습니다' },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json() as { id: string; body: string; author: { id: string }; createdAt: string };
    expect(created.body).toBe('작업 확인했습니다');
    expect(created.author.id).toBe('u1');
    expect(typeof created.id).toBe('string');
    expect(typeof created.createdAt).toBe('string');

    const get = await app.inject({
      method: 'GET',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((c) => c.id === created.id)).toBe(true);
    await app.close();
  });

  it('POST /issues/:id/comments → 201 + comment 반환, GET 에 포함', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');

    const post = await app.inject({
      method: 'POST',
      url: '/issues/i1/comments',
      headers: { authorization: `Bearer ${token}` },
      payload: { body: '이슈 재현 확인' },
    });
    expect(post.statusCode).toBe(201);
    const created = post.json() as { id: string; body: string; author: { id: string }; createdAt: string };
    expect(created.body).toBe('이슈 재현 확인');
    expect(created.author.id).toBe('u1');

    const get = await app.inject({
      method: 'GET',
      url: '/issues/i1/comments',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    const list = get.json() as Array<{ id: string }>;
    expect(list.some((c) => c.id === created.id)).toBe(true);
    await app.close();
  });

  it('POST /tasks/:id/comments — 빈 body → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${token}` },
      payload: { body: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /issues/:id/comments — 빈 body → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/issues/i1/comments',
      headers: { authorization: `Bearer ${token}` },
      payload: { body: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST /tasks/:id/comments — body 누락 → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('GET /tasks/:id/comments — task 없으면 404', async () => {
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
    const app = await buildApp({ logger: false });
    app.decorate('prisma', {
      task: { findFirst: async (_args: AnyArgs) => null },
      issue: { findFirst: async (_args: AnyArgs) => null },
      comment: {
        findMany: async () => [],
        create: async () => ({}),
      },
    } as never);
    await app.register(authPlugin);
    await app.register(commentsRoutes);

    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/no-such-task/comments',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
  });

  it('GET /issues/:id/comments — issue 없으면 404', async () => {
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
    const app = await buildApp({ logger: false });
    app.decorate('prisma', {
      task: { findFirst: async (_args: AnyArgs) => null },
      issue: { findFirst: async (_args: AnyArgs) => null },
      comment: {
        findMany: async () => [],
        create: async () => ({}),
      },
    } as never);
    await app.register(authPlugin);
    await app.register(commentsRoutes);

    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/issues/no-such-issue/comments',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(404);
    await app.close();
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
  });

  it('GET /tasks/:id/comments — 프로젝트 멤버 아니면 403', async () => {
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
    const app = await buildApp({ logger: false });
    app.decorate('prisma', {
      task: {
        findFirst: async (_args: AnyArgs) => ({ project: { members: [] } }),
      },
      issue: { findFirst: async (_args: AnyArgs) => null },
      comment: {
        findMany: async () => [],
        create: async () => ({}),
      },
    } as never);
    await app.register(authPlugin);
    await app.register(commentsRoutes);

    const token = await makeJws('u-outsider');
    const r = await app.inject({
      method: 'GET',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
  });

  it('GET /issues/:id/comments — 프로젝트 멤버 아니면 403', async () => {
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
    const app = await buildApp({ logger: false });
    app.decorate('prisma', {
      task: { findFirst: async (_args: AnyArgs) => null },
      issue: {
        findFirst: async (_args: AnyArgs) => ({ project: { members: [] } }),
      },
      comment: {
        findMany: async () => [],
        create: async () => ({}),
      },
    } as never);
    await app.register(authPlugin);
    await app.register(commentsRoutes);

    const token = await makeJws('u-outsider');
    const r = await app.inject({
      method: 'GET',
      url: '/issues/i1/comments',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(403);
    await app.close();
    resetEnvForTests();
    process.env.AUTH_SECRET = TEST_AUTH;
  });

  it('POST /tasks/:id/comments — body 4001자 초과 → 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/tasks/t1/comments',
      headers: { authorization: `Bearer ${token}` },
      payload: { body: 'x'.repeat(4001) },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
