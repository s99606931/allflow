---
name: av-base-spec
autovibe: true
version: "2.1"
created: "2026-03-29"
updated: "2026-04-27"
group: base
paths:
  - ".claude/agents/**"
  - ".claude/skills/**"
  - ".claude/rules/**"
---

# AutoVibe Claude Code Spec (av-base-spec)

> 모든 av- 컴포넌트 중앙 규칙 인덱스.

## Quick Reference

- `av-` = AutoVibe 생태계 산출물 (Rule/Agent/Skill/Hook에만 적용)
- `autovibe: true` frontmatter 필수
- 네이밍: `av-{domain}-{name}` (kebab-case, 최대 4단어, 도메인 필수)
- 도메인: `vibe` (메타) | `base` (범용 필수) | `util` (범용 선택) | `{project}` (프로젝트 전용)
- 버전: `Major.Minor` 문자열 (e.g. `"1.0"`, `"2.1"`)
- 모든 생성은 `/av-vibe-forge`를 통해서만 (레지스트리 자동 등록)
- Agent는 `memory: project` 필드로 영구 메모리 자동 관리 (공식 스펙)
- Skill은 `context: fork` 필드로 격리 실행 가능 (공식 스펙)

## 조직 구조

| 역할 | 에이전트 | 모델 | 책임 |
|------|---------|------|------|
| **PM** | av-pm-coordinator | opus | 사용자 대화, PRD(bkit), 최종 승인 |
| **PL** | av-do-orchestrator | opus | Plan/Design(bkit), Agent Team 스폰, gstack 검증 |
| **Memory** | av-base-memory-keeper | sonnet | 프로젝트 기억 관리 |

## 생태계 3축 + 플러그인 라우팅

> **Single Source of Truth**: `.claude/rules/av-base-plugin-routing.md`
> 3축 정의(Claude Code + gstack + bkit), 7단계 gstack 생명주기, bkit 호출표, 자동 트리거 조건은 모두 plugin-routing 참조.

**표기 원칙** (CC v2.1.63+): `Agent(...)` 사용. `Task(...)`는 별칭으로 동작하나 **신규 작성 금지**.

## Topic Index

> Frontmatter/Naming/Protocols/Audit 상세는 위 Quick Reference에 요약. 별도 토픽 문서는 v2.1에서 통합 제거.

| Topic | 파일 |
|-------|------|
| Memory First | `.claude/rules/av-base-memory-first.md` |
| Plugin Routing | `.claude/rules/av-base-plugin-routing.md` |
| Code Quality Gates | `.claude/rules/av-base-code-quality-gates.md` |
| Org Protocol | `.claude/rules/av-org-protocol.md` |

## Stats

- spec: v2.1 | created: 2026-03-29 | updated: 2026-04-27 (5차 PDCA: 표 중복 통합)
- registry: `.claude/registry/components.json`
- 품질 점수: gap 99.5% / code 100점 ⭐⭐
