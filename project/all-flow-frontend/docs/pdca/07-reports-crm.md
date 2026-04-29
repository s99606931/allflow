# PDCA-07 — 보고 / CRM (PDF + 이메일 발송)

> Phase: 5 (Operations) | Owner: FE + BE | Status: todo | Created: 2026-04-29
> Acceptance: 인벤토리 4.1.* / 4.2.* / 2.2.* wired. 주간/월간 PDF 다운로드 + 이메일 발송 동작.
> Dependencies: PDCA-01, PDCA-06 (AI 합성)

## Plan

- 목표: 보고 자동화 + CRM 기본 CRUD 완성.
- 범위:
  - 보고: `report-weekly.tsx`, `report-monthly.tsx` + `src/lib/pdf-reports.tsx`
  - CRM: `clients.tsx` + `client-detail.tsx` (신규) + 활동 타임라인
- 결정:
  - PDF: `@react-pdf/renderer` 기존 사용 → 클라이언트 사이드 렌더 후 다운로드
  - 메일 발송: 백엔드 `/api/v1/reports/{id}/send` (큐 적재)
  - CRM 단계: lead → qualified → active → churned

## Do

- 추가: `client-detail.tsx`, `client-form.tsx`, `activity-timeline.tsx`, `report-recipients-editor.tsx`
- 수정: `report-weekly.tsx` 4.1.1 ~ 4.1.5, `report-monthly.tsx` 4.2.1 ~ 4.2.4, `clients.tsx` 2.2.1 ~ 2.2.4
- 의존성: 신규 없음

## Check

- E2E:
  1. 주간 보고 페이지 진입 → PDF 다운로드 → 파일 정상
  2. AI 다시 생성 → 콘텐츠 변경 → 인용 칩 클릭 → 원본 데이터 패널
  3. 보고 발송 → 백엔드 큐 1건 적재 확인
  4. 새 고객사 생성 → 활동 노트 추가 → 단계 변경 → 타임라인 노출
  5. CRM에서 MRR/ARR 합계 정상 계산

## Act

- 다음: PDCA-08 (알림/실시간).
