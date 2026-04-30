import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { prompt = '' } = await req.json().catch(() => ({}));
  return NextResponse.json({
    text: `[STUB] ${prompt} 에 대한 응답입니다.`,
  });
}
