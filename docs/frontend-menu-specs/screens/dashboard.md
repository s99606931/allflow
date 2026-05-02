# 대시보드 (Dashboard)

> 경로: `/` | 파일: `src/components/screens/dashboard.tsx`  
> E2E: `tests/e2e/menus/dashboard.spec.ts`

## 개요

로그인 후 첫 화면. 내 태스크, 프로젝트 현황, 이슈 요약, 빠른 액션 위젯으로 구성.

## 기능 목록

### 1. 대시보드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 내 태스크 위젯 | 오늘 마감/진행 중 태스크 목록 표시 | ✅ | 🔗 GET /tasks?assignee=me | 🧪 use-data.test.tsx |
| 프로젝트 진행률 위젯 | 활성 프로젝트 진행률 바 표시 | ✅ | 🔗 GET /projects | 🧪 |
| 이슈 요약 위젯 | 우선순위별 이슈 수 요약 | ✅ | 🔗 GET /issues | 🧪 |
| 최근 활동 위젯 | 팀 최근 활동 피드 | ✅ | 🔗 GET /audit-log | 🧪 menus/dashboard.spec.ts |
| 캘린더 미니뷰 | 오늘~이번 주 일정 미리보기 | ✅ | 🔗 GET /events | 🧪 menus/dashboard.spec.ts |
| 결재 대기 위젯 | 내가 처리해야 할 결재 건수 표시 | ✅ | 🔗 GET /approvals?status=pending | 🧪 menus/dashboard.spec.ts |

### 2. 빠른 생성

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 생성 버튼 | TaskCreateDialog 오픈 | ✅ | 🔗 POST /tasks | 🧪 menus-crud.spec.ts |
| 태스크 상세 드롭다운 | 태스크 클릭 → TaskDetailDialog 오픈 | ✅ | 🔗 GET /tasks/:id | 🧪 |

### 3. 태스크 상세 다이얼로그 (TaskDetailDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 정보 표시 | 제목·설명·담당자·마감일·상태 표시 | ✅ | 🔗 GET /tasks/:id | 🧪 |
| 태스크 편집 | 제목·설명·상태·담당자·마감일 수정 | ✅ | 🔗 PATCH /tasks/:id | 🧪 |
| 태스크 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /tasks/:id | 🧪 |
| 댓글 목록 | 댓글 스레드 표시 | ✅ | 🔗 GET /comments?taskId= | 🧪 |
| 댓글 작성 | 댓글 입력 + 전송 | ✅ | 🔗 POST /comments | 🧪 |

### 4. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 대시보드 컨텍스트 힌트 | 오늘 할 일·마감 임박 태스크 기반 힌트 | ✅ | 🔌 (실데이터 조건 분기) | 🧪 menus/dashboard.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 위젯 커스터마이징 | 표시할 위젯 선택·순서 변경 | 중 |
| 위젯 새로고침 버튼 | 개별 위젯 수동 새로고침 | 낮음 |
| 대시보드 E2E 심층 테스트 | 위젯 데이터 정합성 검증 | 중 |
