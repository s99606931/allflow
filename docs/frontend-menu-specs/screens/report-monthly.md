# 월간 보고 (Monthly Report)

> 경로: `/reports/monthly` | 파일: `src/components/screens/report-monthly.tsx`  
> E2E: `tests/e2e/menus/reports.spec.ts`

## 개요

팀 월간 업무 보고서 생성·조회·공유. 주간 보고와 동일한 구조에 월간 집계 데이터 추가.

## 기능 목록

### 1. 보고서 생성

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 월간 보고 AI 자동 작성 | 해당 월 태스크·이슈·이벤트 집계로 자동 생성 | ✅ | 🔗 POST /reports (type=monthly) | 🧪 reports.spec.ts |
| 월 선택 | 보고 대상 연월 선택 | ✅ | 🔌 | 🧪 menus/reports.spec.ts |
| 수동 내용 편집 | AI 초안 수동 편집 | ✅ | 🔗 PATCH /reports/:id | 🧪 menus/reports.spec.ts |
| 보고서 저장 | 저장 버튼 | ✅ | 🔗 | 🧪 menus/reports.spec.ts |

### 2. 보고서 조회

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 이번 달 보고서 | 현재 월 보고서 표시 | ✅ | 🔗 GET /reports?type=monthly | 🧪 |
| 보고서 히스토리 사이드바 | 이전 월간 보고서 버튼 목록 | ✅ | 🔗 GET /reports?type=monthly | 🧪 |
| 이전 보고서 빠른 재로드 | 히스토리 버튼 클릭 → 즉시 로드 | ✅ | 🔗 GET /reports/:id | 🧪 |

### 3. 수신자 관리 (ReportRecipientsEditor)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 수신자 추가 | 사용자 검색·선택 | ✅ | 🔗 GET /users | 🧪 menus/reports.spec.ts |
| 수신자 제거 | X 버튼 | ✅ | 🔌 | 🧪 menus/reports.spec.ts |

### 4. 월간 집계 데이터

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 완료 태스크 수 | 월간 완료 태스크 집계 | ✅ | 🔗 GET /tasks (기간 필터) | 🧪 menus/reports.spec.ts |
| 해결 이슈 수 | 월간 해결 이슈 집계 | ✅ | 🔗 GET /issues (기간 필터) | 🧪 menus/reports.spec.ts |
| 프로젝트 진행률 | 프로젝트별 월간 진행률 변화 | ✅ | 🔗 | 🧪 menus/reports.spec.ts |

### 5. 보고서 공유

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 보고서 발송 | 수신자에게 이메일 발송 | ✅ | 🔗 POST /reports/:id/send | 🧪 menus/reports.spec.ts |

### 6. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 월간 성과 요약 힌트 | 이달 주요 성과 기반 힌트 | ✅ | 🔌 | 🧪 menus/reports.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 보고서 PDF 내보내기 | PDF 다운로드 | 중 |
| 차트 시각화 포함 | 월간 집계를 차트로 | 중 |
| 비교 뷰 | 전월 대비 비교 섹션 | 낮음 |
