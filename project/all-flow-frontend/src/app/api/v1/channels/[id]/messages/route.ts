import { NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({ text: z.string().min(1) });

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json(
    { id: `MSG-${Date.now().toString(36)}`, channelId: id },
    { status: 201 },
  );
}
