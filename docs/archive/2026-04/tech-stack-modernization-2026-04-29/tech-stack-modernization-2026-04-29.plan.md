# Plan — tech-stack-modernization-2026-04-29

> **Phase**: PDCA Plan (next: `/pdca design tech-stack-modernization-2026-04-29`)
> **Architecture**: Option C — Pragmatic Balance
> **Scope**: Manifest-only (PRD beachhead 유지)
> **PRD ref**: [docs/00-pm/tech-stack-modernization-2026-04-29.prd.md](../../00-pm/tech-stack-modernization-2026-04-29.prd.md)
> **Created**: 2026-04-29

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AI 에이전트가 `Edit`/`Write` 도구로 manifest(`package.json`/`Dockerfile`/`docker-compose*.yml`) 변경 시 사용자 승인 게이트가 없음. CLAUDE.md에 권장·금지가 섞여 룰이 비대. 권장사항이 세션 종료 시 휘발. |
| **Solution** | (1) PreToolUse 훅 1개(`av-base-stack-approval.sh`) 신규 + `settings.json` 1행 등록, (2) 2026-04-29 기준 stack-matrix 작성·채택, (3) `CLAUDE.md` → 권장 표현 grep 0건으로 정리, (4) 권장사항을 5개 av 메모리 파일에 `## Stack Recommendations` 섹션으로 적재. |
| **Function/UX Effect** | manifest mutation 시도 → 훅이 diff 추출 + AskUserQuestion 발동 → 승인 시 진행, 거부 시 차단 + 거부 사유를 av-base-memory-keeper에 학습. CLAUDE.md는 금지 100%. |
| **Core Value** | **재현성 + 의도성 + 학습**. 무단 supply-chain 변경 0건, 룰/학습 분리로 양쪽이 독립 진화, AI 에이전트의 자유도는 보존하되 critical path만 게이트. |

---

## Context Anchor

(PRD에서 그대로 이전 — Design 단계로 추가 전파)

| Key | Value |
|-----|-------|
| **WHY** | 스택 결정 거버넌스(승인·기록·학습) 부재로 AI가 자유롭게 의존성 변경 가능 → supply-chain 위험. |
| **WHO** | P1 메인테이너 / P2 외부 기여자 / P3 AI 에이전트(av-* 전 종) |
| **RISK** | R1 훅 과차단 / R2 메모리 stale / R3 CLAUDE.md 정리 중 참조 깨짐 |
| **SUCCESS** | S1~S6 (§4 참조) |
| **SCOPE** | manifest 5종 + `.claude/{hooks,rules,agents,skills,agent-memory}` + 루트 `CLAUDE.md` |

---

## 1. Requirements (사용자 확정)

| ID | 요구사항 | 출처 |
|----|---------|------|
| R-1 | manifest 5종(`package.json`, `pnpm-lock.yaml`, `Dockerfile*`, `docker-compose*.yml`, `.tool-versions`/`.nvmrc`)에 대한 PreToolUse 승인 훅 추가 | PRD Pillar B |
| R-2 | 2026-04-29 기준 BE/FE/Infra 스택 인벤토리 + 최신 stable 버전 매핑 매트릭스 작성 | PRD Pillar A |
| R-3 | 매트릭스에 따라 채택할 버전을 결정하고 manifest에 반영 (단, R-1 훅을 통해 사용자 승인) | 사용자 강조 |
| R-4 | `CLAUDE.md` → 금지사항만 유지 (`grep -iE "권장|recommend|prefer|should consider"` 0건) | PRD Pillar C |
| R-5 | 권장사항을 5개 av 메모리 파일의 `## Stack Recommendations` 섹션으로 이전 | PRD Pillar C |
| R-6 | 인프라 버전(postgres/redis/node base image) 동일 매트릭스에 포함 + LTS 우선 | PRD D6 |
| R-7 | "AI 에이전트 무분별 코드 수정 방지" — 훅 거부 시 거부 사유를 메모리에 학습 | 사용자 강조 |

## 2. Architecture Decision: Option C — Pragmatic Balance

### 2.1 비교 요약 (기록용)

| 옵션 | 신규 파일 | 변경 깊이 | 선택 |
|-----|:--------:|:--------:|:---:|
| A — Minimal | 0 (av-bash-guard 확장) | 낮음 | ✗ — av-base-* 도메인 분리 원칙 약화 |
| **C — Pragmatic** | **1 (`av-base-stack-approval.sh`)** | 중간 | **✓** |
| B — Clean | 8+ (av-base-harness/ 신규 디렉) | 높음 | ✗ — 신규 파일 과다 |

### 2.2 채택 옵션 (C) 구조

```
.claude/
├── hooks/
│   ├── av-base-stack-approval.sh        ← 신규 (단일)
│   └── (기존 13 hooks 유지)
├── settings.json                         ← PreToolUse 매처 1행 추가
├── agent-memory/
│   ├── av-base-deployer/MEMORY.md       ← `## Stack Recommendations` 섹션
│   ├── av-base-memory-keeper/MEMORY.md  ← `## Stack Recommendations` 섹션
│   └── av-base-auditor/MEMORY.md        ← `## Stack Recommendations` 섹션
└── skills/
    ├── av-base-code-quality/MEMORY.md   ← 신규 파일 + `## Stack Recommendations`
    └── av-base-post-qa/MEMORY.md        ← 신규 파일 + `## Stack Recommendations`

docs/02-design/
└── stack-matrix-2026-04-29.md           ← 신규 (R-2)

CLAUDE.md                                 ← 권장 표현 제거 (R-4)
```

**원칙**:
- 기존 `av-bash-guard.sh`는 Bash 패턴 차단을 계속 담당 (codegen 영역 별도 사이클로 분리)
- 신규 훅은 PreToolUse Edit/Write **only** — Bash 명령(npm install 등)은 R-1 범위 외
- av-base-* 도메인 분리: hook, rule, agent, skill, memory 모두 같은 av-base-* prefix 유지

## 3. Open Questions Resolution (PRD Q1~Q5)

| Q | 결정 | Plan 반영 |
|---|------|----------|
| Q1 최신 버전 조사 | **자동 수집(WebSearch) + 사용자 검토** — 매트릭스 작성 시 후보 자동 제시, 채택은 사용자 승인 | Design §3 stack-matrix 채움 절차 |
| Q2 lockfile 변경 | **차단 대상에서 제외, 메시지 알림만** — `pnpm-lock.yaml`/`package-lock.json`은 의존성 추가 없는 갱신이 잦음 | 훅 매처에서 lockfile 제외, 단 stdout에 변경 사실 안내 |
| Q3 룰 vs 메모리 분리 기준 | **"관계자 전원에게 적용되면 룰, 학습 누적이면 메모리"** — 절대 금지 = 룰, 시간에 따라 진화 = 메모리 | CLAUDE.md 정리 시 분류표 적용 |
| Q4 매트릭스 갱신 주기 | **분기별 + CVE/security advisory 발생 시** — Cron `0 0 1 */3 *` + Dependabot/CVE webhook | Design §6 갱신 트리거 |
| Q5 훅 차단 시 승인 채널 | **AskUserQuestion (명시적)** — 별도 파일/Issue는 latency 높음, AI 컨텍스트 안에서 즉시 승인 | 훅 스크립트 내 stdout JSON으로 AskUserQuestion 트리거 |

## 4. Success Criteria

| ID | 기준 | 측정 |
|----|------|------|
| **S1** | 스택 인벤토리 100% 작성 | `docs/02-design/stack-matrix-2026-04-29.md` 행 수 ≥ 인벤토리 항목 수 (BE 22 + FE 38 + Infra 4 + Tooling 5 = ~69행) ✅ |
| **S2** | 최신 버전 매핑 + 채택 결정 기록 | 매트릭스 모든 행 `현재 / 최신 / 채택 / 비고` 4컬럼 ✅ (v2 실사 8건 수정 포함) |
| **S3** | PreToolUse 훅 작동 | `.claude/hooks/av-base-stack-approval.sh` 실행권한 + `settings.json` 등록 + manifest Edit 시 차단/승인 분기 검증 (수동 + 자동 테스트) |
| **S4** | CLAUDE.md grep 결과 0건 | `grep -iE "권장|recommend|prefer|should consider" /data/allflow/CLAUDE.md` exit 1 |
| **S5** | 메모리 5파일에 `## Stack Recommendations` 섹션 + 항목 ≥1 | `grep -l "## Stack Recommendations"` 결과 5개 |
| **S6** | bkit:gap-detector match_rate ≥ 90% | `/pdca analyze` 실행 결과 |
| **S7** (신규) | 거부 사유 학습 | 훅 거부 1건 발생 시 `av-base-memory-keeper/MEMORY.md`에 항목 추가됨 |

## 5. Implementation Tasks (Design 단계 입력)

> Design 단계에서 모듈 매핑 후 `/pdca do --scope module-N` 으로 분할 가능.

### Module 1 — stack-matrix 작성 ✅ (v2 수정 완료)

> **v2 갱신 (2026-04-29)**: CTO 팀 실사로 8건 오류 수정. 주요 발견:
> - Biome: "2.0.x RC"(오류) → 실제 **2.4.13 stable**
> - ESLint: "9.x latest"(오류) → 실제 **10.2.1 GA**
> - Redis: "7.x Early Access"(오류) → **8.6.2 GA**
> - Node.js: 22.x Active LTS(오류) → **24.x Active LTS** (22.x는 Maintenance)
> - PostgreSQL: "16.x latest"(오류) → **17.9 latest stable**
> - @fastify/jwt: "9.x latest"(오류) → **10.0.0 GA**
> - jose: "5.x latest"(오류) → **6.2.3 GA**
> - @auth/core: "0.40.x"(오류 가능) → npm latest **0.34.x** (검증 필요)

- ~~T-101: BE/FE/Infra/Tooling 인벤토리 행 수집~~ **완료**
- ~~T-102: WebSearch로 각 항목 2026-04-29 기준 최신 stable 버전 조사~~ **완료 (v2 실사 포함)**
- ~~T-103: LTS 여부 표기 + 채택 결정 컬럼 채움~~ **완료**
- ~~T-104: `docs/02-design/stack-matrix-2026-04-29.md` 작성~~ **완료 + v2 수정**

### Module 2 — `av-base-stack-approval.sh` 훅
- T-201: `.claude/hooks/av-base-stack-approval.sh` 작성 (PreToolUse 입력 JSON 파싱 → file_path 매처 → diff 추출 → AskUserQuestion 트리거)
- T-202: 매처 패턴: `**/package.json`, `**/Dockerfile*`, `**/docker-compose*.yml`, `**/.tool-versions`, `**/.nvmrc` (lockfile 제외 명시)
- T-203: 우회 변수 `AV_STACK_APPROVAL=skip` (긴급 시) + av-base-auditor 사후 감사 hook
- T-204: 거부 시 사유를 `.claude/agent-memory/av-base-memory-keeper/MEMORY.md` 에 append (T-401과 연동)
- T-205: `.claude/settings.json` PreToolUse matchers 배열에 1행 추가
- T-206: 실행권한 부여 + 단위 테스트 (mock JSON 입력으로 차단/승인 분기 검증)

### Module 3 — manifest 채택 적용 (R-3)
- T-301: stack-matrix 채택 컬럼 기반으로 BE `package.json` 업데이트 — **훅을 통한 사용자 승인** (도그푸딩)
- T-302: FE `package.json` 동일
- T-303: `docker-compose.yml` (postgres/redis 이미지 태그) 업데이트
- T-304: `Dockerfile` ARG NODE_VERSION/PNPM_VERSION 정렬

### Module 4 — 메모리 5파일 정비
- T-401: `.claude/agent-memory/av-base-deployer/MEMORY.md` `## Stack Recommendations` 신설 (인프라/배포 권장)
- T-402: `.claude/agent-memory/av-base-memory-keeper/MEMORY.md` `## Stack Recommendations` 신설 (크로스 학습 + 거부 사유 누적용 entry 형식)
- T-403: `.claude/agent-memory/av-base-auditor/MEMORY.md` `## Stack Recommendations` 신설 (코드 품질 권장)
- T-404: `.claude/skills/av-base-code-quality/MEMORY.md` 신규 파일 + 섹션
- T-405: `.claude/skills/av-base-post-qa/MEMORY.md` 신규 파일 + 섹션

### Module 5 — `CLAUDE.md` 정리 (R-4)
- T-501: `grep -iE "권장|recommend|prefer|should consider"` 결과 모든 라인 식별
- T-502: 분류표(룰=관계자 전원 적용 / 메모리=학습 누적) 따라 각 라인 이전 결정
- T-503: 메모리 이전 라인은 해당 도메인 메모리 파일에 추가 (Module 4 파일과 중복 시 통합)
- T-504: 룰 잔류 라인은 표현을 금지형으로 재작성 (`권장한다` → `~ 외 사용 금지`)
- T-505: 최종 grep 0건 검증

### Module 6 — 매트릭스 갱신 자동화 (Q4)
- T-601: `bkit:rollback` 또는 cron routine으로 분기별 트리거 등록 (`stack-matrix-refresh-2026-Q3` 등)
- T-602: CVE webhook 수신 시 트리거 (선택 — Plan에서는 manual fallback만 정의)

## 6. Out of Scope

- **이번 사이클 외**: Bash 명령(`npm install`, `docker pull` 등)을 통한 의존성 추가 차단 (PRD Q2 → 다음 사이클)
- 코드 일반(서비스/도메인 코드) 수정에 대한 광범위 가드 (사용자 답변 = manifest-only)
- 라이브러리 메이저 업그레이드 시 breaking change 처리 (별도 PDCA 분리)
- bkit/gstack 등 외부 플러그인 자체 버전 결정 (보고만)
- CI/CD 파이프라인 자체 변경

## 7. Risks (PRD Pre-mortem 보강)

| Risk | Mitigation | Owner |
|------|-----------|------|
| 훅 과차단 (R1) | dry-run 모드(`AV_STACK_APPROVAL=dry`) + 우회 변수 + 첫 1주 모니터링 | av-base-auditor |
| 메모리 stale (R2) | 분기별 routine + av-base-optimizer 충돌 검사 | av-base-memory-keeper |
| CLAUDE.md 참조 깨짐 (R3) | 변경 전 `grep -r "CLAUDE.md"` 참조 위치 식별 → Module 5 작업 전 백업 | av-base-sync-auditor |
| 거부 사유 학습이 폭증해 메모리 비대 | av-base-optimizer가 분기별로 동일 사유 통합 | av-base-optimizer |
| WebSearch 최신 버전 조사 실패/오답 | 각 후보에 npm/docker hub 공식 페이지 URL 첨부, 사용자 최종 확인 | (자동 + 사용자) |

## 8. Test/Validation Plan

### L1 — Unit
- 훅 스크립트에 mock JSON 입력 (PreToolUse Edit on `package.json`) → exit 2 + permissionDecisionReason 출력 검증
- 훅 스크립트에 mock JSON 입력 (lockfile 변경) → exit 0 (제외 매처)
- `AV_STACK_APPROVAL=skip` 환경에서 → exit 0 (우회)

### L2 — Integration (도그푸딩)
- Module 3에서 실제 manifest 업데이트 시 훅이 발동되는지 시각 확인
- AskUserQuestion 응답에 따라 진행/차단 분기 정상

### L3 — Acceptance
- `/pdca analyze` 매치율 ≥ 90%
- `grep -iE "권장|recommend|prefer|should consider" CLAUDE.md` exit 1
- `find .claude -name "MEMORY.md" -path "*av-base-*" | xargs grep -l "## Stack Recommendations" | wc -l` ≥ 5

## 9. Decision Record Chain (PRD → Plan)

| # | 결정 | 채택 | 단계 | 이유 |
|---|------|------|------|------|
| D1 | PM 모드 | Governance-tailored | PM | 시장 페르소나 미적용 |
| D2 | Beachhead | manifest 5종 | PM | 90% supply-chain 커버 |
| D3 | 훅 시점 | PreToolUse Edit/Write only | PM | Bash/UserPromptSubmit 거짓양성 |
| D4 | CLAUDE.md 정책 | 금지만 | PM | 룰/학습 분리 |
| D5 | 권장 위치 | av L1·L2 메모리 5파일 | PM | 도메인 격리 + 학습 누적 |
| D6 | 인프라 정책 | LTS 우선 | PM | 운영 안정성 |
| **D7** | **하네스 범위** | **Manifest-only 유지 (사용자 확정)** | **Plan** | **광범위 가드는 다음 사이클** |
| **D8** | **Architecture** | **Option C — Pragmatic** | **Plan** | **신규 1파일, 균형 적합** |
| **D9** | **lockfile 정책** | **차단 제외, 알림만** | **Plan** | **Q2 — 갱신 빈도 高** |
| **D10** | **룰/메모리 분리 기준** | **"전원 적용=룰, 학습 누적=메모리"** | **Plan** | **Q3** |
| **D11** | **갱신 주기** | **분기별 + CVE 트리거** | **Plan** | **Q4** |
| **D12** | **승인 채널** | **AskUserQuestion (명시적)** | **Plan** | **Q5 — latency 최소** |
| **D13** | **거부 사유 학습** | **memory-keeper에 append** | **Plan** | **R-7 사용자 강조 반영** |

## 10. Handoff to Design

다음 단계: `/pdca design tech-stack-modernization-2026-04-29`

Design 단계에서 산출:
1. `docs/02-design/stack-matrix-2026-04-29.md` 의 컬럼 구조와 채움 절차
2. `av-base-stack-approval.sh` 의 입출력 스펙 (PreToolUse JSON contract)
3. `settings.json` 의 PreToolUse matcher 정확한 패턴
4. 5개 메모리 파일의 `## Stack Recommendations` 섹션 표준 schema
5. CLAUDE.md 분류 룰 (룰 잔류 vs 메모리 이전 결정 트리)
6. Session Guide: Module 1~6 분할로 `/pdca do --scope module-N` 가능

---

**End of Plan**
