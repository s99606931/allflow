import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:8080/api/v1';

interface SessionWithToken {
  accessToken?: string;
}

let _devToken: string | null = null;
let _devTokenExpiry = 0;

async function resolveToken(session: SessionWithToken | null): Promise<string | null> {
  if (session?.accessToken) return session.accessToken;
  if (process.env.NODE_ENV === 'production') return null;
  // Dev fallback: auto-login as seed user so the browser works without explicit login.
  if (!_devToken || Date.now() > _devTokenExpiry) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'jiwoo.kim@omelet.com' }),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as { accessToken: string; expiresIn?: number };
        _devToken = data.accessToken;
        _devTokenExpiry = Date.now() + 55 * 60 * 1000;
      }
    } catch {
      // backend not reachable — proceed without token
    }
  }
  return _devToken;
}

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const session = (await auth()) as SessionWithToken | null;
  const token = await resolveToken(session);
  const url = new URL(`${BACKEND_URL}/${path.join('/')}`);
  for (const [k, v] of req.nextUrl.searchParams) url.searchParams.set(k, v);

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    duplex: 'half',
  };

  const upstream = await fetch(url, init);
  const respHeaders = new Headers(upstream.headers);
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
