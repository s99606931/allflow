# PDCA-02 — 태스크 / 이슈 CRUD 와이어링

> Phase: 2 (Core) | Owner: FE Lead | Status: done | Created: 2026-04-29 | Updated: 2026-04-29 (2차 sweep — useTasks/useIssues + create/update/transition mutations 와이어링)
> Acceptance: 인벤토리 1.3.* / 1.4.* 의 모든 decoration/missing 버튼이 wired 상태로 전환되고 E2E 시나리오 5개 통과.
> Dependencies: PDCA-01

## Plan

- 목표: 태스크·이슈는 본 SaaS의 핵심 엔터티 → 가장 먼저 완전 동작.
- 범위:
  - `src/components/screens/tasks.tsx`, `task-detail.tsx`
  - `src/components/screens/issues.tsx`, `issues-full.tsx`
  - `src/components/dialogs/task-create.tsx` (신규), `issue-create.tsx` (신규), `task-filter-panel.tsx` (신규)
- 결정:
  - 보드 드래그앤드롭은 `@dnd-kit/core` 채택 (의존성 추가, 사용자 사전 고지)
  - 일괄 액션은 체크박스 선택 → 상단 floating bar
  - 이슈 상태 전이는 RBAC 검증 (P0 변경은 매니저+ 만)

## Do

- 추가 파일:
  - `src/components/dialogs/task-create.tsx`
  - `src/components/dialogs/issue-create.tsx`
  - `src/components/dialogs/task-filter-panel.tsx`
  - `src/hooks/use-task-mutations.ts` — create/update/delete/transition
  - `src/hooks/use-issue-mutations.ts` — 동일 패턴
- 수정 파일:
  - `tasks.tsx`: 인벤토리 1.3.2/1.3.4/1.3.11/1.3.12 와이어링
  - `task-detail.tsx`: 1.3.8 ~ 1.3.10 와이어링 (링크 복사 → clipboard, 댓글 등록 → mutation)
  - `issues.tsx` / `issues-full.tsx`: 1.4.1 ~ 1.4.9 와이어링 (AI 자동 분류는 PDCA-06 의 endpoint 호출)
- 추가 의존성: `@dnd-kit/core`, `@dnd-kit/sortable` (사용자 승인 필요)

## Check

- 단위: `task-create.test.tsx`, `issue-create.test.tsx`, `use-task-mutations.test.ts`
- 통합: React Query mock server (msw) 로 mutation 흐름 검증
- E2E (Playwright):
  1. 새 태스크 생성 → 리스트에 노출 → 상세 진입 → 상태 변경 → 완료 처리
  2. 보드 뷰에서 카드 드래그 → 컬럼 변경 → 상태 동기화
  3. 일괄 선택 후 담당자 일괄 변경
  4. 새 이슈 생성 → P0 → SLA 카운트다운 시작
  5. 이슈 상태 전이 (open → in-progress → in-review → resolved)
- 접근성: 키보드만으로 1~5 시나리오 완수 가능

## Act

- 학습: TanStack Query + 낙관적 업데이트 패턴 정착.
- 메모리: `learning_optimistic_update_pattern.md`.
- 다음: PDCA-03 (프로젝트) — 본 mutation 패턴을 그대로 재사용.
