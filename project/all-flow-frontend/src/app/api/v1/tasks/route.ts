import { NextResponse } from 'next/server';
import { TASKS } from '@/lib/fixtures';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const assigneeId = url.searchParams.get('assigneeId');
  const filtered = TASKS.filter(t =>
    (!projectId || t.proj === projectId) &&
    (!assigneeId || t.assignee === assigneeId),
  );
  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  const input = await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      id: 'TASK-NEW',
      status: 'todo',
      tags: [],
      due: '',
      priority: 'med',
      ...input,
    },
    { status: 201 },
  );
}
