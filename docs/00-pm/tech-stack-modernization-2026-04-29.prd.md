# PRD — tech-stack-modernization-2026-04-29

> **Mode**: Governance-tailored PM (internal infrastructure feature)
> **Author**: av-pm-coordinator (delegated by /bkit:pdca pm)
> **Created**: 2026-04-29
> **Cycle**: PDCA — PM phase (next: `/pdca plan tech-stack-modernization-2026-04-29`)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 프로젝트 전반(BE/FE/Infra) 기술 스택과 라이브러리가 산발적으로 명시되어 있고, 최신 버전 추적과 업그레이드 결정이 사람에게 의존한다. OSS/스택 변경이 사용자 동의 없이 진행될 위험이 있고, CLAUDE.md에 권장사항·금지사항이 섞여 룰 자체가 비대해진다. |
| **Solution** | (1) 2026-04-29 기준 스택 인벤토리 + 최신 버전 매핑 산출 → 채택 적용. (2) `package.json`/`Cargo.toml`/`go.mod`/`docker-compose*.yml`/`Dockerfile`에 대한 **PreToolUse 승인 훅** 추가. (3) `CLAUDE.md`는 **금지사항만** 보존. (4) **권장사항**은 av 에이전트/스킬의 L1·L2 메모리(`.claude/agent-memory/`, `.claude/skills/{name}/MEMORY.md`)에 저장하여 학습 기반 운영. |
| **Function/UX Effect** | 메인테이너·외부 기여자·AI 에이전트 모두 단일 진실(SoT)을 통해 업그레이드 결정을 따름. 사용자는 manifest 변경 순간 명시적 승인 게이트를 받음. CLAUDE.md는 가벼워지고 룰 충돌 0%. |
| **Core Value** | **재현성 + 의도성**. 무단 의존성 추가 차단, 학습 기반 추천이 시간이 갈수록 정밀해짐, 룰과 학습이 분리되어 각각 진화 가능. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 스택 결정의 거버넌스(승인·기록·학습)가 코드/룰/메모리 어디에도 일관되게 없어, AI가 자유롭게 의존성을 추가하거나 버전을 올리는 것이 가능했음. 사용자 의도 없는 supply-chain 변경 위험. |
| **WHO** | (P1) 내부 메인테이너, (P2) 외부 OSS 기여자, (P3) AI 에이전트(av-* 전 종). 모두 동일한 승인·메모리 흐름을 따라야 함. |
| **RISK** | (R1) 훅이 너무 빡빡하면 정상 작업 흐름 차단. (R2) av 메모리에 권장사항이 누적되며 stale·conflict 발생. (R3) CLAUDE.md 정리 중 기존 메모리·룰 참조 깨짐. |
| **SUCCESS** | (S1) 스택 인벤토리 100% 식별 + 최신 버전 매핑. (S2) PreToolUse 훅이 manifest mutation 시도를 항상 사용자에게 라우팅. (S3) CLAUDE.md에 권장 표현(`권장`/`recommend`/`should consider`) 0건. (S4) av-base-deployer·av-base-memory-keeper 메모리에 stack-recommendations 항목 적재 + 검색 가능. |
| **SCOPE** | `project/all-flow-{backend,frontend,infra}` + `.claude/{hooks,rules,agents,skills,agent-memory}` + 루트 `CLAUDE.md`. 기능 코드 자체는 변경하지 않음. |

---

## 1. Problem Statement

현재 프로젝트는:

1. **인벤토리 분산**: 스택 정보가 `project/*/package.json`, `Dockerfile`, `docker-compose*.yml`에 분산. SoT 부재.
2. **최신 버전 추적 부재**: 라이브러리 버전이 마지막 업데이트 시점에 동결됨. 보안 패치·LTS 전환 누락 리스크.
3. **승인 게이트 부재**: AI(Claude Code)가 `Edit`/`Write`/`Bash` 도구로 manifest를 자유롭게 변경 가능.
4. **CLAUDE.md 비대화**: 권장과 금지가 섞여 있어 사용자/에이전트 모두 우선순위 판단이 어려움.
5. **학습 분실**: 과거 PDCA 사이클에서 도출된 스택 권장사항이 docs 또는 채팅 컨텍스트에만 남아 다음 세션에서 재발견되지 않음.

## 2. Internal Personas (3)

| ID | 페르소나 | Job-To-Be-Done | 현재 페인 |
|----|----------|----------------|-----------|
| **P1** | 내부 메인테이너 (사용자 본인) | 프로젝트 스택을 의도대로 통제하고, 무단 변경 없이 정기적으로 업그레이드한다. | 어떤 라이브러리가 왜 추가됐는지 사후 추적이 어렵다. |
| **P2** | 외부 OSS 기여자 | 첫 PR을 5분 안에 머지 가능 상태로 만든다. | manifest를 만지면 어떤 룰이 깨질지 미리 알 수 없음. |
| **P3** | AI 에이전트 (av-do-orchestrator, av-base-deployer 등) | 스택 결정 시 사용자 승인을 우회하지 않으면서, 누적된 권장사항을 학습 기반으로 적용한다. | CLAUDE.md만 읽으면 권장/금지 분리가 모호해 안전한 자동화가 어렵다. |

## 3. Beachhead & Solution Pillars

**Beachhead**: 우선 적용 영역 = **`project/all-flow-{backend,frontend,infra}` 의 manifest 5종** (package.json BE/FE, docker-compose.yml/dev/prod, Dockerfile BE+FE). 이 5종이 supply-chain 변경의 90% 이상을 점유.

3개 솔루션 기둥:

### Pillar A — 스택 인벤토리 + 최신 버전 매핑

산출물: `docs/02-design/stack-matrix-2026-04-29.md`
- 행: 라이브러리/서비스 이름
- 열: 현재 버전 / 2026-04-29 최신 stable / LTS 여부 / 채택 결정 / 변경 시 리스크
- 인프라: Postgres 16 / Redis 7 / Node 20 LTS 등 docker base image 포함
- **결정 원칙**: LTS 우선, breaking change 발생 시 별도 PDCA 사이클 분리

### Pillar B — PreToolUse 승인 훅 (`av-base-stack-approval.sh`)

트리거 조건:
- `tool_name ∈ {Edit, Write}` AND
- `tool_input.file_path` 매칭: `**/package.json`, `**/pnpm-lock.yaml`, `**/Cargo.toml`, `**/go.mod`, `**/pyproject.toml`, `**/Dockerfile*`, `**/docker-compose*.yml`, `**/.tool-versions`, `**/.nvmrc`

동작:
1. 변경 의도 분석 (현재 vs 신규 diff 추출)
2. 추가/삭제/버전변경 라이브러리 nm 목록 + 영향 라인 출력
3. 사용자에게 명시적 승인 요청 (`exit code 2` 로 차단 + `permissionDecisionReason` 메시지)
4. 사용자가 승인 시 av-base-memory-keeper에게 결정을 학습 항목으로 적재

게이트 우회: 환경 변수 `AV_STACK_APPROVAL=skip` 설정 시 (긴급 시만, av-base-auditor가 사후 감사).

### Pillar C — 룰/메모리 분리 (`CLAUDE.md` = 금지만, `av memory` = 권장)

`CLAUDE.md` 정리 정책:
- **유지**: `금지`, `MUST NOT`, `절대 ~ 안 됨`, 보안 안티패턴, supply-chain 차단 리스트
- **이전**: `권장`, `RECOMMEND`, `prefer`, `default to`, 베스트 프랙티스, 케이스별 가이드 → 아래 메모리 위치로 이전

| 메모리 종류 | 경로 | 저장 대상 |
|------------|------|----------|
| L1 (agent) | `.claude/agent-memory/av-base-deployer/MEMORY.md` | 인프라/배포/스택 버전 권장사항 |
| L1 (agent) | `.claude/agent-memory/av-base-memory-keeper/MEMORY.md` | 크로스-에이전트 학습, 결정 이력 |
| L1 (agent) | `.claude/agent-memory/av-base-auditor/MEMORY.md` | 코드 품질 권장 패턴 |
| L2 (skill) | `.claude/skills/av-base-code-quality/MEMORY.md` | lint/typecheck/build 도구 권장 |
| L2 (skill) | `.claude/skills/av-base-post-qa/MEMORY.md` | E2E/QA 도구 권장 |

**자기 진화 루프**: PDCA report 단계에서 이번 사이클의 결정/이유를 자동으로 위 메모리에 추가 → 다음 사이클 PM이 이를 컨텍스트로 로딩.

---

## 4. Decision Record Chain

| # | 결정 | 채택 | 이유 |
|---|------|------|------|
| D1 | PM 워크플로우 형태 | Governance-tailored | 시장 페르소나/TAM이 적용 안 됨 (사용자 합의) |
| D2 | Beachhead 영역 | 5종 manifest | 90% supply-chain 변경 커버 |
| D3 | 훅 트리거 시점 | PreToolUse Edit/Write only | Bash/UserPromptSubmit은 거짓양성 多, 정확도 우선 (사용자 합의) |
| D4 | CLAUDE.md 정책 | 금지만 유지 | 룰의 강제성 vs 학습의 유연성 분리 |
| D5 | 권장 저장 위치 | av 에이전트/스킬 L1·L2 메모리 | 도메인별 격리 + 자동 학습 누적 |
| D6 | 인프라 버전 정책 | LTS 우선 | 운영 안정성·보안 패치 주기 정렬 |

---

## 5. Success Criteria (S1~S6)

| ID | 기준 | 측정 방법 |
|----|------|----------|
| **S1** | 스택 인벤토리 100% 작성 | `docs/02-design/stack-matrix-2026-04-29.md` 행 수 ≥ 인벤토리 수 |
| **S2** | 최신 버전 매핑 + 채택 결정 기록 | 매트릭스의 모든 행에 `현재 / 최신 / 채택` 3컬럼 채워짐 |
| **S3** | PreToolUse 훅 작동 | `.claude/hooks/av-base-stack-approval.sh` 존재 + settings.json 등록 + manifest Edit 시 차단/승인 분기 검증 |
| **S4** | CLAUDE.md 정리 | grep 결과: `권장|recommend|prefer|should consider` 0건 (대소문자 무시) |
| **S5** | 권장사항 메모리 이전 | 위 5개 메모리 파일에 `## Stack Recommendations` 섹션 존재 + 항목 1개 이상 |
| **S6** | bkit:gap-detector match_rate ≥ 90% (Plan/Design 대비 구현) | `/pdca analyze` 결과 |

## 6. Out of Scope

- 기능 코드 자체의 리팩토링 (별도 사이클)
- 라이브러리 메이저 업그레이드 중 breaking change 처리 (별도 PDCA 사이클로 분리)
- CI/CD 파이프라인 자체 변경 (이번에는 manifest 게이트만)
- bkit/gstack 등 외부 플러그인 자체의 버전 변경 (보고만, 결정은 사용자)

## 7. Pre-mortem (Risks & Mitigations)

| Risk | Probability | Impact | Mitigation |
|------|:----------:|:------:|------------|
| 훅이 정상 흐름까지 차단 | M | H | dry-run 모드 + `AV_STACK_APPROVAL=skip` 우회 변수 + av-base-auditor 사후 감사 |
| 매트릭스 stale (시간 흐름) | H | M | PDCA report 단계에서 자동 갱신 트리거 + 분기별 정기 검토 routine 등록 |
| 메모리에 conflicting 권장 누적 | M | M | av-base-optimizer가 PDCA report 후 충돌 검사 → av-base-memory-keeper가 통합 |
| CLAUDE.md 정리 중 참조 깨짐 | L | H | 변경 전 `grep -r "CLAUDE.md"` 로 참조 위치 식별 + Plan에서 명시 처리 |
| 외부 기여자가 훅 우회 | L | H | 기여자 환경에서 `AV_STACK_APPROVAL=skip` 비활성화 (CI에서만 작동), CONTRIBUTING.md에 명시 |

## 8. Handoff to Plan

다음 단계: `/pdca plan tech-stack-modernization-2026-04-29`

Plan 단계에서 다뤄야 할 미해결 질문:

1. **Q1**: 최신 버전 조사를 WebSearch로 자동 수집할지, 사용자가 검토 후 채택할지?
2. **Q2**: pnpm-lock.yaml/package-lock.json 같은 lockfile 변경도 훅 차단 대상인가? (의존성 추가 없이 lockfile만 갱신되는 경우)
3. **Q3**: CLAUDE.md에서 메모리로 이전하는 권장사항 중 일부는 룰(`av-base-*-rules.md`)에 남기는 것이 맞을까? 분리 기준 정의 필요.
4. **Q4**: 매트릭스 갱신 주기 (분기별 / minor 버전 출시별 / 보안 advisory 발생 시)?
5. **Q5**: 훅 차단 시 사용자 승인 채널 — AskUserQuestion / 별도 approval 파일 / GitHub Issue 어느 쪽?

---

## Appendix A — 현재 인벤토리 스냅샷 (2026-04-29 시점)

> Plan 단계의 stack-matrix 작성에 사용. 최신 버전 컬럼은 Plan에서 채움.

### Backend (`project/all-flow-backend/package.json`)
- Runtime: Node ≥20.0.0, pnpm 10.33.0
- Core: fastify ^5.8.5, @fastify/jwt ^9.1.0, @fastify/sensible ^6.0.4, @fastify/websocket ^11.2.0, @prisma/client ^6.19.3, ioredis ^5.10.1, jose ^5.10.0, pino ^10.3.1, ws ^8.20.0, zod ^4.3.6, fastify-plugin ^5.1.0
- Dev: typescript ^5.7.2, vitest ^2.1.8, tsx ^4.19.2, tsup ^8.3.5, biome 1.9.4, prisma ^6.19.3, testcontainers ^11.14.0, @types/node ^22.10.0
- Container: Node 20.18.1-alpine

### Frontend (`project/all-flow-frontend/package.json`)
- Core: next 16.2.0, react 19.2.0, react-dom 19.2.0, next-auth 5.0.0-beta.30, @auth/core ^0.40.0, @tanstack/react-query ^5.83.0, zod ^4.1.0, zustand ^5.0.8, ky ^1.7.5, motion ^12.10.0, date-fns ^4.1.0
- UI: @radix-ui/* (checkbox 1.1.4, dialog 1.1.6, dropdown-menu 2.1.6, popover 1.1.6, slot 1.1.2, switch 1.1.3, tabs 1.1.3, tooltip 1.1.8), lucide-react ^0.475.0, sonner ^2.0.0, tailwind-merge ^3.0.1, class-variance-authority ^0.7.1, clsx ^2.1.1, @react-pdf/renderer ^4.3.0
- Forms: react-hook-form ^7.65.0, @hookform/resolvers ^5.0.1
- Dev: typescript ^5.7.3, eslint ^9.20.1, eslint-config-next 16.2.0, @playwright/test ^1.50.0, vitest ^2.1.9, storybook ^10.3.5, tailwindcss ^4.1.0, @tailwindcss/postcss ^4.1.0, babel-plugin-react-compiler ^1.0.0, jsdom ^26.0.0, @axe-core/playwright ^4.11.2

### Infra (`project/all-flow-infra/docker-compose.yml`)
- postgres:16-alpine
- redis:7-alpine
- backend: allflow-backend:${IMAGE_TAG}
- frontend: allflow-frontend:${IMAGE_TAG}

### .claude (현재 13 hooks 운영 중)
- av-base-precompact / av-bash-guard / av-config-watcher / av-content-scanner / av-post-write-monitor / av-prompt-sync-trigger / av-session-discovery / av-plugin-tracker / av-agent-spawn-logger / av-agent-complete-logger / av-oss-{license-check,secret-scan,sign-off}
- 신규 추가 예정: **av-base-stack-approval.sh** (Pillar B)

---

**End of PRD**

Next command: `/pdca plan tech-stack-modernization-2026-04-29`
