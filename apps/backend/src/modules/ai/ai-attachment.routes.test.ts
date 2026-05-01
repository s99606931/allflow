import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { resetEnvForTests } from '../../config/env.js';
import { authPlugin } from '../../plugins/auth.js';
import { rbacPlugin } from '../../plugins/rbac.js';
import { aiAttachmentRoutes } from './ai-attachment.routes.js';

const TEST_AUTH = 'a'.repeat(16) + 't'.repeat(16);

async function buildTestApp() {
  resetEnvForTests();
  process.env.AUTH_SECRET = TEST_AUTH;
  const app = await buildApp({ logger: false });

  await app.register(
    fp(
      async (fastify: FastifyInstance) => {
        fastify.decorate('prisma', {} as never);
      },
      { name: 'prisma' },
    ),
  );
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(aiAttachmentRoutes);
  return app;
}

async function makeToken(sub = 'u1'): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_AUTH));
}

function buildMultipart(filename: string, mimeType: string, content: string): { body: Buffer; boundary: string } {
  const boundary = `----TestBoundary${Date.now()}`;
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${mimeType}`,
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return { body: Buffer.from(body), boundary };
}

describe('modules/ai/ai-attachment.routes', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = TEST_AUTH;
    app = await buildTestApp();
    token = await makeToken('u1');
  });

  afterAll(async () => {
    await app.close();
    resetEnvForTests();
  });

  it('POST /ai/attachments with text/plain → 201 + storageKey + base64', async () => {
    const { body, boundary } = buildMultipart('readme.txt', 'text/plain', 'Hello, World!');

    const r = await app.inject({
      method: 'POST',
      url: '/ai/attachments',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(r.statusCode).toBe(201);
    const resp = r.json() as { storageKey: string; filename: string; mimeType: string; sizeBytes: number; base64: string };
    expect(resp.storageKey).toMatch(/^attach\/.+\/readme\.txt$/);
    expect(resp.mimeType).toBe('text/plain');
    expect(resp.filename).toBe('readme.txt');
    expect(resp.sizeBytes).toBeGreaterThan(0);
    expect(resp.base64).toBeTruthy();
  });

  it('POST /ai/attachments with disallowed MIME → 400', async () => {
    const { body, boundary } = buildMultipart('app.exe', 'application/x-msdownload', 'binary');

    const r = await app.inject({
      method: 'POST',
      url: '/ai/attachments',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(r.statusCode).toBe(400);
  });

  it('POST /ai/attachments without auth → 401', async () => {
    const { body, boundary } = buildMultipart('x.txt', 'text/plain', 'x');

    const r = await app.inject({
      method: 'POST',
      url: '/ai/attachments',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(r.statusCode).toBe(401);
  });

  it('POST /ai/attachments with no file → 400', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/ai/attachments',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'multipart/form-data; boundary=empty',
      },
      payload: Buffer.from('----empty--\r\n'),
    });

    expect(r.statusCode).toBe(400);
  });
});
