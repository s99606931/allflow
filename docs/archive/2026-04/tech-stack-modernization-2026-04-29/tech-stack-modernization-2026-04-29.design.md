# Design — tech-stack-modernization-2026-04-29

> **Phase**: PDCA Design (next: `/pdca do tech-stack-modernization-2026-04-29 --scope module-3`)
> **Architecture**: Option C — Pragmatic Balance (Plan §2.2 확정, 본 문서에서 Checkpoint 3 생략)
> **As-built reconciliation**: M1/M2/M4/M5 산출물 검증 완료, M3 부분 pending, M7/M8 신규
> **Plan ref**: [docs/01-plan/features/tech-stack-modernization-2026-04-29.plan.md](../../01-plan/features/tech-stack-modernization-2026-04-29.plan.md)
> **Created**: 2026-04-29

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | AI 에이전트의 무단 manifest 변경 차단 + 룰/학습 분리. |
| **WHO** | P1 메인테이너 / P2 외부 기여자 / P3 AI 에이전트(av-* 전 종) |
| **RISK** | R1 훅 과차단 / R2 메모리 stale / R3 CLAUDE.md 참조 깨짐 / **R4(신규) Node 22 LTS 전환 시 native dep ABI 비호환** |
| **SUCCESS** | S1~S7 (Plan §4) — 현재 S1·S2·S4·S5·S6 PASS, S3 부분 PASS, S7 검증 대기 |
| **SCOPE** | manifest 5종 + `.claude/{hooks,rules,agents,skills,agent-memory}` + 루트 `CLAUDE.md` |

---

## 1. Overview

본 Design은 **two-fold**:

1. **As-built spec** — 이전 사이클이 산출한 M1/M2/M4/M5의 **실제 구조**를 형식화하여 향후 유지보수 기준으로 동결한다.
2. **Forward spec** — 미해결된 M3 P0 manifest 채택 + 신규 M7(dry-mode) + M8(quarterly cron) 의 구현 스펙을 정의한다.

기존 사이클 학습 자료(`learning_tech_stack_modernization_2026_04_29.md`)의 6 패턴을 Design 의 정합 기준으로 흡수한다.

## 2. As-Built State (검증 결과)

| 산출물 | 위치 | 상태 | 검증 결과 |
|--------|------|:----:|----------|
| Hook 스크립트 | `.claude/hooks/av-base-stack-approval.sh` (73 lines) | ✅ EXIST | python3 stdin 파싱 + is_manifest 매처 + AV_STACK_APPROVAL=skip + memory append + exit 2 |
| settings.json 등록 | `.claude/settings.json` PostToolUse 매처 | ✅ EXIST | `$CLAUDE_PROJECT_DIR/.claude/hooks/av-base-stack-approval.sh` 1행 |
| Stack matrix | `docs/02-design/stack-matrix-2026-04-29.md` (121 lines) | ✅ EXIST | BE 22 + FE 38 + Infra 4 + Tooling 5 인벤토리, 각 행에 현재/최신/채택/비고 4컬럼 |
| Agent memory 1 | `.claude/agent-memory/av-base-deployer/MEMORY.md` | ✅ HAS `## Stack Recommendations` | — |
| Agent memory 2 | `.claude/agent-memory/av-base-memory-keeper/MEMORY.md` | ✅ HAS `## Stack Recommendations` | 훅 거부 사유 append 형식 적용됨 |
| Agent memory 3 | `.claude/agent-memory/av-base-auditor/MEMORY.md` | ✅ HAS `## Stack Recommendations` | — |
| Skill memory 1 | `.claude/skills/av-base-code-quality/MEMORY.md` | ✅ EXIST | — |
| Skill memory 2 | `.claude/skills/av-base-post-qa/MEMORY.md` | ✅ EXIST | — |
| CLAUDE.md 정리 (S4) | `/data/allflow/CLAUDE.md` | ✅ PASS | `grep -ic "권장\|recommend\|prefer\|should consider"` = **0** |

**결론**: Plan의 Module 1, 2, 4, 5는 사실상 완료. Module 6(매트릭스 갱신 자동화)은 미착수 → M8로 재명명·재정의.

## 3. Hook Contract (Formal Spec — As-built 동결)

### 3.1 PreToolUse JSON I/O 계약

**입력 (stdin)**:
```json
{
  "tool_name": "Edit" | "Write",
  "tool_input": {
    "file_path": "<absolute path>",
    "old_string": "...",
    "new_string": "..."
  }
}
```

**출력**:
| 분기 | exit code | stdout | stderr |
|------|:--------:|--------|--------|
| 패스스루 (non-manifest, non-Edit/Write, lockfile, node_modules) | `0` | (없음) | (없음) |
| Skip 우회 (`AV_STACK_APPROVAL=skip`) | `0` | (없음) | `⚠️ AV_STACK_APPROVAL=skip 우회 모드` |
| 차단 (manifest 매치) | `2` | `⚠️ manifest 변경 감지: <path>` + 사용자 안내 | (없음) |

**부수 효과**:
- 차단 시 `<PROJECT_DIR>/.claude/agent-memory/av-base-memory-keeper/MEMORY.md` 끝에 1행 append:
  ```
  - <ISO-8601 ts> | <file_path> | manifest 변경 차단 | 사유: 사용자 승인 대기
  ```
- PROJECT_DIR 계산 = `SCRIPT_DIR/../..` (CLAUDE_PROJECT_DIR 환경변수 미의존 — 학습 패턴 #2)

### 3.2 매처 매트릭스 (is_manifest 함수)

| 패턴 | 차단 |
|------|:---:|
| `*/node_modules/*` 포함 | ✗ (passthrough) |
| `*pnpm-lock.yaml`, `*package-lock.json`, `*yarn.lock` | ✗ (Plan D9 lockfile 정책) |
| `*/package.json` | ✓ |
| `*/Dockerfile*` | ✓ |
| `*/docker-compose*.yml` | ✓ |
| `*/.tool-versions`, `*/.nvmrc` | ✓ |
| 그 외 | ✗ |

### 3.3 settings.json 등록 (As-built)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/av-base-stack-approval.sh" }
        ]
      }
    ]
  }
}
```

(현재 `PostToolUse` 매처 그룹 안에 잘못 들어가 있다면 수정 필요 — `## 7 Validation` 참조)

## 4. Stack Matrix Schema (Formal Spec — As-built 동결)

### 4.1 컬럼 구조

| 컬럼 | 타입 | 필수 | 의미 |
|------|------|:---:|------|
| 패키지 | string (markdown bold) | ✓ | npm/docker hub 식별자 |
| 현재 버전 | string (semver) | ✓ | 코드베이스 manifest의 현재 값 |
| 최신 stable (2026-04-29) | string | ✓ | 매트릭스 작성일 기준 stable major.minor |
| 채택 | enum {`현재 유지`, `<target version>`, `현재 유지 (사유)`} | ✓ | 채택 결정 — 변경 시 M3 트리거 |
| 비고 | markdown | — | 사유, 호환성 메모, LTS 일정 |

### 4.2 섹션 구조

```
1. BE — Node.js Ecosystem (22행)
2. FE — Next.js + React Ecosystem (38행)
3. Infra — Container Images (4행)
4. Tooling — Build/Lint/Test (5행)
5. Summary by Priority (P0/P1/P2 우선순위표)
```

### 4.3 갱신 트리거 (Plan Q4 → M8)

- **분기별 자동**: cron `0 0 1 */3 *` (다음: 2026-Q3 = 2026-07-01)
- **CVE/security advisory 발생 시**: Dependabot 알림 → 매트릭스 영향 행 marked-for-review
- **메이저 출시 감지**: WebSearch 정기 실행 (M8 routine)

## 5. Memory `## Stack Recommendations` 섹션 Schema

### 5.1 5개 메모리 파일 공통 형식

```markdown
## Stack Recommendations

> 자동 학습 영역. PDCA report 단계에서 누적되며 av-base-optimizer가 분기별 충돌 검사.

### 권장 패턴
- <pattern_id>: <one-line description>
  - **사유**: <why>
  - **적용**: <when/where>

### 거부 사유 로그 (av-base-memory-keeper만 해당)
- <ISO-8601 ts> | <file_path> | manifest 변경 차단 | 사유: <reason>
```

### 5.2 도메인별 차별화

| 메모리 파일 | 책임 도메인 | 예시 항목 |
|------------|-----------|----------|
| `av-base-deployer/MEMORY.md` | 인프라/배포/스택 버전 | "Node 22 LTS 전환 (2026-04-29 채택)" |
| `av-base-memory-keeper/MEMORY.md` | 크로스 학습 + 거부 로그 | 훅 차단 ts/path 로그 + 학습 패턴 |
| `av-base-auditor/MEMORY.md` | 코드 품질 권장 | "Biome v1 exact pin, v2 RC 출시 시 재평가" |
| `av-base-code-quality/MEMORY.md` (skill) | lint/typecheck/build | "TS 6 major 호환성 검토 별도 사이클" |
| `av-base-post-qa/MEMORY.md` (skill) | E2E/QA | "Vitest 4 major 호환성 검토 별도 사이클" |

## 6. Module Specifications

### 6.1 M3 — Manifest 채택 적용 (P0 pending) 🔴

매트릭스의 `채택` 컬럼이 `현재 유지`가 아닌 행만 적용 대상.

**As-built P0 잔존 항목 (2건)**:

| # | 파일 | 현재 | 목표 | 영향 |
|---|------|------|------|------|
| M3-1 | `project/all-flow-backend/Dockerfile` ARG NODE_VERSION | `20.18.1` | `22.<latest>` LTS | BE 컨테이너 base image. Node 20 LTS는 2026-04 종료. native dep ABI 재컴파일 필요(prisma binary, ws compression 등) |
| M3-2 | `project/all-flow-frontend/package.json` devDep | `@playwright/test ^1.50.0` | `^1.52.0` | FE E2E 프레임워크. minor bump, breaking change 없음 |

**구현 절차** (각 항목마다):
1. 사용자에게 변경 의도 요약 제시 (현재→목표, 영향)
2. AskUserQuestion 으로 승인 요청
3. 승인 시 Edit 도구 사용 → **av-base-stack-approval.sh 훅이 자동 차단** (도그푸딩)
4. 사용자가 `AV_STACK_APPROVAL=skip` 으로 우회 OR 훅이 AskUserQuestion을 다시 트리거하면 명시 승인
5. 적용 후 BE: `docker build` 검증 / FE: `pnpm install && pnpm e2e:install` 검증
6. 결정을 `av-base-deployer/MEMORY.md` `## Stack Recommendations` 에 append

**도그푸딩 가치**: M3 자체가 훅의 실효성 검증 시나리오. 훅이 우리의 변경을 차단하지 못하면 S3 부분 PASS는 fail로 강등.

### 6.2 M7 — Dry-Mode 추가 (신규)

**목적**: 첫 1주 모니터링 + 외부 기여자 환경에서 학습 모드.

**스펙**:
- 환경변수 `AV_STACK_APPROVAL=dry`
- 동작: manifest 매치 시 차단(exit 2) 대신 **stderr 경고 + memory append + exit 0** (passthrough)
- 메모리 항목 prefix: `dry-mode:` 로 구분

**구현 위치**: `av-base-stack-approval.sh` line 56~59 사이에 분기 추가:
```bash
if [[ "${AV_STACK_APPROVAL:-}" == "dry" ]]; then
  printf -- '- %s | %s | dry-mode: manifest 변경 감지(미차단)\n' "$TS" "$FILE_PATH" >> "$MEMORY_FILE"
  echo "ℹ️  [dry-mode] manifest 변경 감지: $FILE_PATH" >&2
  exit 0
fi
```

### 6.3 M8 — Quarterly Stack Matrix Refresh Cron (신규, M6 재명명)

**Cron 등록**:
- 스케줄: `0 0 1 */3 *` (분기 첫날 00:00 KST)
- Routine 이름: `stack-matrix-refresh`
- 트리거: `/pdca pm tech-stack-modernization-{YYYY}-{MM}-{DD}` 자동 시작

**CVE 트리거 (수동 fallback)**:
- Dependabot/CVE alert 수신 시 사용자가 `/pdca pm` 수동 실행 (자동화는 다음 사이클)

**갱신 작업**:
1. 기존 매트릭스 archive: `docs/archive/{YYYY-MM}/stack-matrix-{prev-date}.md`
2. 신규 매트릭스 작성: `docs/02-design/stack-matrix-{YYYY-MM-DD}.md`
3. WebSearch로 각 행 최신 stable 재조사
4. delta 행만 별도 표로 사용자에게 제시 → 채택 여부 승인

## 7. Validation (Test Plan)

### 7.1 L1 — Hook Unit Tests

| Case | Input | Expected | 도구 |
|------|-------|---------|------|
| T1 | Edit on `package.json` | exit 2, stderr 메시지, memory append | mock JSON |
| T2 | Edit on `pnpm-lock.yaml` | exit 0 (lockfile 제외) | mock JSON |
| T3 | Edit on `node_modules/foo/package.json` | exit 0 (제외) | mock JSON |
| T4 | Read tool | exit 0 (Edit/Write only) | mock JSON |
| T5 | `AV_STACK_APPROVAL=skip` + manifest | exit 0 + 경고 stderr | env + mock |
| T6 (신규 M7) | `AV_STACK_APPROVAL=dry` + manifest | exit 0 + dry-mode prefix memory + stderr 정보 | env + mock |

### 7.2 L2 — settings.json 정합성

```bash
python3 -c "import json; s=json.load(open('.claude/settings.json')); \
  found = any('av-base-stack-approval' in h['command'] \
    for grp in s['hooks'].get('PreToolUse', []) \
    for h in grp.get('hooks', [])); \
  print('PreToolUse:', found)"
```
**기대**: `PreToolUse: True`

> ⚠️ As-built 검증 시 현재 `av-base-stack-approval.sh` 가 잘못된 매처 그룹에 등록되어 있는 가능성 발견 (Read 결과의 stderr_secret_scan 그룹 내). M3 실행 전에 settings.json 매처 위치 검증 필수.

### 7.3 L3 — Acceptance (Success Criteria 재검증)

| ID | 기준 | 검증 명령 | 현재 |
|----|------|----------|:----:|
| S1 | 인벤토리 100% | `wc -l < docs/02-design/stack-matrix-2026-04-29.md` ≥ 100 | ✅ 121 |
| S2 | 채택 컬럼 4컬럼 채워짐 | grep `\| 현재 유지\|22.x LTS` 행 수 | ✅ |
| S3 | 훅 차단 동작 | T1 mock test + 도그푸딩 (M3 실행 시) | 🟡 부분 — M3 실행 후 PASS |
| S4 | CLAUDE.md grep 0건 | `grep -ic "권장\|recommend\|prefer\|should consider" CLAUDE.md` | ✅ 0 |
| S5 | 5 메모리 Stack Recommendations | `grep -l "## Stack Recommendations"` 결과 5개 | ✅ |
| S6 | gap-detector ≥ 90% | `/pdca analyze` | 🟡 — M3 후 재측정 |
| S7 | 거부 사유 학습 | M3 도그푸딩 시 1건+ 이상 append 확인 | 🟡 — M3 실행 후 |

## 8. Risk Updates

기존 R1~R3 + 신규 R4 추가:

| ID | 위험 | 확률 | 영향 | 완화 |
|----|------|:----:|:----:|------|
| R1 | 훅 과차단 | M | H | M7 dry-mode + AV_STACK_APPROVAL=skip |
| R2 | 메모리 stale | H | M | M8 quarterly + av-base-optimizer 충돌 검사 |
| R3 | CLAUDE.md 참조 깨짐 | L | H | (이미 정리 완료, S4 PASS) |
| **R4** | **Node 22 LTS native dep ABI 비호환** | **M** | **H** | **M3-1 적용 시 단계적 검증: prisma generate → typecheck → vitest → docker build → e2e** |
| R5 | settings.json 매처 그룹 오등록 | L | H | M3 시작 전 §7.2 L2 정합성 테스트 통과 필수 |

## 9. Decision Record (D1~D17)

| # | 결정 | 단계 | 사유 |
|---|------|------|------|
| D1~D6 | (PRD 결정) | PM | — |
| D7~D13 | (Plan 결정) | Plan | — |
| **D14** | **As-built 동결** | **Design** | **M1/M2/M4/M5 산출물의 실제 구조를 §3·§4·§5에 형식화** |
| **D15** | **next-auth 베타 유지** | **Design** | **v5 stable 미출시 (2026-04-29 매트릭스 조사). Plan에서 P0로 잘못 분류된 것 정정** |
| **D16** | **M3 P0 = Node 22 LTS + Playwright 1.52.x (2건)** | **Design** | **TS 6/Vitest 4 major 호환성 별도 사이클 분리, P2로 강등** |
| **D17** | **M7 dry-mode 도입** | **Design** | **R1 과차단 위험 완화 + 외부 기여자 학습 모드** |

## 10. Implementation Guide / Session Guide

### 10.1 Module Map (현재 cycle 잔존 작업)

| Module | 책임 | 예상 라인 변경 | 파일 |
|--------|------|:-----:|------|
| M3-1 | BE Node 22 LTS | ~3 lines | `project/all-flow-backend/Dockerfile` |
| M3-2 | FE Playwright minor | ~1 line | `project/all-flow-frontend/package.json` |
| M7 | Dry-mode 분기 추가 | ~5 lines | `.claude/hooks/av-base-stack-approval.sh` |
| M8 | Quarterly cron 등록 | (CronCreate 도구 호출) | `~/.claude/scheduled_tasks` |
| M5b (선검증) | settings.json 매처 그룹 정정 | 1~3 lines | `.claude/settings.json` |

### 10.2 Recommended Session Plan

```
Session 1 (15분)
  ├─ M5b: settings.json 매처 그룹 검증·정정 (§7.2 L2 PASS 확보)
  ├─ M7:  hook dry-mode 분기 추가 (사용자 승인 1회 → 이후 dry로 전환 가능)
  └─ T6 mock test PASS

Session 2 (30분)  ← M3 도그푸딩
  ├─ M3-2: FE Playwright (안전, minor)
  │   ├─ 훅이 차단 → 사용자 승인 → Edit 진행
  │   └─ pnpm install + pnpm e2e:install 검증
  └─ M3-1: BE Node 22 LTS
      ├─ 훅이 차단 → 사용자 승인 → Edit 진행
      ├─ docker build 검증 (R4 ABI 검증)
      ├─ typecheck + vitest 회귀
      └─ 실패 시 dry-mode 롤백 + 별도 사이클로 분리

Session 3 (10분)
  ├─ M8: CronCreate routine 등록
  └─ /pdca analyze 재측정 → S3·S6·S7 PASS 확인
```

### 10.3 분할 실행 명령

```
/pdca do tech-stack-modernization-2026-04-29 --scope module-5b,module-7  # Session 1
/pdca do tech-stack-modernization-2026-04-29 --scope module-3            # Session 2 (M3-1+M3-2)
/pdca do tech-stack-modernization-2026-04-29 --scope module-8            # Session 3
```

## 11. Handoff to Do

다음 명령: `/pdca do tech-stack-modernization-2026-04-29 --scope module-5b,module-7`

Do 단계에서 본 Design의 구현 가이드(§10)를 따라 Session 1부터 차례로 진행. **각 manifest mutation은 자기 자신의 훅을 통과해야 함 (도그푸딩)**.

---

**End of Design**
