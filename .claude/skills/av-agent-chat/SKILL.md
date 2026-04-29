---
name: av-agent-chat
description: |
  에이전트 자연어 대화 인터페이스. 특정 에이전트와 직접 대화할 수 있다.
autovibe: true
version: "1.0"
created: "2026-03-29"
group: base
argument-hint: "{agent-name} {message}"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Agent, Task]
---

# av-agent-chat — 에이전트 대화 인터페이스

> `/av-agent-chat {agent-name} {message}` — 특정 에이전트와 직접 대화

## 실행 프로토콜

1. `$1` = agent 이름 확인 (components.json 조회)
2. `$2+` = 메시지
3. `Agent("av-$1", "$2+")` 호출 (Task() 별칭은 신규 작성 금지)
4. 결과 출력
