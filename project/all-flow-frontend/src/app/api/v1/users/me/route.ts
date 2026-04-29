import { NextResponse } from 'next/server';
import { ME } from '@/lib/fixtures';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(ME);
}
