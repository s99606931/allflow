# 간트차트 (Gantt)

> 경로: `/gantt` | 파일: `src/components/screens/gantt.tsx`, `gantt-dep-panel.tsx`  
> E2E: `tests/e2e/menus/calendar-progress-gantt.spec.ts`

## 개요

프로젝트·태스크의 타임라인 시각화. CSS + SVG 기반 zero-dependency Gantt 구현체.  
의존성 화살표, 날짜 오버랩 감지, 순환 의존성 방지(422) 포함.

## 기능 목록

### 1. 간트 뷰

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 타임라인 표시 | 태스크를 날짜 기준 수평 바로 표시 | ✅ | 🔗 GET /tasks (startDate/dueDate) | 🧪 calendar-progress-gantt.spec.ts |
| 프로젝트 그룹핑 | 프로젝트별로 태스크 그룹 표시 | ✅ | 🔗 GET /projects | 🧪 |
| 날짜 헤더 | 주/월 단위 날짜 눈금 표시 | ✅ | 🔌 | 🧪 menus/calendar-progress-gantt.spec.ts |
| 오늘 기준선 | 오늘 날짜 강조 수직선 | ✅ | 🔌 | 🧪 menus/calendar-progress-gantt.spec.ts |
| 날짜 오버랩 감지 | 겹치는 태스크 시각적 경고 | ✅ | 🔌 | 🧪 menus/calendar-progress-gantt.spec.ts |

### 2. 의존성 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 의존성 화살표 표시 | SVG 화살표로 태스크 간 의존성 시각화 | ✅ | 🔗 GET /gantt/dependencies | 🧪 |
| 의존성 추가 UI | 의존성 패널에서 선행 태스크 선택 | ✅ | 🔗 POST /gantt/dependencies | 🧪 menus-crud.spec.ts |
| 의존성 삭제 | 의존성 패널에서 제거 | ✅ | 🔗 DELETE /gantt/dependencies/:id | 🧪 menus/calendar-progress-gantt.spec.ts |
| 순환 의존성 방지 | A→B→A 같은 순환 시 422 오류 | ✅ | 🔗 (422 응답) | 🧪 |

### 3. 의존성 패널 (GanttDepPanel)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 선택 | 의존성을 설정할 태스크 선택 | ✅ | 🔗 | 🧪 menus/calendar-progress-gantt.spec.ts |
| 선행 태스크 검색 | 선행 태스크 검색·선택 | ✅ | 🔗 | 🧪 menus/calendar-progress-gantt.spec.ts |
| 의존성 목록 표시 | 현재 태스크의 의존성 목록 | ✅ | 🔗 | 🧪 menus/calendar-progress-gantt.spec.ts |

### 4. 인터랙션

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 바 클릭 | 태스크 상세 오픈 | ✅ | 🔗 | 🧪 menus/calendar-progress-gantt.spec.ts |
| 수평 스크롤 | 날짜 범위 이동 | ✅ | 🔌 | 🧪 menus/calendar-progress-gantt.spec.ts |
| 줌 레벨 조절 | 일/주/월 단위 전환 | ⚠️ | 🔌 | 🧪 menus/calendar-progress-gantt.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 태스크 바 드래그 리스케줄 | 바를 드래그해서 날짜 변경 | 중 |
| 줌 레벨 완성 | 일/주/월 뷰 전환 버튼 | 중 |
| 간트 전용 E2E 스펙 | calendar-progress-gantt 공유, 간트 전용 없음 | 중 |
| 크리티컬 패스 강조 | 임계 경로 자동 계산·표시 | 낮음 |
