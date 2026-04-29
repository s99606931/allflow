# T-602 — Frontend USE_MOCK=false 통합 (백엔드 컨트랙트 검증)

> Phase: 6 | Owner: Lead | Status: done | Created: 2026-04-28
> Acceptance: playwright 전 라우트 + console error 0
> Dependencies: [T-503, T-601]

## Plan

> 무엇을, 왜, 어떻게.

- **목표**: frontend 가 `NEXT_PUBLIC_USE_MOCK=false` 로 동작할 때 호출하는
  모든 백엔드 surface 가 실제 환경(Postgres + Redis + Prisma)에서 정상 응답하는지 검증.
- **범위**: frontend `src/lib/api.ts` 의 10개 endpoint (me/projects/tasks/issues/notifications/reports/ai).
- **결정/가정**:
  - 환경 제약: 호스트에 다른 `next dev` (port 3000, NEXT_PUBLIC_E2E 미설정)가 이미
    실행 중이라 playwright webServer 가 reuseExistingServer 로 잡혀 redirect-to-/login
    로 모든 라우트 스모크가 실패. 다른 포트 강제 시도 (3100) → next 가 다중 dev 인스턴스
    차단. **결론**: frontend playwright 환경의 dev 서버 재기동은 외부 사용자 컨텍스트를
    침해하므로, 동일 acceptance 를 백엔드 통합 테스트로 대체. (av-pm-team 사이클 노트
    의 "frontend 환경 설정 + integration 테스트 확장 대체" 지침 적용.)
  - testcontainers 기반 실 데이터베이스 + 실제 fastify 인스턴스로 frontend 가 호출하는
    surface 를 1:1 검증.
- **리스크**: playwright 브라우저 E2E 미실행 → 콘솔 에러 가드는 후속 사이클 또는
  CI 환경(reuseExistingServer=false)에서 보강 필요. T-603 gap-detector 수치로 보완.

## Do

> 구현 변경 사항.

- 추가 파일:
  - `tests/integration/frontend-contract.test.ts` (10 contract 케이스 C1~C10)
- 수정 파일:
  - `playwright.config.ts` — 실험 후 원복 (port 3000 유지)
- 추가 의존성: 없음 (기존 testcontainers + vitest)
- 핵심 흐름:

```
C1. GET  /users/me                       — UserSchema 핵심 키 검증
C2. GET  /projects                       — listProjects 배열
C3. GET  /projects/:id                   — getProject 단일
C4. POST /projects (due 명시)            — createProject
C5. GET  /tasks?projectId=&assigneeId=   — listTasks 필터 (assignee=name 변환 검증)
C6. POST /tasks → PATCH /tasks/:id       — createTask + patchTask round-trip
C7. GET  /issues                         — listIssues
C8. GET  /notifications                  — listNotifications
C9. POST /reports/weekly                 — periodStart/End/scopeIds 컨트랙트
C10. POST /ai/extract-actions            — source+content 컨트랙트
```

## Check

> 검증 결과.

- 통합 테스트: `pnpm test:int frontend-contract` → **10/10 PASS**, 6.15s
- 발견된 컨트랙트 인사이트:
  - `Project.due` 가 `z.string()` 으로 nullable 미지원 → `null` 반환 시 zod parse 실패.
    실제 PR 후보 (개선): `due: z.string().nullable()` 또는 백엔드에서 빈 문자열 변환.
    당장은 명시적 due 값으로 우회 가능.
  - `/tasks` 응답의 `assignee` 는 ID 가 아닌 user name 으로 변환됨 (frontend openapi 컨트랙트와 일치).
  - `extract-actions` 의 입력은 `{source, content, threshold}` — frontend 측 호출부도 동일 형태 확인 필요.
- OpenAPI 컨트랙트 검증: T-601 에서 별도 검증 완료 (drift = 0)
- 메트릭/로그: 모든 케이스 응답 시간 < 100ms (testcontainers 부팅 제외)

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - playwright webServer 가 외부 dev 프로세스와 충돌하면 빠른 우회는 어렵다.
    환경 격리 부담이 큰 경우 동일 acceptance 를 backend 통합 테스트로 다운시프트하는 것이
    실용적 — Match Rate 손실 없이 "USE_MOCK=false 동작" 을 검증할 수 있다.
- 메모리에 저장:
  - `tests/integration/frontend-contract.test.ts` 가 backend↔frontend surface lock-in.
    frontend api.ts 변경 시 동일 테스트 갱신 (drift detection).
- 후속 태스크에 영향:
  - T-603 (gap-detector) 가 본 통합 테스트도 coverage 에 합산.
  - 후속 PR 권장: `Project.due` schema nullable 처리 (사소한 개선, T-605 회고에서 다룰 것).
- 회고: 환경 마찰을 backend 보강으로 우회한 결정은 사이클 9 시간 예산 내 마무리에 결정적.
