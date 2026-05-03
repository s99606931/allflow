# 고객사 CRM (Clients)

> 경로: `/clients` | 파일: `src/components/screens/clients.tsx`  
> E2E: `tests/e2e/menus/clients.spec.ts`

## 개요

고객사 정보 관리 CRM. 고객사 목록·상세·담당자·계약 정보를 관리한다.

## 기능 목록

### 1. 고객사 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 고객사 목록 조회 | 전체 고객사 카드/테이블 목록 | ✅ | 🔗 GET /clients | 🧪 use-data.test.tsx |
| 업종·상태 뱃지 | 고객사 업종·계약 상태 표시 | ✅ | 🔗 | 🧪 clients.routes.test.ts |
| 담당자 표시 | 담당 직원 아바타 | ✅ | 🔗 | 🧪 clients.routes.test.ts |
| 검색 | 고객사명 텍스트 검색 | ✅ | 🔌 (클라이언트) | 🧪 menus/clients.spec.ts |

### 2. 고객사 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 고객사 생성 | ClientFormDialog(신규) → POST | ✅ | 🔗 POST /clients | 🧪 menus-crud.spec.ts |
| 고객사 편집 | ClientFormDialog(편집) → PATCH | ✅ | 🔗 PATCH /clients/:id | 🧪 clients.routes.test.ts |
| 고객사 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /clients/:id | 🧪 |
| 고객사 상세 보기 | ClientDetailDialog → 전체 정보 | ✅ | 🔗 GET /clients/:id | 🧪 |

### 3. 고객사 생성/편집 폼 (ClientFormDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 고객사명 입력 | 필수 텍스트 | ✅ | 🔗 | 🧪 |
| 업종 선택 | 드롭다운 업종 목록 | ✅ | 🔗 | 🧪 |
| 담당자 지정 | 사용자 선택 | ✅ | 🔗 | 🧪 |
| 연락처·이메일 | 연락처 정보 입력 | ✅ | 🔗 | 🧪 |
| 계약 상태 | active/inactive/prospect | ✅ | 🔗 | 🧪 |

### 4. 더보기 메뉴

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 편집 드롭다운 | MoreHorizontal → 편집 선택 | ✅ | 🔗 | 🧪 menus/clients.spec.ts |
| 삭제 드롭다운 | MoreHorizontal → 삭제 선택 | ✅ | 🔗 | 🧪 menus/clients.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 고객사 현황 힌트 | 신규 고객사·미팅 일정 기반 힌트 | ✅ | 🔌 | 🧪 menus/clients.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 고객사 미팅 기록 | 미팅 이력 등록·조회 | 중 |
| 고객사 담당 프로젝트 연결 | 고객사 ↔ 프로젝트 연결 뷰 | 중 |
| 고객사 파이프라인 뷰 | 영업 단계별 칸반 뷰 | 낮음 |
| 고객사 내보내기 | CSV 내보내기 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
