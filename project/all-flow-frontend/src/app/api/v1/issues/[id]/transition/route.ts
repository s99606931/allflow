import { NextResponse } from 'next/server';
import { IssueTransitionSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = IssueTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json({
    id,
    title: '',
    proj: '',
    projColor: '#3B82F6',
    sev: 'med',
    prio: 'P2',
    status: parsed.data.status,
    assignee: '',
    reporter: '',
    tags: [],
    created: new Date().toISOString(),
    sla: '24h',
    slaPct: 100,
    comments: 0,
    linked: 0,
  });
}
