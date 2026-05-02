# 문서/위키 (Docs)

> 경로: `/docs` | 파일: `src/components/screens/docs.tsx`  
> E2E: `tests/e2e/menus/docs.spec.ts`

## 개요

팀 지식베이스·위키 시스템. 문서 생성·편집·검색·즐겨찾기·AI 요약을 지원한다.

## 기능 목록

### 1. 문서 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 문서 목록 조회 | 전체 문서 카드 목록 | ✅ | 🔗 GET /docs | 🧪 use-data.test.tsx |
| 검색 | 문서 제목 텍스트 검색 | ✅ | 🔌 (클라이언트 필터) | 🧪 |
| 즐겨찾기 표시 | 별표 아이콘으로 즐겨찾기 문서 필터 | ✅ | 🔗 PATCH /docs/:id (starred) | 🧪 |
| 작성자·날짜 표시 | 문서 메타 정보 | ✅ | 🔗 | 🧪 |

### 2. 문서 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 새 문서 생성 | DocCreateDialog → POST | ✅ | 🔗 POST /docs | 🧪 menus-crud.spec.ts |
| 문서 편집 | 인라인 contentEditable 편집기 | ✅ | 🔗 PATCH /docs/:id | 🧪 |
| 문서 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /docs/:id | 🧪 |
| 즐겨찾기 토글 | 별표 버튼 클릭 | ✅ | 🔗 PATCH /docs/:id | 🧪 |

### 3. AI 기능

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| AI 문서 요약 | 문서 내용 AI 요약 버튼 | ✅ | 🔗 POST /ai/chat (문서 컨텍스트) | 🧪 menus/docs.spec.ts |
| AI 가이드 위젯 | 문서 활용 힌트 | ✅ | 🔌 | 🧪 menus/docs.spec.ts |

### 4. 문서 편집기

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 리치 텍스트 편집 | contentEditable 기반 제로 의존성 에디터 | ✅ | 🔌 | 🧪 menus/docs.spec.ts |
| HTML 새니타이징 | XSS 방지 DOMPurify 적용 | ✅ | 🔌 | 🧪 menus/docs.spec.ts |
| 자동 저장 | 편집 후 debounce PATCH | ✅ | 🔗 PATCH /docs/:id | 🧪 menus/docs.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 문서 이력 (버전 관리) | 편집 이력 조회·복원 | 중 |
| 마크다운 에디터 | 마크다운 문법 지원 | 중 |
| 문서 공유 링크 | 외부 공유 URL 생성 | 낮음 |
| 실시간 협업 편집 | 멀티 유저 동시 편집 | 낮음 |
| 폴더 구조 | 문서를 폴더로 구조화 | 낮음 |
