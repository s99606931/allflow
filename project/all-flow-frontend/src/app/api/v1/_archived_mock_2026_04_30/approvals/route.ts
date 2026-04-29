import { NextResponse } from 'next/server';
import { ApprovalCreateSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = ApprovalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json(
    {
      id: `AP-${Date.now().toString(36)}`,
      ...parsed.data,
      requester: 'me',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
