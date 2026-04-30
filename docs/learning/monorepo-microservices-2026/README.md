# 학습 가이드 — Monorepo & Microservices 2026

> 대상 독자: TypeScript 기초가 있는 주니어 개발자 (1~2년차). monorepo 경험 없음 가정.
> 학습 목표: all-flow 프로젝트 구조를 이해하고, 왜 이 아키텍처를 선택했는지 설명할 수 있다.

---

## 이 문서를 읽는 이유

2026년 현재 많은 회사가 "마이크로서비스(MSA) 도입"을 외치지만, CNCF Q1 2026 보고서에 따르면
42%의 조직이 MSA에서 다시 Modular Monolith로 회귀했다.
이 가이드는 "어떻게 만드는가"를 가르치기 전에, "왜 이 선택을 했는가"를 먼저 설명한다.

---

## 4주 학습 플랜

| 주차 | 주제 | 학습 목표 | 챕터 |
|------|------|----------|------|
| **1주** | Monorepo 기초 | pnpm workspace와 Turborepo가 무엇인지, 왜 쓰는지 설명할 수 있다 | 01 |
| **2주** | 아키텍처 판단 | Modular Monolith vs MSA 트레이드오프를 데이터 기반으로 설명할 수 있다 | 02 |
| **3주** | 관측 가능성 | OTel / Grafana 스택으로 시스템을 관찰하는 방법을 실습할 수 있다 | 03 |
| **4주** | MSA 준비 + 실습 | BFF / 이벤트 드리븐 / Contract-first 개념과 실습을 완료할 수 있다 | 04 + 05 |

---

## 챕터 인덱스

### 00. 개요

- [00-overview.md](./00-overview.md) — 왜 이 아키텍처인가. all-flow 현재 상태와 목표 상태.

### 01. Monorepo 기초 (1주차)

- [01-monorepo-basics/01-what-is-monorepo.md](./01-monorepo-basics/01-what-is-monorepo.md)
  다중 레포 vs monorepo, all-flow 현재 구조와 목표 구조 비교
- [01-monorepo-basics/02-pnpm-workspaces.md](./01-monorepo-basics/02-pnpm-workspaces.md)
  pnpm workspace + catalog 실습, `workspace:*` 프로토콜
- [01-monorepo-basics/03-turborepo-2x.md](./01-monorepo-basics/03-turborepo-2x.md)
  Turborepo task graph, cache, `--affected` 실사용

### 02. 아키텍처 (2주차)

- [02-architecture/01-modular-monolith.md](./02-architecture/01-modular-monolith.md)
  왜 Phase 1은 모놀리스를 유지하는가. all-flow-backend 20개 모듈 구조
- [02-architecture/02-package-boundaries.md](./02-architecture/02-package-boundaries.md)
  contracts / shared / config / ui-kit 역할과 경계 설정
- [02-architecture/03-when-to-split.md](./02-architecture/03-when-to-split.md)
  측정 기반 분리 판단 기준. 지금 분리하지 않는 이유

### 03. 관측 가능성 (3주차)

- [03-observability/01-three-pillars.md](./03-observability/01-three-pillars.md)
  Metrics / Logs / Traces 기본 개념
- [03-observability/02-opentelemetry-101.md](./03-observability/02-opentelemetry-101.md)
  OTel SDK + Fastify/Next.js 계측
- [03-observability/03-grafana-stack.md](./03-observability/03-grafana-stack.md)
  Loki / Tempo / Mimir / Prometheus 역할
- [03-observability/04-hands-on-tracing.md](./03-observability/04-hands-on-tracing.md)
  요청 1개를 BE→DB까지 추적하는 실습

### 04. MSA 준비 (4주차)

- [04-microservices-readiness/01-bff-pattern.md](./04-microservices-readiness/01-bff-pattern.md)
  BFF 패턴이 무엇이고 왜 필요한가
- [04-microservices-readiness/02-event-driven.md](./04-microservices-readiness/02-event-driven.md)
  NATS / Redis Streams / Kafka 비교
- [04-microservices-readiness/03-contract-first.md](./04-microservices-readiness/03-contract-first.md)
  OpenAPI 3.1 / gRPC / tRPC 비교

### 05. 실습 (4주차)

- [05-hands-on/01-setup-workspace.md](./05-hands-on/01-setup-workspace.md)
  로컬에서 첫 monorepo 만들기 (5분)
- [05-hands-on/02-add-shared-package.md](./05-hands-on/02-add-shared-package.md)
  packages/shared 추가 + 사용 실습
- [05-hands-on/03-extract-service.md](./05-hands-on/03-extract-service.md)
  1개 모듈을 service로 떼는 실습 (realtime 예시)
- [05-hands-on/04-add-tracing.md](./05-hands-on/04-add-tracing.md)
  OTel 계측 한 줄 추가 실습

### 부록

- [06-glossary.md](./06-glossary.md) — 용어집 50+ 개념
- [07-further-reading.md](./07-further-reading.md) — 책 / 영상 / 블로그 큐레이션

---

## 학습 방법 권장사항

1. 각 챕터는 "왜?" 섹션을 먼저 읽는다. 개념의 배경을 이해하지 않으면 코드는 암기가 된다.
2. Before/After 코드 예시는 직접 타이핑해본다. 복사-붙여넣기는 기억에 남지 않는다.
3. 챕터 끝 체크포인트 질문에 답하기 전에 문서를 닫아본다.
4. 실습 챕터(05)는 `/data/allflow`에서 직접 실행하며 따라간다.

---

## 이 프로젝트의 현재 상태 (2026-04-30 기준)

```
/data/allflow/
├── project/
│   ├── all-flow-backend/   Fastify 5 + Prisma 6 + 20개 모듈
│   ├── all-flow-frontend/  Next.js 16 + next-auth 5
│   └── all-flow-infra/     docker-compose dev/prod
├── pnpm-workspace.yaml     (Step 1 완료 — BE+FE 등록)
├── turbo.json              (Step 1 완료 — 6개 task 정의)
└── docs/
```

Step 1 완료 → Step 2~8 진행 예정.
이 학습 가이드는 각 Step이 왜 필요한지 배경을 설명한다.
