# PDCA-06 — AI 통합: 자동 등록 / 요약 / 분류 / Notion / 어시스턴트

> Phase: 4 (AI) | Owner: AI BE + FE | Status: done | Created: 2026-04-29 | Updated: 2026-04-29 (2차 sweep — useAiMutations.extractActions + 자동 task 등록 mutation 체인)
> Acceptance: 인벤토리 3.1.* / 3.2.* / G7 / 1.4.4 (AI 자동 분류) / 1.7.2 (AI 요약) / 1.8.3 (대화 요약) wired. 신뢰도 ≥ 0.7 추출.
> Dependencies: PDCA-01, backend PDCA-04 (ai-extract / ai-complete / ai-observability)

## Plan

- 목표: AI가 사용자 행동을 줄이는 핵심 기능 5종을 활성화.
- 범위:
  - `ai-auto.tsx` — 5개 입력 소스(회의록/이메일/Notion/녹음/파일) + 추출 + 검토 후 등록
  - `notion.tsx` — DB 매핑 + 양방향 동기화 + 충돌 해결
  - 글로벌 AIPanel — 슬래시 명령, 컨텍스트 인지 (현재 페이지 데이터 인지)
  - 이슈 자동 분류 (sev/prio 추정)
  - 문서 요약 / 채팅 요약
- 결정:
  - 백엔드 SSE 스트리밍 (`/api/v1/ai/complete`, `/extract-actions`) 사용
  - 신뢰도 임계값 사용자 설정 (기본 0.7)
  - 근거 라인(citation) UI 칩으로 노출 (인용 클릭 → 원문 하이라이트)

## Do

- 추가: `src/components/ai/source-uploader.tsx`, `recording-button.tsx`, `extract-review-table.tsx`, `confidence-slider.tsx`, `notion-mapping-editor.tsx`, `notion-conflict-resolver.tsx`
- 수정: `ai-auto.tsx` 3.1.2 ~ 3.1.8, `notion.tsx` 3.2.1 ~ 3.2.5, `ai-panel.tsx` 슬래시 명령 처리
- 의존성: 녹음 캡처 — Web Audio API 만 사용 (라이브러리 추가 없음)

## Check

- 단위: 추출 응답 → 태스크 변환 매퍼 테스트
- E2E:
  1. 회의록 텍스트 붙여넣기 → 추출 → 후보 7개 → 5개 선택 → 등록 → 태스크/이슈에 노출
  2. Notion DB 연결 → 매핑 편집 → 동기화 → 충돌 1건 → UI 해결
  3. AIPanel 에서 "/오늘 내 일정" → 캘린더 데이터 응답
  4. 이슈 생성 후 "AI 자동 분류" → sev=high, prio=P1 추천 → 채택
  5. 긴 문서에서 "AI 요약" → 3문단 요약 + 인용 칩

## Act

- 메모리: `learning_ai_extraction_pipeline.md`.
- 다음: PDCA-07 (보고/CRM).
