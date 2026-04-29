# PDCA-03 — 프로젝트 / 진행률 와이어링

> Phase: 2 (Core) | Owner: FE Lead | Status: done | Created: 2026-04-29 | Updated: 2026-04-29 (2차 sweep — progress 화면 useProjects() 라이브 데이터)
> Acceptance: 인벤토리 1.2.* / 2.1.* 모두 wired. 동적 라우트 `/projects/[id]` 생성.
> Dependencies: PDCA-02

## Plan

- 목표: 프로젝트 생성/편집/멤버 관리 + 진행률 시각화 완성.
- 범위:
  - `src/app/projects/[id]/page.tsx` (신규 동적 라우트)
  - `src/components/screens/projects.tsx`, `progress.tsx`
  - `src/components/screens/project-detail.tsx` (신규)
- 결정: 간트 차트는 `frappe-gantt` 또는 자체 SVG 컴포넌트. 1주 PoC 후 결정.

## Do

- 추가 파일:
  - `src/app/projects/[id]/page.tsx`
  - `src/components/screens/project-detail.tsx`
  - `src/components/dialogs/project-create.tsx`
  - `src/components/charts/gantt-mini.tsx`
- 수정 파일:
  - `projects.tsx`: 1.2.1 ~ 1.2.5 와이어링
  - `progress.tsx`: 2.1.1 ~ 2.1.3 (드릴다운 + 헬스 임계값)
- 추가 의존성: 간트 라이브러리 (PoC 후 확정)

## Check

- E2E:
  1. 새 프로젝트 생성 → 멤버 3명 추가 → 대시보드/사이드바 카운트 갱신
  2. 프로젝트 상세에서 태스크 추가 → 진행률 자동 계산
  3. 진행률 카드 클릭 → 프로젝트 상세 진입
  4. 프로젝트 아카이브 → 사이드바 카운트 감소

## Act

- 메모리: `learning_dynamic_route_pattern.md`.
- 다음: PDCA-04 (협업: 결재/문서/채팅).
