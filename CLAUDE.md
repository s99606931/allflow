# AutoVibe (av) 프로젝트
> **CC v2.1.119+ 최적화** | bkit v2.0.8 Dynamic | 5차 PDCA 완료 (gap 99.5% / code 100점 ⭐⭐) | 2026-04-29
> **OSS 모드 활성화**: 6 트랙(Dev/Test/Docs/Review/Security/Release) 분업화 (av-oss-*)

@.claude/rules/av-base-spec.md
@.claude/rules/av-base-plugin-routing.md
@.claude/rules/av-org-protocol.md
@.claude/rules/av-base-code-quality-gates.md
@.claude/rules/av-oss-collab-protocol.md

## AutoVibe 생태계

자기 성장 AI 개발 생태계. 자연어 → 최적 플러그인 자동 라우팅.

> 상세: `.claude/rules/av-base-spec.md` | 라우팅: `.claude/rules/av-base-plugin-routing.md`
> 조직 프로토콜: `.claude/rules/av-org-protocol.md` | 레지스트리: `.claude/registry/components.json`

### 생태계 3축 (요약)

| 축 | 정체성 | PDCA 역할 |
|----|--------|-----------|
| **Claude Code** | AI 런타임 엔진 | 전 단계 — Agent 실행, 코드 생성 |
| **gstack** | Headless Browser | Do·Check — E2E·스크린샷·벤치마크 |
| **bkit** | Vibecoding Kit | Plan·Check·Act — PDCA·Gap 분석·자동 개선 |

3축 상호 보완: Claude가 만들고 → gstack이 보고 → bkit이 측정·개선. 단독 사용 불가.

### 핵심 스킬

| 스킬 | 역할 |
|------|------|
| `/av {자연어}` | 마스터 게이트웨이 — 자연어 → 최적 컴포넌트 |
| `/av pm team {요구사항}` | PM 팀 구성 → 병렬 실행 + 자동 학습 |
| `/av-vibe-forge` | 컴포넌트 생성·관리 |
| `/av-pm start {feature}` | PM 인터페이스 → PRD |
| `/av-base-code-quality` | 코드 품질 게이트 |
| `/av-base-post-qa` | QA (gstack E2E + bkit:qa-monitor) |
| `/av-base-iterate` | 자동 개선 루프 (bkit:pdca-iterator) |
| `/av-base-git-commit` | git 커밋 자동화 |

### 워크플로우

```
사용자 → /av {자연어}
  → PM 대화 (AskUserQuestion) → PRD (bkit:pdca plan)
  → PL Plan/Design (bkit) → Agent Team 스폰
  → 구현 → gstack 테스트 → PL 검토 (bkit:gap-detector)
  → match_rate < 90% 이면 자동 pdca-iterator 루프
  → PM 승인 → Report (bkit) → Memory Keeper 자동 저장
```

### 컴포넌트 인벤토리

| 유형 | 수량 | 경로 |
|------|-----:|------|
| Agents | 19 (base 13 + oss 6) | `.claude/agents/` |
| Skills | 22 (base 18 + oss 4) | `.claude/skills/` |
| Hooks | 13 (base 10 + oss 3) | `.claude/hooks/` |
| Rules | 7 (base 6 + oss 1) | `.claude/rules/` |

### OSS 트랙 (6) — github.com 공개 협업

| 트랙 | 에이전트 | 진입 스킬 |
|------|---------|----------|
| Dev | av-oss-dev-lead | (PR 자동) |
| Test | av-oss-test-engineer | (CI 자동) |
| Docs | av-oss-docs-curator | (머지 후 자동) |
| Review | av-oss-pr-reviewer | `/av-oss-pr-triage` |
| Security | av-oss-security-officer | (훅 자동) |
| Release | av-oss-release-manager | `/av-oss-release` |
| (공통) | — | `/av-oss-init`, `/av-oss-contrib-onboard` |

훅: `av-oss-secret-scan`, `av-oss-license-check`, `av-oss-sign-off` (DCO).
프로토콜: `.claude/rules/av-oss-collab-protocol.md` (RACI + 핸드오프 + 게이트 매트릭스).

### 외부 플러그인

| 플러그인 | 역할 | 호출 |
|---------|------|------|
| **gstack** | 실행·테스트·배포 | `Skill("gstack", ...)` |
| **bkit** | 문서·코드 분석·갭 검증 | `Skill("bkit:pdca", ...)` / `Agent("bkit:*", ...)` |
| **canary** | 카나리 배포 모니터링 | `Skill("canary", ...)` |
| **benchmark** | 성능 기준선 비교 | `Skill("benchmark", ...)` |

### 플러그인 호출 표기 원칙 (CC v2.1.63+)

`Agent(...)` 사용 — `Task(...)`는 별칭으로 유효하나 **신규 작성 금지**.

### Harness Engineering

Git 품질 게이트: `.githooks/pre-commit` (Gate 1~4) + `.githooks/pre-push` (Gate 5~7)
팀 온보딩: `bash scripts/install-hooks.sh`

### 메모리 계층 (3-tier)

| 계층 | 경로 | 범위 | 자동화 |
|------|------|------|--------|
| L1 에이전트 | `.claude/agent-memory/{name}/MEMORY.md` | 해당 에이전트 | `memory: project` |
| L2 스킬 | `.claude/skills/{name}/MEMORY.md` | 해당 스킬 | 수동 Read/Write |
| L4 글로벌 | `~/.claude/projects/{slug}/memory/MEMORY.md` | 전체 공유 | Claude Code auto-memory |

> 상세 정책: `.claude/rules/av-base-memory-first.md` | 자동 백업: precompact 훅 → `.claude/logs/snapshots/{ts}/`

### 품질 점수 (5차 PDCA, 2026-04-27)

| 지표 | 점수 | 상태 |
|------|-----:|------|
| bkit:gap-detector | **99.50%** | 사실상 만점 |
| bkit:code-analyzer | **100/100** | 만점 ⭐⭐ |
| 메모리 계층 / 외부 통합 | 100 / 99.5 | 자기진화 완성 |

다음 측정: 2026-05-11 09:00 KST (자동 routine 등록 완료)
