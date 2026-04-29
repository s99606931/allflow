import { NextResponse } from 'next/server';
import { RevokeTokenSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = RevokeTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json({ id: parsed.data.tokenId, revoked: true });
}
