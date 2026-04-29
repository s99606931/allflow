import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  return NextResponse.json({ id, ...patch });
}
