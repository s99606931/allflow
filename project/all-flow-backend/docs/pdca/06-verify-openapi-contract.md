# T-601 — OpenAPI 컨트랙트 일치 검증 도구

> Phase: 6 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: frontend yaml ↔ backend yaml diff = 0 도달 가능한 검증 도구 + 현재 coverage 리포트
> Dependencies: [T-102]

## Plan

- 목표: 컨트랙트 미구현/일탈을 자동 탐지하는 도구 + diff=0 도달 진행률 시각화.
- 결정/가정:
  - 단순 정적 스캔(라우트 ts → app.method('path')) 으로 충분 (Fastify 라우트 표준 패턴).
  - openapi.yaml 의 `{id}` 와 fastify 의 `:id` 정규화 후 비교.
  - 보조 도구는 `openapi:check`(생성 hash drift) + `openapi:contract`(라우트 커버리지) 양분.

## Do

- 추가 파일: `scripts/openapi-contract-check.mjs`.
- 수정 파일: `package.json` (`openapi:contract` / `openapi:contract:strict` 스크립트).
- 추가 의존성: 없음.
- 핵심:
  - 들여쓰기 기반 minimal yaml path 파서 (yaml lib 의존 회피).
  - 라우트 ts 정적 스캔: `app.(get|post|put|patch|delete)('path'`.

## Check

- 현재 coverage: 73.3% (15 contract / 11 backend match).
- 미구현(후속 태스크에서 충족 예정):
  - `GET /notifications` ← T-304
  - `POST /ai/extract-actions` ← T-403
  - `POST /reports/weekly` ← T-404
  - `POST /reports/monthly` ← T-405
- 비공개 추가(컨트랙트 외): `POST /issues`, `*/comments`, `GET /health`.
  → 백엔드 자체 추가는 정상. 단, `POST /issues` / 코멘트 4종은 차후 openapi.yaml 동기화 PR 권장.

## Act

- 학습한 패턴: 정적 스캔으로도 90% 이상 케이스 커버. dist 빌드 의존을 만들지 않아 CI 가벼움.
- 후속: T-304/403/404/405 완료 시 `--strict` 모드 통과 검증 후 `openapi:contract:strict` 를 CI 게이트로 승격.
