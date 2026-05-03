# ADR: Business Flow Stepper — Screen Coverage Decision (2026-05-03)

## Status
Accepted

## Context
2026-05-03 1차 사이클에서 5개 화면(dashboard, projects, tasks, approvals, issues)에
`BusinessFlowStepper` 를 통합했다. 후속 PDCA CHECK 단계에서 나머지 16개 화면
(calendar, hr, gantt, reports, settings, chat, docs, clients, org, users, notion,
progress, resources, notifications, admin, ai-auto) 통합 여부를 검토했다.

스텝퍼는 **선형 라이프사이클(plan → execute → close)** 을 시각화하기 위한 컴포넌트다.
모든 화면에 배치하면:
- 선형성이 없는 유틸리티 화면(설정·알림 등)에서 인지 부담만 증가시킨다.
- 같은 사용자에게 "현재 단계" 가 5개 다른 플로우로 동시에 표시되어 노이즈가 된다.
- AI 다음 단계 제안의 정확도가 떨어진다 (해당 화면이 어떤 라이프사이클에도 속하지
  않으면 BE `flow-registry` 가 의미있는 추론을 못한다).

## Decision

### 2차 통합 (4건)
업무 라이프사이클의 명확한 단계에 해당하는 화면에 추가 통합한다.

| 화면 | 매핑 플로우 | currentStep | 근거 |
|------|-----------|-------------|------|
| `gantt` | `project-lifecycle` | 동적(태스크 status 기반) | 프로젝트 실행 단계의 시각화 도구 |
| `report-weekly` | `report-lifecycle` | 동적(`report?` 유무) | 보고서 작성 흐름 정중앙 |
| `report-monthly` | `report-lifecycle` | 동적(`report?` 유무) | 보고서 작성 흐름 정중앙 |
| `docs` | `approval-lifecycle` | `archive` | 결재 마지막 단계 = 문서 보관 |

### 의도적 제외 (12건)
다음 화면은 스텝퍼를 **추가하지 않는다**. AI 가이드 위젯(`AiGuideWidget`)만 유지한다.

| 화면 | 제외 사유 |
|------|----------|
| `calendar` | 시간축 뷰. 단일 라이프사이클 단계 매핑 불가 (이벤트별 컨텍스트가 다름). |
| `hr` | 휴가/OKR/평가 등 다중 도메인. 단일 플로우로 추상화 불가. |
| `settings` | 설정/구성 화면. 비즈니스 프로세스 외부. |
| `chat` | 메시징 도구. 어떤 단계에서도 호출 가능한 cross-cutting. |
| `clients` | 마스터 데이터 관리. CRUD 카탈로그. |
| `org` | 조직도 마스터. CRUD 카탈로그. |
| `users` | 사용자 마스터. CRUD 카탈로그. |
| `notion` | 외부 통합 화면. 자체 라이프사이클 없음. |
| `progress` | 진행 상황 뷰어. dashboard 와 중복 우려. |
| `resources` | 리소스 예약. 단일 작업 사이클이 아닌 카탈로그. |
| `notifications` | 알림 인박스. cross-cutting 노티 채널. |
| `admin` | 관리자 도구. 비즈니스 사용자 플로우 외부. |
| `ai-auto` | AI 자동화 워크플로우. 자체 메타 플로우 (별도 카테고리). |

## Consequences

**긍정**:
- 16개 화면에 일률 통합했을 때 발생할 인지 부담 회피.
- AI 제안 품질 유지 (의미있는 라이프사이클 컨텍스트만 BE 로 전송).
- 5개 정적 플로우 (BE/FE 미러) 재사용 — 신규 카탈로그 추가 없음.

**부정/제약**:
- 일부 사용자는 모든 화면에서 일관된 stepper 를 기대할 수 있다.
  → 향후 사용자별 "온보딩 모드" 옵트인으로 추가 화면에 임시 stepper 노출하는 방안
    재검토 가능 (이번 사이클 범위 외).
- ai-auto 화면은 현재 매핑된 플로우가 없으나, 향후 `ai-automation-lifecycle` 플로우
  추가 시 재검토.

## Future Triggers
- 사용자 텔레메트리에서 "다음 단계 클릭률" 이 통합 4 화면에서 ≥ 20% 이면
  ai-auto/notion 등 도메인 특화 라이프사이클 추가 검토.
- 통합되지 않은 화면 사용자 만족도 NPS 가 통합 화면 대비 -10pt 이상이면
  "온보딩 모드" PRD 신설.

## References
- 1차 통합 리포트: `docs/04-report/business-flow-stepper-2026-05-03.report.md`
- BE 정적 레지스트리: `apps/backend/src/modules/business-flows/flow-registry.ts`
- FE 미러: `apps/frontend/src/lib/business-flows.ts`
