# 이슈 관리 (Issues)

> 경로: `/issues` | 파일: `src/components/screens/issues.tsx`, `issues-full.tsx`  
> E2E: `tests/e2e/menus/issues.spec.ts`

## 개요

버그·요청·개선사항 추적 시스템. 우선순위·상태·AI 분류·권장 액션을 지원한다.

## 기능 목록

### 1. 이슈 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 이슈 목록 조회 | 전체 이슈 리스트 (페이지네이션) | ✅ | 🔗 GET /issues | 🧪 use-data.test.tsx |
| 우선순위 뱃지 | P0(긴급)/P1/P2/P3 색상 뱃지 | ✅ | 🔗 | 🧪 use-data.test.tsx |
| 상태 뱃지 | open / in-progress / resolved / closed | ✅ | 🔗 | 🧪 issues.routes.test.ts |
| SLA 백분율 | SLA 충족률 표시 (slaPct 필드) | ✅ | 🔗 | 🧪 menus/issues.spec.ts |

### 2. 이슈 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 이슈 생성 | IssueCreateDialog → POST | ✅ | 🔗 POST /issues | 🧪 menus-crud.spec.ts |
| 이슈 편집 | IssueEditDialog → PATCH | ✅ | 🔗 PATCH /issues/:id | 🧪 issues.routes.test.ts |
| 이슈 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /issues/:id | 🧪 issues.routes.test.ts |
| 상태 전환 | 드롭다운 → 상태 변경 | ✅ | 🔗 PATCH /issues/:id (status) | 🧪 issues.routes.test.ts |

### 3. 필터링

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 우선순위 필터 | P0/P1/P2/P3/전체 탭 | ✅ | 🔌 (클라이언트) | 🧪 issues.spec.ts |
| 상태 필터 | open/in-progress/resolved 필터 | ✅ | 🔌 | 🧪 issues.routes.test.ts |
| 검색 | 제목 텍스트 검색 | ✅ | 🔌 | 🧪 use-data.test.tsx |

### 4. AI 기능

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| AI 자동 분류 | 이슈 내용 기반 카테고리 자동 분류 | ✅ | 🔗 POST /issues/ai-classify | 🧪 issues.routes.test.ts |
| AI 권장 액션 | slaPct≥80인 실이슈 기반 권장 조치 표시 | ✅ | 🔗 (slaPct 실데이터 파생) | 🧪 menus/issues.spec.ts |
| AI 가이드 위젯 | P0 이슈 집중·SLA 위반 기반 힌트 | ✅ | 🔌 | 🧪 menus/issues.spec.ts |

### 5. 전체 화면 모드 (IssuesFullPage)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 확장 테이블 뷰 | 더 많은 컬럼 표시 | ✅ | 🔗 | 🧪 menus/issues.spec.ts |
| 전체화면 토글 | 이슈 화면을 전체 너비로 전환 | ✅ | 🔌 | 🧪 menus/issues.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 이슈 댓글 | 이슈별 댓글 기능 (tasks와 동일 패턴) | 중 |
| 이슈 → 태스크 전환 | 이슈를 태스크로 변환 | 낮음 |
| 이슈 일괄 처리 | 체크박스 + 일괄 상태 변경 | 낮음 |
| 이슈 담당자 필터 | 담당자별 필터링 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
