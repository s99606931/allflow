# Notion 연동 (Notion Integration)

> 경로: `/notion` | 파일: `src/components/screens/notion.tsx`  
> E2E: `tests/e2e/menus/notion.spec.ts`

## 개요

Notion 워크스페이스와의 데이터 연동 관리. 페이지 임포트·동기화·연결 상태를 관리한다.

## 기능 목록

### 1. 연동 상태

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 연동 상태 표시 | connected / disconnected 상태 | ✅ | 🔗 GET /integrations/notion/status | 🧪 use-notion.test.tsx |
| Notion 연결 버튼 | OAuth 연결 플로우 시작 | ✅ | 🔗 GET /integrations/notion/auth-url | 🧪 |
| Notion 연결 해제 | 연동 제거 | ✅ | 🔗 DELETE /integrations/notion | 🧪 |

### 2. 페이지 임포트

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| Notion 페이지 목록 | 연결된 Notion 워크스페이스 페이지 목록 | ✅ | 🔗 GET /integrations/notion/pages | 🧪 |
| 페이지 선택 | 임포트할 페이지 체크박스 선택 | ✅ | 🔌 | 🧪 menus/notion.spec.ts |
| 페이지 임포트 | 선택 페이지 → AllFlow 문서로 변환 | ✅ | 🔗 POST /integrations/notion/import | 🧪 menus-crud.spec.ts |
| 임포트 진행 표시 | 임포트 처리 중 상태 표시 | ✅ | 🔌 | 🧪 menus/notion.spec.ts |

### 3. 동기화

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 자동 동기화 설정 | 정기 동기화 주기 설정 | ✅ | 🔗 | 🧪 menus/notion.spec.ts |
| 수동 동기화 | "지금 동기화" 버튼 | ✅ | 🔗 POST /integrations/notion/sync | 🧪 menus/notion.spec.ts |
| 마지막 동기화 시각 | "X분 전 동기화" 표시 | ✅ | 🔗 | 🧪 menus/notion.spec.ts |

### 4. Notion 링크

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| Notion 페이지 링크 | AllFlow 문서에서 Notion 원본 링크 | ✅ | 🔗 (notionUrl 필드) | 🧪 menus/notion.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 연동 활용 힌트 | Notion 연동 기반 AI 힌트 | ✅ | 🔌 | 🧪 menus/notion.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 자동 동기화 UI 완성 | 주기 설정 드롭다운 | 중 |
| 양방향 동기화 | AllFlow → Notion 내보내기 | 낮음 |
| 동기화 충돌 해결 | 양쪽 변경 충돌 처리 UI | 낮음 |
