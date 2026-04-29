/**
 * POST /api/v1/reports/{id}/send
 *
 * Mock backend handler — accepts a list of email recipients and returns
 * the queue id so the UI can show a confirmation toast. The real backend
 * pushes onto the email worker queue.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SendBody {
  recipients?: string[];
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: SendBody = await req.json().catch(() => ({}));
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'no recipients' }, { status: 400 });
  }
  return NextResponse.json({
    queuedId: `q-${Date.now().toString(36)}`,
    reportId: id,
    count: recipients.length,
    queuedAt: new Date().toISOString(),
  });
}
