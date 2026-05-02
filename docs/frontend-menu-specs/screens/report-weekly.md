# 주간 보고 (Weekly Report)

> 경로: `/reports/weekly` | 파일: `src/components/screens/report-weekly.tsx`  
> E2E: `tests/e2e/menus/reports.spec.ts`

## 개요

팀 주간 업무 보고서 생성·조회·공유. AI 자동 작성, 수신자 설정, 히스토리 조회를 지원한다.

## 기능 목록

### 1. 보고서 생성

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 주간 보고 AI 자동 작성 | 이번 주 태스크·이슈·이벤트 기반 자동 생성 | ✅ | 🔗 POST /reports (AI 작성) | 🧪 reports.spec.ts |
| 주간 범위 선택 | 보고 주간 날짜 범위 선택 | ✅ | 🔌 | 🧪 menus/reports.spec.ts |
| 수동 내용 편집 | AI 초안 수동 편집 | ✅ | 🔗 PATCH /reports/:id | 🧪 menus/reports.spec.ts |
| 보고서 저장 | PATCH로 저장 | ✅ | 🔗 | 🧪 menus/reports.spec.ts |

### 2. 보고서 조회

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 현재 주 보고서 | 이번 주 보고서 표시 | ✅ | 🔗 GET /reports?type=weekly | 🧪 |
| 보고서 히스토리 | 이전 주간 보고서 목록 사이드바 | ✅ | 🔗 GET /reports?type=weekly | 🧪 |
| 이전 보고서 재로드 | 히스토리에서 이전 보고서 빠른 열기 | ✅ | 🔗 GET /reports/:id | 🧪 |

### 3. 수신자 관리 (ReportRecipientsEditor)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 수신자 추가 | 사용자 검색·선택으로 수신자 지정 | ✅ | 🔗 GET /users | 🧪 menus/reports.spec.ts |
| 수신자 제거 | 수신자 목록에서 X 버튼 | ✅ | 🔌 | 🧪 menus/reports.spec.ts |
| 외부 이메일 수신자 | 이메일 직접 입력 추가 | ✅ | 🔗 | 🧪 menus/report-weekly.spec.ts |

### 4. 보고서 공유

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 보고서 발송 | 수신자에게 보고서 이메일 발송 | ✅ | 🔗 POST /reports/:id/send | 🧪 menus/reports.spec.ts |
| 링크 공유 | 공유 가능한 URL 생성 | ✅ | 🔗 | 🧪 menus/reports.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 보고서 작성 힌트 | 완성도·주요 성과 기반 힌트 | ✅ | 🔌 | 🧪 menus/reports.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 외부 이메일 수신자 완성 | 이메일 직접 입력 UI | 중 |
| 보고서 PDF 내보내기 | PDF 다운로드 | 중 |
| 보고서 템플릿 | 커스텀 보고서 템플릿 | 낮음 |
| 링크 공유 완성 | 공개 보고서 URL | 낮음 |
