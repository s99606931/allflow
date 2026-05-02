# 회의실·리소스 (Resources)

> 경로: `/resources` | 파일: `src/components/screens/resources.tsx`  
> E2E: `tests/e2e/menus/approvals-resources.spec.ts`

## 개요

회의실·장비 등 공유 리소스 예약 시스템. 가용 현황, 예약 CRUD, 충돌 방지를 지원한다.

## 기능 목록

### 1. 리소스 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 리소스 목록 조회 | 회의실·장비 카드 목록 | ✅ | 🔗 GET /resources | 🧪 use-data.test.tsx |
| 리소스 유형 뱃지 | 회의실/장비/차량 등 타입 표시 | ✅ | 🔗 | 🧪 |
| 수용 인원 표시 | 회의실 최대 인원 | ✅ | 🔗 | 🧪 |
| 가용 여부 표시 | 현재 예약 가능 여부 | ✅ | 🔗 | 🧪 menus/approvals-resources.spec.ts |
| 빈 결과 상태 | 리소스 없을 때 빈 화면 | ✅ | 🔗 | 🧪 menus/approvals-resources.spec.ts |

### 2. 날짜 내비게이션

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 날짜 선택 | < > 버튼으로 날짜 이동 | ✅ | 🔌 (쿼리 범위 변경) | 🧪 menus/approvals-resources.spec.ts |
| 오늘 버튼 | 오늘로 즉시 이동 | ✅ | 🔌 | 🧪 menus/approvals-resources.spec.ts |

### 3. 예약 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 예약 목록 조회 | 선택 날짜의 예약 현황 | ✅ | 🔗 GET /resources/bookings?date= | 🧪 |
| 새 예약 | ResourceBookDialog → POST | ✅ | 🔗 POST /resources/book | 🧪 menus-crud.spec.ts |
| 예약 수정 | PATCH 요청 | ✅ | 🔗 PATCH /resources/bookings/:id | 🧪 menus/approvals-resources.spec.ts |
| 예약 취소 | 내 예약 취소 → DELETE | ✅ | 🔗 DELETE /resources/bookings/:id | 🧪 menus/approvals-resources.spec.ts |

### 4. 예약 다이얼로그 (ResourceBookDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 리소스 선택 | 예약할 리소스 선택 | ✅ | 🔗 | 🧪 |
| 날짜·시간 선택 | 시작/종료 시각 입력 | ✅ | 🔗 | 🧪 |
| 예약 목적 입력 | 선택적 설명 텍스트 | ✅ | 🔗 | 🧪 |
| 예약 충돌 감지 | 동일 시간 중복 예약 방지 | ✅ | 🔗 (409 Conflict) | 🧪 |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 리소스 예약 힌트 | 예약 현황 기반 최적 시간 제안 | ✅ | 🔌 | 🧪 menus/approvals-resources.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 예약 수정 UI | 편집 버튼/폼 없음 | 중 |
| 리소스 타임라인 뷰 | 가용 시간 시각적 표시 | 중 |
| 반복 예약 | 정기 회의실 예약 | 낮음 |
| 리소스 관리 (관리자) | 리소스 추가·편집·삭제 | 낮음 |
