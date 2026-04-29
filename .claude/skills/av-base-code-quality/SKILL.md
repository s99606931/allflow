---
name: av-base-code-quality
description: |
  코드 품질 게이트. lint + typecheck + build + bkit:code-analyzer 통합.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
argument-hint: "[target] [--full]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash, Task]
---

# av-base-code-quality — 코드 품질 게이트

## 실행 시퀀스

1. Bash: `{lint-command}` (프로젝트 스택별)
2. Bash: `{typecheck-command}` (프로젝트 스택별)
3. Bash: `{build-command}` (프로젝트 스택별)
4. `Agent("bkit:code-analyzer", ...)` — 품질·보안·아키텍처 분석
5. 결과 통합 → G1 품질 게이트 PASS/FAIL 판정

## 스택별 명령어

| 스택 | lint | typecheck | build |
|------|------|-----------|-------|
| NestJS/Next.js | `pnpm lint` | `pnpm typecheck` | `pnpm build` |
| FastAPI | `ruff check .` | `mypy .` | `pytest` |
| Django | `flake8` | — | `python manage.py check` |
| Go | `go vet ./...` | — | `go build ./...` |
