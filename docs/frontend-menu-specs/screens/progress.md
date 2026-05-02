# 진행률 관리 (Progress)

> 경로: `/progress` | 파일: `src/components/screens/progress.tsx`  
> E2E: `tests/e2e/menus/calendar-progress-gantt.spec.ts`

## 개요

영업·프로젝트 진행률 대시보드. 프로젝트별 진행 현황, 고객사별 계약 현황을 시각화한다.

## 기능 목록

### 1. 진행률 개요

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 전체 진행률 요약 | 활성 프로젝트 평균 진행률 | ✅ | 🔗 GET /projects | 🧪 use-data.test.tsx |
| 프로젝트별 진행률 바 | 각 프로젝트 완료율 시각화 | ✅ | 🔗 | 🧪 |
| 고객사별 현황 | 고객사 계약·진행 상태 카드 | ✅ | 🔗 GET /clients | 🧪 |
| 기간별 필터 | 이번 주/월/분기 필터 | ✅ | 🔌 (클라이언트) | 🧪 menus/calendar-progress-gantt.spec.ts |

### 2. 세부 항목

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 태스크 완료율 | 완료 태스크 / 전체 태스크 비율 | ✅ | 🔗 GET /tasks | 🧪 menus/calendar-progress-gantt.spec.ts |
| 예산 소진율 | 예산 대비 실제 사용 비율 | ✅ | 🔗 (project budget 필드) | 🧪 menus/calendar-progress-gantt.spec.ts |
| 마일스톤 현황 | 마일스톤 달성 여부 | ✅ | 🔗 | 🧪 menus/calendar-progress-gantt.spec.ts |

### 3. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 지연 프로젝트 경고 힌트 | 진행률 낮은 프로젝트 기반 AI 조언 | ✅ | 🔌 | 🧪 menus/calendar-progress-gantt.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 마일스톤 관리 완성 | 마일스톤 CRUD 기능 | 중 |
| 차트 시각화 | 원형·막대 차트 추가 | 중 |
| 진행률 보고서 내보내기 | PDF/엑셀 내보내기 | 낮음 |
| 담당자별 성과 뷰 | 팀원별 완료 태스크 수 | 낮음 |
