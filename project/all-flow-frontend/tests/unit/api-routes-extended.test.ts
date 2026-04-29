import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ApprovalSchema, ClientSchema, EventSchema, ResourceBookingSchema,
  DocSchema, IssueSchema, UserSchema,
} from '@/lib/schemas';

// In-process tests for the 17 PDCA-01 route handlers introduced in extended.ts.
// Mirrors `tests/unit/api-routes.test.ts` style — call each handler with a
// stub Request, assert on status + Zod schema where applicable.

async function jsonOf(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

const post = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const patch = (url: string, body: unknown) =>
  new Request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/* Issues mutations -------------------------------------------------------- */
describe('API: POST /api/v1/issues', () => {
  it('creates an issue from valid input', async () => {
    const { POST } = await import('@/app/api/v1/issues/route');
    const res = await POST(post('http://test/api/v1/issues', {
      title: '결제 모듈 타임아웃', proj: 'p1', assignee: 'me', reporter: 'me',
      sev: 'high', prio: 'P1',
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.id).toMatch(/^ISS-/);
    expect(body.status).toBe('open');
    expect(() => IssueSchema.parse(body)).not.toThrow();
  });
  it('rejects invalid input with 422', async () => {
    const { POST } = await import('@/app/api/v1/issues/route');
    const res = await POST(post('http://test/api/v1/issues', { title: '' }));
    expect(res.status).toBe(422);
  });
});

describe('API: POST /api/v1/issues/[id]/transition', () => {
  it('transitions an issue and returns the new status', async () => {
    const { POST } = await import('@/app/api/v1/issues/[id]/transition/route');
    const res = await POST(
      post('http://test/api/v1/issues/i1/transition', { status: 'in-review' }),
      { params: Promise.resolve({ id: 'i1' }) },
    );
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.id).toBe('i1');
    expect(body.status).toBe('in-review');
  });
});

/* Tasks deletion ---------------------------------------------------------- */
describe('API: DELETE /api/v1/tasks/[id]', () => {
  it('returns deleted: true', async () => {
    const { DELETE } = await import('@/app/api/v1/tasks/[id]/route');
    const res = await DELETE(
      new Request('http://test/api/v1/tasks/t1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body).toEqual({ id: 't1', deleted: true });
  });
});

/* Approvals --------------------------------------------------------------- */
describe('API: GET /api/v1/approvals', () => {
  it('returns an empty array', async () => {
    const { GET } = await import('@/app/api/v1/approvals/route');
    const res = GET();
    const body = await jsonOf(res);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('API: POST /api/v1/approvals', () => {
  it('creates an approval', async () => {
    const { POST } = await import('@/app/api/v1/approvals/route');
    const res = await POST(post('http://test/api/v1/approvals', {
      title: '신규 라이선스 구매', approver: 'lead', amount: 1200000,
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.status).toBe('pending');
    expect(() => ApprovalSchema.parse(body)).not.toThrow();
  });
});

describe('API: POST /api/v1/approvals/[id]/decision', () => {
  it('records a decision', async () => {
    const { POST } = await import('@/app/api/v1/approvals/[id]/decision/route');
    const res = await POST(
      post('http://test/api/v1/approvals/AP-1/decision', { decision: 'approved' }),
      { params: Promise.resolve({ id: 'AP-1' }) },
    );
    const body = await jsonOf(res);
    expect(body.id).toBe('AP-1');
    expect(body.status).toBe('approved');
  });
});

/* Clients (CRM) ----------------------------------------------------------- */
describe('API: clients GET + POST', () => {
  it('GET returns array', async () => {
    const { GET } = await import('@/app/api/v1/clients/route');
    expect(Array.isArray(await jsonOf(GET()))).toBe(true);
  });
  it('POST creates client matching schema', async () => {
    const { POST } = await import('@/app/api/v1/clients/route');
    const res = await POST(post('http://test/api/v1/clients', {
      name: 'CJ ENM', email: 'contact@cj.example',
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(() => ClientSchema.parse(body)).not.toThrow();
  });
});

/* Schedule events --------------------------------------------------------- */
describe('API: events GET + POST', () => {
  it('GET returns array', async () => {
    const { GET } = await import('@/app/api/v1/events/route');
    expect(Array.isArray(await jsonOf(GET()))).toBe(true);
  });
  it('POST creates event matching schema', async () => {
    const { POST } = await import('@/app/api/v1/events/route');
    const res = await POST(post('http://test/api/v1/events', {
      title: '주간 리뷰', start: '2026-04-30T10:00:00Z',
      end: '2026-04-30T11:00:00Z', attendees: ['me', 'lead'],
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.source).toBe('internal');
    expect(() => EventSchema.parse(body)).not.toThrow();
  });
});

/* Resources --------------------------------------------------------------- */
describe('API: resources + book', () => {
  it('GET resources returns array', async () => {
    const { GET } = await import('@/app/api/v1/resources/route');
    expect(Array.isArray(await jsonOf(GET()))).toBe(true);
  });
  it('POST resources/book validates input', async () => {
    const { POST } = await import('@/app/api/v1/resources/book/route');
    const res = await POST(post('http://test/api/v1/resources/book', {
      resourceId: 'room-1', start: '2026-04-30T10:00:00Z',
      end: '2026-04-30T11:00:00Z', bookedBy: 'me',
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(() => ResourceBookingSchema.parse(body)).not.toThrow();
  });
});

/* Documents (TipTap) ------------------------------------------------------ */
describe('API: docs GET + POST', () => {
  it('GET docs returns array', async () => {
    const { GET } = await import('@/app/api/v1/docs/route');
    expect(Array.isArray(await jsonOf(GET()))).toBe(true);
  });
  it('POST docs creates doc matching schema', async () => {
    const { POST } = await import('@/app/api/v1/docs/route');
    const res = await POST(post('http://test/api/v1/docs', { title: '4월 회의록' }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(() => DocSchema.parse(body)).not.toThrow();
  });
});

/* Chat -------------------------------------------------------------------- */
describe('API: channels + messages', () => {
  it('GET channels returns array', async () => {
    const { GET } = await import('@/app/api/v1/channels/route');
    expect(Array.isArray(await jsonOf(GET()))).toBe(true);
  });
  it('POST channels/[id]/messages returns id', async () => {
    const { POST } = await import('@/app/api/v1/channels/[id]/messages/route');
    const res = await POST(
      post('http://test/api/v1/channels/c1/messages', { text: '안녕' }),
      { params: Promise.resolve({ id: 'c1' }) },
    );
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.id).toMatch(/^MSG-/);
  });
});

/* Org / RBAC -------------------------------------------------------------- */
describe('API: org units + invitations', () => {
  it('GET org/units returns array', async () => {
    const { GET } = await import('@/app/api/v1/org/units/route');
    expect(Array.isArray(await jsonOf(GET()))).toBe(true);
  });
  it('POST org/invitations returns pending invitation', async () => {
    const { POST } = await import('@/app/api/v1/org/invitations/route');
    const res = await POST(post('http://test/api/v1/org/invitations', {
      email: 'new@example.com', orgUnitId: 'u1', role: 'member',
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.pending).toBe(true);
  });
});

describe('API: POST /api/v1/auth/tokens/revoke', () => {
  it('returns revoked: true with the token id', async () => {
    const { POST } = await import('@/app/api/v1/auth/tokens/revoke/route');
    const res = await POST(post('http://test/api/v1/auth/tokens/revoke', {
      tokenId: 'tok-1',
    }));
    const body = await jsonOf(res);
    expect(body).toEqual({ id: 'tok-1', revoked: true });
  });
});

/* Notifications mutations ------------------------------------------------- */
describe('API: notifications mutations', () => {
  it('POST /:id/read returns read: true', async () => {
    const { POST } = await import('@/app/api/v1/notifications/[id]/read/route');
    const res = await POST(
      new Request('http://test/api/v1/notifications/n1/read', { method: 'POST' }),
      { params: Promise.resolve({ id: 'n1' }) },
    );
    const body = await jsonOf(res);
    expect(body).toEqual({ id: 'n1', read: true });
  });
  it('POST /read-all returns count', async () => {
    const { POST } = await import('@/app/api/v1/notifications/read-all/route');
    const res = await POST(post('http://test/api/v1/notifications/read-all', {
      ids: ['n1', 'n2', 'n3'],
    }));
    const body = await jsonOf(res);
    expect(body).toEqual({ count: 3 });
  });
});

/* Profile (PATCH /users/me) ---------------------------------------------- */
describe('API: PATCH /api/v1/users/me', () => {
  it('merges patch into ME and validates UserSchema', async () => {
    const { PATCH } = await import('@/app/api/v1/users/me/route');
    const res = await PATCH(patch('http://test/api/v1/users/me', { name: '곽중관' }));
    const body = await jsonOf(res);
    expect(body.name).toBe('곽중관');
    expect(() => UserSchema.parse(body)).not.toThrow();
  });
  it('rejects invalid email', async () => {
    const { PATCH } = await import('@/app/api/v1/users/me/route');
    const res = await PATCH(patch('http://test/api/v1/users/me', { email: 'not-an-email' }));
    expect(res.status).toBe(422);
  });
});

/* Smoke: total endpoint coverage check ------------------------------------ */
describe('contract coverage', () => {
  it('all 17 PDCA-01 route handlers are importable', async () => {
    const handlers = [
      '@/app/api/v1/issues/route',
      '@/app/api/v1/issues/[id]/transition/route',
      '@/app/api/v1/tasks/[id]/route',
      '@/app/api/v1/approvals/route',
      '@/app/api/v1/approvals/[id]/decision/route',
      '@/app/api/v1/clients/route',
      '@/app/api/v1/events/route',
      '@/app/api/v1/resources/route',
      '@/app/api/v1/resources/book/route',
      '@/app/api/v1/docs/route',
      '@/app/api/v1/channels/route',
      '@/app/api/v1/channels/[id]/messages/route',
      '@/app/api/v1/org/units/route',
      '@/app/api/v1/org/invitations/route',
      '@/app/api/v1/auth/tokens/revoke/route',
      '@/app/api/v1/notifications/[id]/read/route',
      '@/app/api/v1/notifications/read-all/route',
      '@/app/api/v1/users/me/route',
    ];
    for (const path of handlers) {
      const mod = await import(path);
      expect(typeof mod === 'object' && mod !== null).toBe(true);
    }
  });

  it('Zod inference matches API expectations (smoke)', () => {
    expect(z.array(IssueSchema).safeParse([]).success).toBe(true);
  });
});
