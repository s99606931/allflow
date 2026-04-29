import { NextResponse } from 'next/server';
import { PROJECTS } from '@/lib/fixtures';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = PROJECTS.find(p => p.id === id);
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(project);
}
