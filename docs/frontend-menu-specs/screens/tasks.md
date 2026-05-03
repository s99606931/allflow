# 내 태스크 (Tasks)

> 경로: `/tasks` | 파일: `src/components/screens/tasks.tsx`, `task-detail.tsx`  
> E2E: `tests/e2e/menus/tasks.spec.ts`

## 개요

내가 담당한 태스크의 칸반 보드 및 리스트 뷰. 생성·수정·삭제·상태 전환을 지원한다.

## 기능 목록

### 1. 뷰 모드 전환

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 칸반 보드 뷰 | To Do / In Progress / Done 컬럼 | ✅ | 🔗 GET /tasks | 🧪 tasks.spec.ts |
| 리스트 뷰 | 테이블 형태 태스크 목록 | ✅ | 🔗 | 🧪 tasks.routes.test.ts |
| 뷰 모드 탭 | 탭 UI로 보드/리스트 전환 | ✅ | 🔌 (로컬 상태) | 🧪 menus/tasks.spec.ts |

### 2. 태스크 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 목록 조회 | 내 담당 태스크 조회 (프로젝트 멤버십 필터) | ✅ | 🔗 GET /tasks | 🧪 use-data.test.tsx |
| 새 태스크 생성 | TaskCreateDialog → POST | ✅ | 🔗 POST /tasks | 🧪 menus-crud.spec.ts |
| 태스크 상세 보기 | 카드/행 클릭 → TaskDetailDialog | ✅ | 🔗 GET /tasks/:id | 🧪 tasks.routes.test.ts |
| 태스크 편집 | TaskEditDialog → PATCH | ✅ | 🔗 PATCH /tasks/:id | 🧪 tasks.routes.test.ts |
| 태스크 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /tasks/:id | 🧪 menus-crud.spec.ts |
| 상태 전환 | 칸반 컬럼 드래그 or 드롭다운 | ✅ | 🔗 PATCH /tasks/:id (status) | 🧪 menus/tasks.spec.ts |

### 3. 태스크 상세 다이얼로그 (TaskDetailDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 제목·설명 표시 | 태스크 기본 정보 | ✅ | 🔗 | 🧪 tasks.routes.test.ts |
| 담당자 표시/변경 | 사용자 목록에서 선택 | ✅ | 🔗 | 🧪 tasks.routes.test.ts |
| 마감일 표시/변경 | 날짜 피커 | ✅ | 🔗 | 🧪 tasks.routes.test.ts |
| 프로젝트 연결 | 소속 프로젝트 표시 | ✅ | 🔗 | 🧪 tasks.routes.test.ts |
| 댓글 목록 | 댓글 스레드 | ✅ | 🔗 GET /comments?taskId= | 🧪 |
| 댓글 작성 | 새 댓글 입력 + 전송 | ✅ | 🔗 POST /comments | 🧪 |
| 댓글 삭제 | 내 댓글 삭제 | ✅ | 🔗 DELETE /comments/:id | 🧪 menus-crud.spec.ts |

### 4. 필터링

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 상태별 필터 | To Do / In Progress / Done | ✅ | 🔌 (클라이언트 필터) | 🧪 menus/tasks.spec.ts |
| 우선순위별 필터 | P0 / P1 / P2 / P3 | ✅ | 🔌 | 🧪 menus/tasks.spec.ts |
| 프로젝트별 필터 | 특정 프로젝트 태스크만 표시 | ✅ | 🔌 | 🧪 menus/tasks.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 마감 임박 태스크 힌트 | 오늘/내일 마감 태스크 기반 조언 | ✅ | 🔌 | 🧪 menus/tasks.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 태스크 정렬 (마감일/우선순위) | 정렬 드롭다운 없음 | 중 |
| 드래그&드롭 칸반 | 카드 드래그로 상태 변경 | 중 |
| 태스크 일괄 선택 | 체크박스 선택 + 일괄 삭제/상태 변경 | 낮음 |
| 댓글 편집 | 기존 댓글 수정 기능 없음 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
