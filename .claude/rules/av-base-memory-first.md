---
name: av-base-memory-first
autovibe: true
version: "2.0"
created: "2026-03-29"
group: base
paths:
  - ".claude/**"
---

# av-base-memory-first — 메모리 우선 읽기 원칙

> 모든 av- 에이전트는 작업 시작 전 반드시 자신의 메모리를 확인해야 한다.
> 공식 스펙: Agent frontmatter의 `memory: project` 필드로 자동 관리.

## 원칙

1. **에이전트**: `memory: project` → `.claude/agent-memory/{name}/MEMORY.md` 자동 로드
2. **스킬**: `Read .claude/skills/{name}/MEMORY.md` (수동)
3. **글로벌**: `~/.claude/projects/{project-slug}/memory/MEMORY.md` (Claude Code auto-memory)

## 메모리 계층

| 계층 | 경로 | 범위 | 관리 |
|------|------|------|------|
| L1 에이전트 | `.claude/agent-memory/{name}/MEMORY.md` | 해당 에이전트 전용 | `memory: project` 자동 |
| L2 스킬 | `.claude/skills/{name}/MEMORY.md` | 해당 스킬 전용 | 수동 Read/Write |
| L4 글로벌 | `~/.claude/projects/{slug}/memory/MEMORY.md` | 전체 공유 | Claude Code auto-memory |

## MEMORY.md 초기 형식

```markdown
# {컴포넌트명} Memory

> 생성: YYYY-MM-DD | 마지막 업데이트: YYYY-MM-DD

## 라우팅 이력 (최근 5건)
(없음)

## 학습된 패턴
(없음)

## 주의 사항
(없음)
```
