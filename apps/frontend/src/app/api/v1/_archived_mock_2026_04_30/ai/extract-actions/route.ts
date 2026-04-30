import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request) {
  return NextResponse.json([
    { title: 'CJ ENM 1차 검수 보고서 작성', assignee: '이서연', due: '2026-04-30', priority: 'high', confidence: 0.94, sourceQuote: '서연님이 다음 주까지 검수 보고서 정리해주시기로 했고...' },
    { title: 'AI 자동 등록 정확도 측정 데이터 수집', assignee: '박지호', due: '2026-04-29', priority: 'med', confidence: 0.88, sourceQuote: '지호님 이번 주 안에 정확도 측정 데이터 모아주세요.' },
    { title: '결제 모듈 백업 PG 우회 라우트 검증', assignee: '김민수', due: '2026-04-28', priority: 'high', confidence: 0.91 },
    { title: '다음 스프린트 KR 초안 공유', assignee: '최유진', due: '2026-05-02', priority: 'low', confidence: 0.72 },
  ]);
}
