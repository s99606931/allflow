# 관리자 콘솔 (Admin)

> 경로: `/admin` | 파일: `src/components/screens/admin.tsx`  
> E2E: `tests/e2e/menus/admin-notifications-settings.spec.ts`

## 개요

시스템 관리자용 콘솔. LLM 연결 설정, MCP 서버 관리, 시스템 설정, 감사 로그를 관리한다.

## 기능 목록

### 1. LLM 연결 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| LLM 연결 목록 조회 | 등록된 LLM 프로바이더 목록 | ✅ | 🔗 GET /ai/llm-connections | 🧪 use-admin.test.tsx |
| LLM 연결 추가 | 새 LLM API 키 등록 | ✅ | 🔗 POST /ai/llm-connections | 🧪 llm-connections.routes.test.ts |
| LLM 연결 편집 | API 키·모델명 수정 | ✅ | 🔗 PATCH /ai/llm-connections/:id | 🧪 llm-connections.routes.test.ts |
| LLM 연결 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /ai/llm-connections/:id | 🧪 llm-connections.routes.test.ts |
| 기본 LLM 설정 | 기본 사용 LLM 선택 | ✅ | 🔗 PATCH /ai/llm-connections/:id (default) | 🧪 llm-connections.routes.test.ts |
| 연결 테스트 | API 키 유효성 테스트 | ✅ | 🔗 POST /ai/llm-connections/test | 🧪 menus/admin-notifications-settings.spec.ts |

### 2. MCP 서버 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| MCP 서버 목록 조회 | 등록된 MCP 서버 목록 | ✅ | 🔗 GET /ai/mcp-connections | 🧪 mcp-connection.routes.test.ts |
| MCP 서버 추가 | 서버 URL·인증 등록 | ✅ | 🔗 POST /ai/mcp-connections | 🧪 mcp-connection.routes.test.ts |
| MCP 서버 편집 | 서버 설정 수정 | ✅ | 🔗 PATCH /ai/mcp-connections/:id | 🧪 mcp-connection.routes.test.ts |
| MCP 서버 삭제 | DELETE | ✅ | 🔗 DELETE /ai/mcp-connections/:id | 🧪 mcp-connection.routes.test.ts |
| MCP 서버 활성화/비활성화 | 토글 스위치 | ✅ | 🔗 PATCH /ai/mcp-connections/:id (enabled) | 🧪 menus/admin-notifications-settings.spec.ts |

### 3. 감사 로그

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 감사 로그 목록 | 시스템 이벤트 로그 목록 | ✅ | 🔗 GET /audit-log | 🧪 menus/admin-notifications-settings.spec.ts |
| 로그 필터 | 날짜·이벤트 유형 필터 | ✅ | 🔗 | 🧪 menus/admin-notifications-settings.spec.ts |
| 로그 검색 | 키워드 검색 | ✅ | 🔗 | 🧪 menus/admin-notifications-settings.spec.ts |

### 4. OpenTelemetry

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| OTel 엔드포인트 설정 | 트레이싱 수신 서버 설정 | ✅ | 🔗 GET/PATCH /otel/config | 🧪 menus/admin-notifications-settings.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 관리자 콘솔 힌트 | LLM 설정·시스템 상태 기반 힌트 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| LLM 연결 테스트 E2E | 연결 테스트 버튼 E2E 없음 | 중 |
| 감사 로그 내보내기 | CSV/JSON 내보내기 | 중 |
| 역할 기반 접근 제어 설정 | RBAC 설정 UI | 낮음 |
| 시스템 상태 모니터링 | 서버 상태·응답 시간 표시 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
