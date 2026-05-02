# 커맨드 팔레트 (Command Palette)

> 파일: `src/components/shell/command-palette.tsx`  
> 단축키: ⌘K / Ctrl+K

## 개요

전역 검색·실행 팔레트. 페이지 이동, 항목 검색, 빠른 액션을 단일 인터페이스에서 제공한다.

## 기능 목록

### 1. 검색 카테고리

| 카테고리 | 설명 | 구현 | 백엔드 | 테스트 |
|---------|------|------|--------|--------|
| 최근 항목 | 마지막으로 접근한 8개 항목 표시 | ✅ | 🔌 (로컬 히스토리) | ⬜ |
| 페이지 | 전체 NAV 메뉴 항목 검색 | ✅ | 🔌 | 🧪 nav.test.ts |
| 프로젝트 | 프로젝트명 + 코드 + 진행률 검색 | ✅ | 🔗 GET /projects | 🧪 |
| 태스크 | 태스크명 + ID + 마감일 검색 | ✅ | 🔗 GET /tasks | 🧪 |
| 이슈 | 이슈명 + ID + 우선순위 + 프로젝트 검색 | ✅ | 🔗 GET /issues | 🧪 |
| 사용자 | 이름 + 역할 + 부서 검색 | ✅ | 🔗 GET /users | 🧪 |
| 문서 | 문서명 검색 | ✅ | 🔗 GET /docs | 🧪 |
| AI 시맨틱 검색 | 자연어 의미 기반 검색 (600ms 디바운스) | ✅ | 🔗 GET /search?q= | 🧪 |

### 2. 빠른 액션

| 액션 | 힌트키 | 설명 | 구현 | 백엔드 | 테스트 |
|------|--------|------|------|--------|--------|
| 새 태스크 만들기 | N | TaskCreateDialog 오픈 | ✅ | 🔗 POST /tasks | 🧪 menus-crud.spec.ts |
| 새 이벤트/일정 | ⇧⌘E | EventCreateDialog 오픈 | ✅ | 🔗 POST /events | 🧪 |
| 새 문서 | ⇧⌘O | DocCreateDialog 오픈 | ✅ | 🔗 POST /docs | 🧪 |
| 새 프로젝트 | ⇧⌘P | ProjectCreateDialog 오픈 | ✅ | 🔗 POST /projects | 🧪 |
| 새 이슈 등록 | ⇧⌘I | IssueCreateDialog 오픈 | ✅ | 🔗 POST /issues | 🧪 |
| 휴가 신청 | ⇧⌘L | HR 휴가 신청 폼 오픈 | ✅ | 🔗 POST /hr/leave | 🧪 |
| 회의실 예약 | ⇧⌘R | ResourceBookDialog 오픈 | ✅ | 🔗 POST /resources/book | 🧪 |
| 다크 모드 토글 | ⇧⌘D | 테마 전환 | ✅ | 🔌 (zustand persist) | 🧪 ui-store.test.ts |

### 3. 인터랙션

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 키보드 탐색 | ↑↓ 이동, Enter 선택, Esc 닫기 | ✅ | 🔌 | ⬜ |
| AI 시맨틱 스코어 표시 | "AI · 85% 일치" 관련도 뱃지 | ✅ | 🔗 | ⬜ |
| 중복 제거 | 로컬 결과와 AI 결과 중복 항목 병합 | ✅ | 🔌 | ⬜ |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 팔레트 E2E 테스트 | Playwright 시나리오 없음 | 중 |
| 최근 항목 서버 동기화 | 현재 로컬만 저장, 멀티 기기 미지원 | 낮음 |
| 필터 토글 (페이지/태스크/이슈) | 카테고리별 필터 UI 없음 | 낮음 |
