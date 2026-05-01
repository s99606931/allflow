import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { orgRoutes } from './org.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 'b'.repeat(16);

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock 의 prisma 시그니처는 호출부 모양을 신뢰한다.
type AnyArgs = any;

interface InvitationRow {
  id: string;
  email: string;
  orgUnitId: string;
  role: string;
  invitedBy: string;
  pending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function makeInvitationStore() {
  const rows = new Map<string, InvitationRow>();
  let seq = 0;
  return {
    findFirst: async (args: AnyArgs) => {
      const { email, orgUnitId } = args?.where ?? {};
      for (const row of rows.values()) {
        if (row.email === email && row.orgUnitId === orgUnitId) return row;
      }
      return null;
    },
    create: async (args: AnyArgs) => {
      seq += 1;
      const now = new Date();
      const row: InvitationRow = {
        id: `inv-${seq}`,
        email: args.data.email,
        orgUnitId: args.data.orgUnitId,
        role: args.data.role,
        invitedBy: args.data.invitedBy,
        pending: true,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(row.id, row);
      return row;
    },
  };
}

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });
  const store = makeInvitationStore();
  app.decorate('prisma', {
    invitation: {
      findFirst: store.findFirst,
      create: store.create,
    },
  } as never);
  await app.register(authPlugin);
  await app.register(orgRoutes);
  return app;
}

async function makeJws(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

describe('modules/org — BE-N7', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = TEST_AUTH;
  });
  afterAll(() => {
    process.env.AUTH_SECRET = undefined;
    resetEnvForTests();
  });

  it('인증 없으면 401 (GET /org/units)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({ method: 'GET', url: '/org/units' });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('인증 없으면 401 (POST /org/invitations)', async () => {
    const app = await buildTestApp();
    const r = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      payload: { email: 'x@y.z', orgUnitId: 'org-root', role: 'member' },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it('GET → 200 + 시드 OrgUnit 트리 (parentId 포함)', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'GET',
      url: '/org/units',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.statusCode).toBe(200);
    const list = r.json() as Array<{ id: string; parentId: string | null; members: string[] }>;
    expect(list.length).toBeGreaterThanOrEqual(3);
    const ids = list.map((u) => u.id);
    expect(ids).toContain('org-root');
    expect(ids).toContain('org-eng');
    const root = list.find((u) => u.id === 'org-root');
    expect(root?.parentId).toBeNull();
    const eng = list.find((u) => u.id === 'org-eng');
    expect(eng?.parentId).toBe('org-root');
    expect(Array.isArray(eng?.members)).toBe(true);
    await app.close();
  });

  it('POST → 201 + {id, pending:true} 응답', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'newcomer@example.com', orgUnitId: 'org-eng', role: 'engineer' },
    });
    expect(r.statusCode).toBe(201);
    const body = r.json() as { id: string; pending: boolean };
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
    expect(body.pending).toBe(true);
    await app.close();
  });

  it('POST → 동일 (email, orgUnitId) 재초대 시 멱등 200 + 동일 id', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const first = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'dup@example.com', orgUnitId: 'org-root', role: 'member' },
    });
    expect(first.statusCode).toBe(201);
    const firstId = (first.json() as { id: string }).id;

    const second = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'dup@example.com', orgUnitId: 'org-root', role: 'admin' },
    });
    expect(second.statusCode).toBe(200);
    expect((second.json() as { id: string }).id).toBe(firstId);
    expect((second.json() as { pending: boolean }).pending).toBe(true);
    await app.close();
  });

  it('POST → 다른 orgUnitId면 신규 invitation 발급', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const a = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'multi@example.com', orgUnitId: 'org-eng', role: 'engineer' },
    });
    const b = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'multi@example.com', orgUnitId: 'org-design', role: 'designer' },
    });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect((a.json() as { id: string }).id).not.toBe((b.json() as { id: string }).id);
    await app.close();
  });

  it('POST → 잘못된 email 형식 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'not-an-email', orgUnitId: 'org-root', role: 'member' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → 존재하지 않는 orgUnitId 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'x@y.z', orgUnitId: 'org-missing', role: 'member' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → 빈 role 400 (zod min(1))', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'x@y.z', orgUnitId: 'org-root', role: '' },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });

  it('POST → strict zod (extra field) 400', async () => {
    const app = await buildTestApp();
    const token = await makeJws('u1');
    const r = await app.inject({
      method: 'POST',
      url: '/org/invitations',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        email: 'x@y.z',
        orgUnitId: 'org-root',
        role: 'member',
        extraneous: 'evil',
      },
    });
    expect(r.statusCode).toBe(400);
    await app.close();
  });
});
