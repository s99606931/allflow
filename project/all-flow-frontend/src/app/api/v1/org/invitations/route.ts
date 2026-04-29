import { NextResponse } from 'next/server';
import { InviteUserSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = InviteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json(
    { id: `INV-${Date.now().toString(36)}`, pending: true },
    { status: 201 },
  );
}
