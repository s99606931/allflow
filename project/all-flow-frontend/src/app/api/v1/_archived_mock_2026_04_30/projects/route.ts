import { NextResponse } from 'next/server';
import { PROJECTS } from '@/lib/fixtures';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(PROJECTS);
}

export async function POST(req: Request) {
  const input = await req.json().catch(() => ({}));
  return NextResponse.json(
    {
      ...input,
      id: 'PRJ-NEW',
      color: input.color ?? '#3B82F6',
      progress: 0,
      status: 'todo',
      due: input.due ?? '',
      members: [],
      tasks: { total: 0, done: 0 },
    },
    { status: 201 },
  );
}
