import { NextResponse } from 'next/server';
import { ApprovalDecisionSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = ApprovalDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json({
    id,
    title: '',
    requester: '',
    approver: '',
    status: parsed.data.decision,
    decidedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}
