import { describe, expect, it } from 'vitest';
import {
  ProjectSchema, IssueSchema, UserSchema, NotificationSchema,
  ReportSchema, ExtractedActionSchema,
} from '@/lib/schemas';
import { z } from 'zod';

// In-process invocation of Next.js Route Handlers — no HTTP, no dev server.
// Each route module exports plain GET/POST functions; we call them with a
// stub Request and assert on the Response shape + Zod schema.

async function jsonOf(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

describe('API: GET /api/v1/users/me', () => {
  it('returns the ME fixture matching UserSchema', async () => {
    const { GET } = await import('@/app/api/v1/users/me/route');
    const res = GET();
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(() => UserSchema.parse(body)).not.toThrow();
  });
});

describe('API: GET /api/v1/projects', () => {
  it('returns an array of Projects', async () => {
    const { GET } = await import('@/app/api/v1/projects/route');
    const res = GET();
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(() => z.array(ProjectSchema).parse(body)).not.toThrow();
  });
});

describe('API: POST /api/v1/projects', () => {
  it('echoes input + assigns defaults', async () => {
    const { POST } = await import('@/app/api/v1/projects/route');
    const res = await POST(new Request('http://test/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '신규', code: 'NEW' }),
    }));
    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.id).toBe('PRJ-NEW');
    expect(body.name).toBe('신규');
    expect(body.progress).toBe(0);
  });
});

describe('API: GET /api/v1/projects/[id]', () => {
  it('returns the project for a known id', async () => {
    const { GET } = await import('@/app/api/v1/projects/[id]/route');
    const res = await GET(
      new Request('http://test/api/v1/projects/p1'),
      { params: Promise.resolve({ id: 'p1' }) },
    );
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.id).toBe('p1');
    expect(() => ProjectSchema.parse(body)).not.toThrow();
  });

  it('returns 404 for unknown id', async () => {
    const { GET } = await import('@/app/api/v1/projects/[id]/route');
    const res = await GET(
      new Request('http://test/api/v1/projects/zzz'),
      { params: Promise.resolve({ id: 'zzz' }) },
    );
    expect(res.status).toBe(404);
  });
});

describe('API: GET /api/v1/tasks', () => {
  it('returns all tasks when no filter', async () => {
    const { GET } = await import('@/app/api/v1/tasks/route');
    const res = GET(new Request('http://test/api/v1/tasks'));
    const body = await jsonOf(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('filters by projectId', async () => {
    const { GET } = await import('@/app/api/v1/tasks/route');
    const res = GET(new Request('http://test/api/v1/tasks?projectId=p1'));
    const body = await jsonOf(res);
    expect(body.every((t: { proj: string }) => t.proj === 'p1')).toBe(true);
  });
});

describe('API: PATCH /api/v1/tasks/[id]', () => {
  it('echoes the patch with the id', async () => {
    const { PATCH } = await import('@/app/api/v1/tasks/[id]/route');
    const res = await PATCH(
      new Request('http://test/api/v1/tasks/t1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
      { params: Promise.resolve({ id: 't1' }) },
    );
    const body = await jsonOf(res);
    expect(body.id).toBe('t1');
    expect(body.status).toBe('done');
  });
});

describe('API: GET /api/v1/issues', () => {
  it('returns an array of Issues', async () => {
    const { GET } = await import('@/app/api/v1/issues/route');
    const res = GET();
    const body = await jsonOf(res);
    expect(Array.isArray(body)).toBe(true);
    expect(() => z.array(IssueSchema).parse(body)).not.toThrow();
  });
});

describe('API: GET /api/v1/notifications', () => {
  it('returns 3 notifications matching schema', async () => {
    const { GET } = await import('@/app/api/v1/notifications/route');
    const res = GET();
    const body = await jsonOf(res);
    expect(body).toHaveLength(3);
    expect(() => z.array(NotificationSchema).parse(body)).not.toThrow();
  });
});

describe('API: POST /api/v1/reports/weekly', () => {
  it('returns a Report matching schema', async () => {
    const { POST } = await import('@/app/api/v1/reports/weekly/route');
    const res = await POST(new Request('http://test/api/v1/reports/weekly', {
      method: 'POST',
      body: JSON.stringify({ periodStart: '2026-04-22', periodEnd: '2026-04-28' }),
    }));
    const body = await jsonOf(res);
    expect(body.kind).toBe('weekly');
    expect(body.kpis).toHaveLength(4);
    expect(() => ReportSchema.parse(body)).not.toThrow();
  });
});

describe('API: POST /api/v1/ai/complete', () => {
  it('echoes prompt as text', async () => {
    const { POST } = await import('@/app/api/v1/ai/complete/route');
    const res = await POST(new Request('http://test/api/v1/ai/complete', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hello' }),
    }));
    const body = await jsonOf(res);
    expect(typeof body.text).toBe('string');
    expect(body.text).toContain('hello');
  });
});

describe('API: POST /api/v1/ai/extract-actions', () => {
  it('returns 4 extracted actions matching schema', async () => {
    const { POST } = await import('@/app/api/v1/ai/extract-actions/route');
    const res = await POST(new Request('http://test/api/v1/ai/extract-actions', {
      method: 'POST',
      body: JSON.stringify({}),
    }));
    const body = await jsonOf(res);
    expect(body).toHaveLength(4);
    expect(() => z.array(ExtractedActionSchema).parse(body)).not.toThrow();
  });
});
