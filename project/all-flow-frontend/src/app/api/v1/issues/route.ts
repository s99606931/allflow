import { NextResponse } from 'next/server';
import { ISSUES } from '@/lib/fixtures';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(ISSUES);
}
