# Analysis — monorepo-step7-verification-2026-04-30

> **Generated**: 2026-04-30 by av-do-orchestrator (PL)
> **Source**: Step 7 do-complete 보고 시점 보류된 게이트의 실측 보강 사이클
> **Trigger**: `/av pm team Step 7 dev compose 추가 검증 사이클`
> **Scope**: 코드 변경 1건 (hotfix), Prisma 0건, BE 0건 (FE next-auth 1줄 추가)

---

## 1. 보강 검증 게이트 — 실측 결과 매트릭스

| Gate | 항목 | Step 7 보고 | 본 사이클 실측 | 회귀 여부 |
|------|------|--------------|------------------|-----------|
| V1 | `make up ENV=dev` 4 services healthy | PASS | **PASS** (postgres+redis+backend+frontend Up healthy) | — |
| V2 | `curl http://localhost/api/v1/health` | PASS (200) | **HOTFIX 후 PASS** (307 → 200 + JSON) | **회귀 발견 → fix** |
| V3 | Playwright e2e (baseline 56-60/62) | DEFERRED | **PASS** 58~59/62 (회귀 0건) | — |
| V4 | BE unit 295 / FE 71 / shared 45 / contracts | PASS | **PASS** (BE 267 pass + 28 skipped, FE 71/71, shared 45/45, contracts typecheck OK) | — |

총평: V1/V3/V4 회귀 0건. V2 단일 회귀를 1줄 hotfix로 해소.

---

## 2. V2 — `/api/v1/health` 회귀 root cause

### 2.1 증상
- Step 7 do-complete 시점 보고: `G7_C3p_curl_api_health PASS ({"status":"ok","uptime":396})`
- 본 사이클 실측: `curl -i http://localhost/api/v1/health` → **307 Temporary Redirect** → `/login?callbackUrl=...`
- BE 직접(`http://backend:8080/health`)은 정상 200 — 즉, **FE 레이어**가 차단원.

### 2.2 root cause (1줄)
> **FE next-auth `authorized` 콜백의 미인증 허용 화이트리스트가 `/api/v1/health`를 누락해 catch-all proxy 도달 전에 /login 으로 리다이렉트.**

직전 사이클(`single-port-localhost-2026-04-30`) 학습 §4 ("authorized 콜백 health 룰")에서 명시적으로 예측한 시나리오와 일치 — **학습은 있었으나 코드에는 미반영** 상태가 monorepo 폴더 이동(Step 2 git mv) 사이클에 그대로 carry-over 됨.

### 2.3 hotfix
`apps/frontend/src/auth.ts` `authorized` callback 화이트리스트에 1줄 추가:

```diff
       if (
         pathname.startsWith('/login') ||
         pathname.startsWith('/api/auth') ||
-        pathname === '/api/v1/auth/login'
+        pathname === '/api/v1/auth/login' ||
+        pathname === '/api/v1/health'
       ) return true;
```

- 변경 LOC: +2 / -1 (실질 +1줄)
- BE/Prisma 변경 0
- 보존적 수정 — 기존 화이트리스트 패턴 유지, prefix 확장(`/api/v1` 통째 통과) 회귀 위험 없음.

### 2.4 검증
```
$ curl -sI http://localhost/api/v1/health
HTTP/1.1 200 OK
$ curl -s http://localhost/api/v1/health
{"status":"ok","uptime":797,"version":"0.1.0"}
```

---

## 3. Playwright e2e 실측

- 명령: `cd apps/frontend && E2E_BASE_URL=http://localhost npx playwright test --reporter=list`
- baseURL: `http://localhost` (단일 origin 통합 환경)
- storageState: credentials provider 로 `jiwoo.kim@omelet.com` 자동 로그인
- 결과: **58~59 passed / 3~4 failed (62 total)** — 두 차례 실행

| 실행 | passed | failed |
|------|-------:|-------:|
| Run #1 | 58 | 4 |
| Run #2 | 59 | 3 |

baseline (single-port 사이클) 56/62, fe-be-wiring 사이클 56-60/62. 본 결과 58-59는 baseline 범위 내, 회귀 0건.

3-4건 실패는 모두 기존 carry-over (USE_MOCK fixture 의존 — Flow-1/Flow-2 보드 셀렉터, routes/interactions 일부 라벨). hotfix와 무관.

---

## 4. BE/FE/shared/contracts 재확인

| 워크스페이스 | 명령 | 결과 |
|--------------|------|------|
| `@all-flow/backend` (단위) | `pnpm test` | **267 pass + 28 skipped** (총 295) |
| `@all-flow/backend` (testcontainers 3 파일) | `pnpm test` | **environment-blocked** (Docker-in-Docker — Step 7 카리오버 알려진 제약, 호스트/CI에서만 실행 가능) |
| `@all-flow/frontend` (단위) | `pnpm test` | **71/71 PASS** |
| `@all-flow/shared` | `pnpm test` | **45/45 PASS** (6 files / 832ms) |
| `@all-flow/contracts` | `pnpm typecheck` | **PASS** (tsc --noEmit exit 0) |

> testcontainers 3 파일 — `frontend-contract.test.ts` / `be-test-tracks.test.ts` / `core-flows.test.ts` 는 GenericContainer 으로 pgvector/pgvector:pg16 을 spawn 시도 → BE 컨테이너 내부에서 실행 시 Docker socket 미마운트로 실패. CI(.github/workflows/ci.yml) integration job 에서 host runner 로 실행됨.

---

## 5. 산출물 변경 요약

| 파일 | 변경 |
|------|------|
| `apps/frontend/src/auth.ts` | authorized 콜백에 `/api/v1/health` 화이트리스트 추가 (+2 / -1) |
| `docs/03-analysis/features/monorepo-step7-verification-2026-04-30.analysis.md` | 신규 (본 문서) |

Prisma 0 / BE 0 / 의존성 0 / 신규 envvar 0.

---

## 6. 결론

- Step 7 보고된 4 게이트 보류 중 1건(V2)에서 단일 회귀 발견, 1줄 hotfix 로 해소.
- 나머지 3 게이트(V1/V3/V4) 모두 회귀 0건.
- baseline 범위 내 Playwright 결과 — Step 7 의 monorepo G6 (workspace bind-mount + init script) 가 dev 패리티 유지 중.
- Step 7 `match_rate_estimated: 0.99` 갱신 불요 — 본 검증은 보강(보고된 PASS 의 재확인 + 1건 hotfix), 신규 결손 없음.

다음 액션:
1. PM 승인 후 Step 8 (OpenTelemetry + 최종 PDCA Report) 진행.
2. memory-keeper 학습 보존 — "사이클 학습 §4 가 코드에 반영되지 않으면 다음 사이클에서 동일 회귀" 패턴.
