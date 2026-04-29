import { NextResponse } from 'next/server';
import { DocCreateSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = DocCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json(
    {
      id: `DOC-${Date.now().toString(36)}`,
      title: parsed.data.title,
      ownerId: 'me',
      updatedAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
