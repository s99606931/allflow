import { NextResponse } from 'next/server';
import { ME } from '@/lib/fixtures';
import { ProfilePatchSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(ME);
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = ProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json({ ...ME, ...parsed.data });
}
