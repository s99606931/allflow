import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:8080/api/v1';

interface SessionWithToken {
  accessToken?: string;
}

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const session = (await auth()) as SessionWithToken | null;
  const url = new URL(`${BACKEND_URL}/${path.join('/')}`);
  for (const [k, v] of req.nextUrl.searchParams) url.searchParams.set(k, v);

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('content-length');
  if (session?.accessToken) {
    headers.set('authorization', `Bearer ${session.accessToken}`);
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
