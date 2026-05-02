# 캘린더 (Calendar)

> 경로: `/calendar` | 파일: `src/components/screens/calendar.tsx`  
> E2E: `tests/e2e/menus/calendar.spec.ts`, `calendar-progress-gantt.spec.ts`

## 개요

팀 일정·이벤트 관리. 월간/주간/일간 뷰, 이벤트 CRUD, 채널·DM 버튼 제공.

## 기능 목록

### 1. 뷰 모드

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 월간 뷰 | 월 단위 캘린더 그리드 | ✅ | 🔗 GET /events | 🧪 calendar.spec.ts |
| 주간 뷰 | 주 단위 타임라인 | ✅ | 🔗 | 🧪 |
| 일간 뷰 | 하루 단위 시간표 | ✅ | 🔗 | 🧪 |
| 뷰 전환 탭 | 월/주/일 전환 버튼 | ✅ | 🔌 | 🧪 menus/calendar.spec.ts |

### 2. 날짜 내비게이션

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 이전/다음 기간 | < > 버튼으로 기간 이동 | ✅ | 🔌 (쿼리 범위 변경) | 🧪 |
| 오늘로 이동 | "오늘" 버튼 | ✅ | 🔌 | 🧪 menus/calendar.spec.ts |
| 현재 기간 레이블 | "2026년 5월" 형태 표시 | ✅ | 🔌 | 🧪 menus/calendar.spec.ts |

### 3. 이벤트 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 이벤트 목록 조회 | 기간 내 이벤트 표시 | ✅ | 🔗 GET /events?start=&end= | 🧪 use-data.test.tsx |
| 새 이벤트 생성 | EventCreateDialog → POST | ✅ | 🔗 POST /events | 🧪 menus-crud.spec.ts |
| 이벤트 클릭 | 이벤트 상세 팝업 표시 | ✅ | 🔗 | 🧪 |
| 이벤트 편집 | PATCH 요청 | ✅ | 🔗 PATCH /events/:id | 🧪 menus-crud.spec.ts |
| 이벤트 삭제 | sonner toast 확인 → DELETE | ✅ | 🔗 DELETE /events/:id | 🧪 |

### 4. 채널/DM 버튼

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 채널 버튼 | 채팅 채널 리스트 이동 | ✅ | 🔌 (router push) | 🧪 menus/calendar.spec.ts |
| DM 버튼 | 다이렉트 메시지 이동 | ✅ | 🔌 (router push) | 🧪 menus/calendar.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 오늘 일정 요약 힌트 | 당일 이벤트 수 기반 힌트 | ✅ | 🔌 | 🧪 menus/calendar.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 이벤트 드래그 리스케줄 | 캘린더에서 이벤트를 드래그해 날짜 이동 | 중 |
| 반복 이벤트 | 매주/매월 반복 이벤트 지원 | 중 |
| 캘린더 내보내기 | iCal/Google Calendar 연동 | 낮음 |
| 참여자 초대 | 이벤트에 팀원 초대 기능 | 낮음 |
