# 프로젝트 (Projects)

> 경로: `/projects`, `/projects/:id` | 파일: `src/components/screens/projects.tsx`, `project-detail.tsx`  
> E2E: `tests/e2e/menus/projects.spec.ts`

## 개요

워크스페이스의 모든 프로젝트 목록과 상세 관리. 생성·수정·팀원 관리·진행률 추적.

## 기능 목록

### 1. 프로젝트 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 프로젝트 목록 조회 | 내가 멤버인 프로젝트 카드 목록 | ✅ | 🔗 GET /projects | 🧪 use-data.test.tsx |
| 진행률 바 | 완료된 태스크 / 전체 태스크 비율 표시 | ✅ | 🔗 (projects 응답 포함) | 🧪 menus/projects.spec.ts |
| 프로젝트 상태 뱃지 | active / on-hold / completed 뱃지 | ✅ | 🔗 | 🧪 menus/projects.spec.ts |
| 팀원 아바타 스택 | 프로젝트 멤버 아바타 3명 + 더보기 | ✅ | 🔗 (members 포함) | 🧪 menus/projects.spec.ts |
| 새 프로젝트 생성 | ProjectCreateDialog 오픈 | ✅ | 🔗 POST /projects | 🧪 menus-crud.spec.ts |
| 프로젝트 색상 | 프로젝트별 고유 색상 코드 표시 | ✅ | 🔗 (color 필드) | 🧪 menus/projects.spec.ts |

### 2. 프로젝트 생성 다이얼로그 (ProjectCreateDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 프로젝트명 입력 | 필수 텍스트 입력 | ✅ | 🔗 | 🧪 |
| 프로젝트 코드 | 자동 생성 or 수동 입력 (대문자) | ✅ | 🔗 | 🧪 |
| 색상 선택 | 미리 정의된 색상 팔레트 | ✅ | 🔗 | 🧪 |
| 설명 입력 | 선택적 텍스트에어리어 | ✅ | 🔗 | 🧪 |
| 예산 설정 | 프로젝트 예산 숫자 입력 | ✅ | 🔗 (budget 필드) | 🧪 |

### 3. 프로젝트 편집 다이얼로그 (ProjectEditDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 모든 생성 필드 수정 | 이름·코드·색상·설명·예산 편집 | ✅ | 🔗 PATCH /projects/:id | 🧪 menus-crud.spec.ts |
| 상태 변경 | active / on-hold / completed 전환 | ✅ | 🔗 | 🧪 |

### 4. 프로젝트 상세 화면 (ProjectDetailPage)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 프로젝트 정보 조회 | 상세 정보 헤더 표시 | ✅ | 🔗 GET /projects/:id | 🧪 menus/projects.spec.ts |
| 태스크 목록 (칸반) | 프로젝트 소속 태스크 칸반 뷰 | ✅ | 🔗 GET /tasks?projectId= | 🧪 menus/projects.spec.ts |
| 태스크 생성 | 프로젝트 컨텍스트에서 새 태스크 | ✅ | 🔗 POST /tasks | 🧪 menus-crud.spec.ts |
| 멤버 관리 | 프로젝트 멤버 추가/제거 | ⚠️ | 🔗 PATCH /projects/:id (members) | 🧪 menus/projects.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 프로젝트 상태 기반 힌트 | 지연 프로젝트·완료율 기반 AI 조언 | ✅ | 🔌 | 🧪 menus/projects.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 프로젝트 삭제 UI | Delete 버튼이 없음 (API는 존재 가능) | 중 |
| 멤버 관리 UI 완성 | 멤버 추가/제거 다이얼로그 | 중 |
| 프로젝트 상세 E2E | project-detail 화면 전용 E2E 없음 | 중 |
| 프로젝트 필터/정렬 | 상태별·날짜별 필터링 | 낮음 |
| 아카이브 기능 | 완료 프로젝트 보관 처리 | 낮음 |
