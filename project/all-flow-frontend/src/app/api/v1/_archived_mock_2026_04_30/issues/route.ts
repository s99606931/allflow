import { NextResponse } from 'next/server';
import { ISSUES } from '@/lib/fixtures';
import { IssueCreateSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(ISSUES);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = IssueCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json(
    {
      id: `ISS-${Date.now().toString(36)}`,
      ...parsed.data,
      projColor: '#3B82F6',
      status: 'open',
      created: new Date().toISOString(),
      sla: '24h',
      slaPct: 100,
      comments: 0,
      linked: 0,
    },
    { status: 201 },
  );
}
