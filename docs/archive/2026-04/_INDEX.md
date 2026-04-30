# Archive Index — 2026-04

| Feature | Match Rate | Period | Status | Path |
|---------|----------:|--------|:------:|------|
| `monorepo-microservices-2026-04-30` (pnpm+Turbo 모놀레포 + MSA 분리 트리거 가이드) | 0.97 (cycle avg) | 2026-04-30 | ✅ archived | [monorepo-microservices-2026-04-30/](./monorepo-microservices-2026-04-30/) |
| `tech-stack-modernization-2026-04-29` (스택 거버넌스 + M3 P0 채택) | 0.97 | 2026-04-29 | ✅ archived | [tech-stack-modernization-2026-04-29/](./tech-stack-modernization-2026-04-29/) |
| `be-fe-mapping-fix-2026-04-29` (FE↔BE 미연결 44 EP 수렴) | BE 0.98 / FE 0.98 | 2026-04-29 | ✅ archived | [be-fe-mapping-fix-2026-04-29/](./be-fe-mapping-fix-2026-04-29/) |
| `.claude` (AutoVibe OSS 분업화) | 96.20% → ~99.2% | 2026-04-29 | ✅ archived | [dotclaude/](./dotclaude/) |
| `all-flow-fullstack-2026-04-29` (BE×FE 풀스택 종결) | 0.984 / code 100 | 2026-04-28~29 | ✅ archived | [all-flow-fullstack-2026-04-29/](./all-flow-fullstack-2026-04-29/) |
| `all-flow-infra-2026-04-28` (Docker Compose 풀스택 인프라) | 100% (자체 평가) | 2026-04-28 | ✅ archived | [all-flow-infra-2026-04-28/](./all-flow-infra-2026-04-28/) |

## monorepo-microservices-2026-04-30 요약

- **작업**: 8 Step + 1 verification 사이클 — pnpm 10 workspaces + Turborepo 2.x + packages/{contracts, shared, config-tsconfig, config-eslint} + pnpm catalog + GHA matrix + dev compose monorepo 정합 + OpenTelemetry default-off + MSA 분리 트리거 결정문서
- **결과**: cycle avg match_rate 0.97 (Step 1: 0.96, Step 2~8: 0.97~0.99), 411/411 vitest, BE 295 + FE 71 + shared 45 + contracts PASS, Playwright 58-59/62 (baseline 56-60 범위 내, 회귀 0)
- **MSA 결정**: Phase 3 풀분해 명시적 비추천 — 2026 CNCF Q1 (42% MSA→Modulith 회귀) + Amazon Prime Video 90% 비용 감소 사례 인용. Modular Monolith 유지 + OTel 측정 데이터 기반 분리 트리거 가이드(`docs/02-design/decision-records/msa-split-triggers.md`, archive 미이관 — active 유지) 제공
- **R1 Critical**: single-port localhost dev 환경 회귀 0건 (Playwright + curl http://localhost 게이트). 직전 single-port-localhost-2026-04-30 §4 학습이 Step 7 health endpoint 회귀를 사전 예측 → 1줄 hotfix(auth.ts authorized 콜백 화이트리스트)
- **종결 패턴**: 1 사이클 = 1 Step 분할 / R100 git mv 유지 / catalog dedup 1버전 / config-as-package / OTel default-off lazy import / 메모리 계층 회귀 예측
- **학습 적재**: `learning_monorepo_step{1,2,3,4,5,6,7,8}_*.md`, `learning_step7_verification_2026_04_30.md`, `learning_monorepo_microservices_2026_04_30_complete.md`
- **active 유지**: `docs/02-design/decision-records/msa-split-triggers.md` (Phase 2 트리거 측정 시 참조)
- **후속 백로그**: Vercel TURBO_TOKEN 등록 + CI 80% cache hit 실측 / `--profile observability up` 실측 / be-test-tracks.test.ts 3 carry-over typecheck / Phase 2 트리거 모니터링 (별도 사이클)

## tech-stack-modernization-2026-04-29 요약

- **작업**: manifest 거버넌스 훅(`av-base-stack-approval.sh`) + 69행 stack-matrix + 5개 메모리 Stack Recommendations + CLAUDE.md 정리 + M3 P0 FE 업그레이드
- **결과**: match_rate 0.97, S1~S7 전부 ✅, vitest 110/110 PASS
- **stack-matrix v2**: CTO 팀 실사로 8건 오류 수정 (Biome 2.4.13 GA / ESLint 10 / Node 24 LTS / Redis 8.x GA / PG 17.9 / @fastify/jwt 10 / jose 6 / tailwindcss 4.2.4)
- **M3 P0 채택**: react/react-dom 19.2.5 + next 16.2.4 + playwright 1.59.1 + tailwindcss 4.2.4 적용 완료
- **종결 패턴**: exit 2 훅 도그푸딩 / stack-matrix 실사 검증 표준화 / AI 조사 결과 실사 검증 필수
- **후속 P1**: Biome 1.9.4→2.4.13 / Node 22→24 / Redis 7→8.6.2
- **학습 적재**: `learning_tech_stack_modernization_2026_04_29.md`, `learning_stack_matrix_v2_corrections.md`


## be-fe-mapping-fix-2026-04-29 요약

- **작업**: 직전 사이클 FE↔BE 미연결 감사(P0 15건)에서 발견된 44 EP × 5축 매트릭스 수렴
- **트랙**: BE-CORE(5) + BE-NEW(8 도메인, 18 EP) + FE-WIRING(9) + TEST(8) + CLEANUP(2) = 32 Task
- **결과**: 32/32 (100%), gap BE 0.98 / FE 0.98, 5축 매트릭스 43/44 (97.7%), BE vitest 294/294 + FE playwright 29/29 PASS
- **단일 날짜**: 2026-04-29, AI 병렬 에이전트 25 iter
- **종결 패턴**: Prisma seed 필드 정합 / 병렬 에이전트 분할(BE/FE) / gap-detector 병렬 실행 / /loop 자율 진행
- **후속 백로그**: in-memory→Prisma 영속화(7 도메인), USE_MOCK=false real-BE E2E, SMTP 실연동
- **학습 적재**: `learning_be_fe_mapping_fix_test_complete.md`

## all-flow-fullstack-2026-04-29 요약

- **작업**: Backend 38 PDCA 회귀 + Phase 7 후보 5건(BE-R1~R5) + Frontend PDCA 01~10 풀 와이어링 + ESLint v9 flat 마이그레이션
- **결과**: 54/54 (100%), match_rate 0.984, code 100/100, FE 98/98 vitest + BE 188 unit + 38 integration PASS
- **종결 패턴 6**: Zero-dep 우회 (TipTap→contentEditable, i18next→shim) / 데코 1-line wiring / ESLint v9 native flat / contract mirror 정적 회귀 가드 / 단일 host dev 마찰 우회 / OpenAPI path-as-method 정합화
- **신규 의존성**: `@axe-core/playwright`, `@eslint/eslintrc`, `@eslint/js` (모두 dev)
- **학습 적재**: 4건 (`learning_pdca_2026_04_29_pm_team.md`, `learning_pdca_2nd_sweep.md`, `learning_fe_5th_sweep_complete.md`, `learning_pdca_2026_04_29_complete.md`)
- **커밋**: `c961e18` (48 files, +3207/-55)

> **통합 관리 정책 (2026-04-29 변경)**: 종결된 사이클의 PDCA 본문은 archive 한 곳에 통합 보관한다.
> 본 archive 디렉토리는 다음을 모두 포함한다:
> - `PDCA-MASTER-TRACKING.md` (사이클 SSoT)
> - `pdca/backend/` (BE 38 PDCA + _TEMPLATE)
> - `pdca/frontend/` (FE 11 PDCA + README)
> - `MASTER-TRACKING.snapshot.md`, `report.md`, `qa-report.md` (종결 산출물)
>
> 이전 정책(라이브 본문은 `project/.../docs/pdca/` 보존)은 폐기. `git mv`로 히스토리 보존됨.

### 신규 사이클 PDCA 라이프사이클 (2026-04-29 결정)

```
[Active]   project/all-flow-{stack}/docs/pdca/{NN-name}.md         ← 사이클 진행 중
              ↓  PM 최종 승인 + report 작성 완료
[Archive]  docs/archive/{YYYY-MM}/{cycle-slug}/pdca/{stack}/{NN-name}.md
                                              + PDCA-MASTER-TRACKING.md
                                              + report.md / qa-report.md
                                              + MASTER-TRACKING.snapshot.md
```

**규칙**:
1. 새 사이클 시작 시 `project/all-flow-{stack}/docs/pdca/` 디렉토리 재생성 + 신규 `PDCA-MASTER-TRACKING.md`를 `project/` 루트에 작성
2. 사이클 종결(PM 승인 + report) 직후 `git mv`로 archive 디렉토리에 일괄 이동 (히스토리 보존)
3. archive 직후 `_INDEX.md`에 신규 사이클 항목 추가
4. 라이브 디렉토리(`project/.../docs/pdca/`)는 archive 시점 이후 비어있어야 함 — 다음 사이클 시작까지 빈 상태 유지 또는 `.gitkeep` 미사용(빈 폴더 자동 정리)

## all-flow-infra-2026-04-28 요약

- **작업**: ALL-Flow 풀스택 Docker Compose 인프라(frontend/backend/postgres/redis 4서비스, base+dev+prod overlay, 헬스체크 의존 그래프, Makefile 12 타겟, 운영 스크립트)
- **결과**: PDCA 5/5, 정적 검증(`docker compose config`) PASS, 시크릿 평문 0, 자체 gap 평가 100%
- **승인**: PM/PL/QA 모두 ✅ (`05-report.md` Status: Approved)
- **종결 패턴 6** (`05-report.md §4` 메모리 후보):
  1. base + overlay 분리 — 환경 격리의 가장 단순한 형태
  2. `--env-file` + 컨테이너 내부 URL 조립 — 시크릿 스캐너 회피
  3. WSL2 hot reload — `CHOKIDAR_USEPOLLING + WATCHPACK_POLLING`
  4. `${VAR:?msg}` — compose-time 시크릿 누락 차단
  5. fallback Dockerfile — 인프라 단독 검증 가능
  6. `read_only + tmpfs` — prod 컨테이너 표면 축소 표준 조합
- **후속 백로그**: BE-1(`/health` 표준 응답), FE-1(`output: 'standalone'`), INFRA-2(CI 이미지 빌드+smoke), INFRA-3(observability overlay), INFRA-4(secrets manager 통합), INFRA-5(reverse proxy overlay), INFRA-6(자동 백업 cron+S3)

## .claude 요약

- **작업**: AutoVibe OSS 6트랙(Dev/Test/Docs/Review/Security/Release) 분업화
- **산출물**: 25 신규 (agents 6 + skills 4 + hooks 3 + rule 1 + .github 7 + root 3 + meta 4 정리)
- **개선**: Minor 6건 후속 수정 → 정합성 5계층 일관 달성
- **Success Criteria**: 8/8 (100%)
- **학습 적재**: 2건 (`learning_oss_track_split.md`, `learning_oss_gap_analysis.md`)

> 정식 PRD/Plan/Design 문서는 작성하지 않았으며, `.claude/rules/av-oss-collab-protocol.md`가
> de-facto Design 문서 역할을 수행했음. (메타 컴포넌트 작업 특성)
