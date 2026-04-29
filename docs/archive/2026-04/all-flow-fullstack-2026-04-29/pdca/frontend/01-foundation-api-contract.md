# PDCA-01 — 기반: API 컨트랙트 정합 + 데이터 페치 표준

> Phase: 1 (Foundation) | Owner: BE+FE Lead | Status: done | Created: 2026-04-29 | Updated: 2026-04-29 (2차 sweep)
> Acceptance: 모든 화면이 단일 `api` 클라이언트를 통해 데이터를 받고, USE_MOCK 토글로 픽스처/실서버를 무중단 전환할 수 있다.
> Dependencies: PDCA-00

## Plan

- 목표: `src/lib/api.ts` 의 모든 메서드와 백엔드 OpenAPI(`openapi.yaml`) 의 1:1 매칭을 보장하고, 누락 엔드포인트를 식별·추가한다.
- 범위:
  - `src/lib/api.ts`, `src/lib/schemas.ts`, `src/lib/types.ts`
  - `openapi.yaml` ↔ 백엔드 `all-flow-backend/docs/pdca/01-foundation-openapi.md`
  - React Query 키 표준화 (`['tasks', filters]` 등)
- 결정:
  - 모든 화면은 `useQuery`/`useMutation` 으로만 데이터 접근 (직접 `fetch` 금지)
  - Zod 런타임 검증 필수, 실패 시 Sentry breadcrumb (`console.warn` 대체)
- 리스크: 픽스처와 실서버 응답 형태 불일치 → Zod 스키마가 절대 기준.

## Do

- 추가 파일:
  - `src/lib/query-keys.ts` — 표준화된 React Query 키 팩토리
  - `src/lib/api-error.ts` — 공통 에러 매퍼 (HTTP → toast)
- 수정 파일:
  - `src/lib/api.ts` — 누락 엔드포인트 추가: `updateTask`, `deleteTask`, `transitionIssue`, `createIssue`, `createApproval`, `decideApproval`, `listApprovals`, `listClients`, `createClient`, `listEvents`, `createEvent`, `listResources`, `bookResource`, `listDocs`, `createDoc`, `listChannels`, `sendMessage`, `listOrgUnits`, `inviteUser`, `revokeToken`, `markNotificationRead`, `bulkMarkRead`, `updateProfile`
  - `src/lib/schemas.ts` — 위 엔드포인트의 입출력 스키마 추가
  - `openapi.yaml` — 동일 엔드포인트 정의 추가
- 추가 의존성: 없음 (ky / zod / @tanstack/react-query 기존 사용)

## Check

- `pnpm openapi:check` 통과 (Redocly lint)
- `pnpm openapi:gen` → `src/lib/api-types.gen.ts` 갱신 후 타입 충돌 없음
- `pnpm typecheck` 통과
- `pnpm test` — 픽스처 모드/실서버 모드 양쪽에서 스모크 테스트 통과
- 수동: USE_MOCK 토글 시 25개 화면 정상 렌더 확인

## Act

- 학습: ky+zod+react-query 3축으로 모든 화면 데이터 접근 표준화.
- 다음: PDCA-02 ~ 09 가 본 컨트랙트를 신뢰하고 버튼을 와이어링.
- 메모리: `learning_frontend_api_contract.md` 로 저장.

## 2026-04-29 in-review 보고

구현 완료(체크 결과):
- 추가 파일
  - `src/lib/query-keys.ts` (90줄) — 11개 리소스 React Query 키 팩토리
  - `src/lib/api-error.ts` (78줄) — ky/Zod/Network → ApiError 매핑 + toastMessage
  - `src/lib/api/http.ts` (30줄) — ky 싱글턴 + parsed() helper 분리
  - `src/lib/api/extended.ts` (206줄) — 확장 23 엔드포인트 (mock + real)
- 수정 파일
  - `src/lib/api.ts` (162줄) — baseApi + extendedApi 병합 export
  - `src/lib/schemas.ts` (348줄) — 23 신규 zod 스키마 + 22 신규 타입
  - `openapi.yaml` — 23 신규 엔드포인트 + 13 신규 컴포넌트 + 8 신규 태그
- 게이트 결과
  - typecheck: PASS
  - test: 68/68 PASS (vitest)
  - openapi:check: 0 errors (이전 baseline 10) / 93 warnings (style만)
  - openapi:gen: PASS — `src/lib/api-types.gen.ts` 갱신
- 모든 신규 파일이 500 LOC 이내 (av-base-code-quality-gates 1.3 준수)

남은 잔여:
- USE_MOCK 토글 25 화면 수동 검증 (PDCA-02~09 와 함께 진행)
- BE-R4 작업으로 backend contract test에 23 엔드포인트 mirror 필요
