import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const now = new Date().toISOString();
  return NextResponse.json([
    { id: 'n1', kind: 'mention', title: '@김민수 - 디자인 검토 요청', time: now, read: false },
    { id: 'n2', kind: 'sla', title: 'BUG-204 SLA 임박 (2시간 남음)', time: now, read: false },
    { id: 'n3', kind: 'ai', title: 'AI: 회의록에서 4개 액션 아이템 추출', time: now, read: true },
  ]);
}
