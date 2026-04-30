# 07. 추가 학습 자료

> 각 챕터를 더 깊게 이해하고 싶을 때 참고할 책, 영상, 블로그 큐레이션.
> 모든 링크는 2026-04-30 기준 접근 가능 확인.

---

## Monorepo 기초 (챕터 01)

### 공식 문서

- [pnpm Workspaces 공식 문서](https://pnpm.io/workspaces)
  워크스페이스 설정, `workspace:*` 프로토콜, 필터링 옵션 상세 설명.

- [pnpm Catalogs 공식 문서](https://pnpm.io/catalogs)
  카탈로그 설정 방법, named catalog, `catalog:` 참조 방법.

- [Turborepo Configuration Reference](https://turborepo.dev/docs/reference/configuration)
  `turbo.json`의 모든 옵션 레퍼런스. `dependsOn`, `inputs`, `outputs` 상세.

### 블로그

- [Turborepo 2.0: Remote Caching, Task Pipelines, and What Actually Speeds Up CI](https://dev.to/whoffagents/turborepo-20-remote-caching-task-pipelines-and-what-actually-speeds-up-ci-52if)
  Turborepo 2.0 변경사항과 실제 CI 속도 개선 측정 데이터.

---

## 아키텍처 (챕터 02)

### 업계 사례

- [Rethinking Microservices in 2026: When Modular Monolith Wins](https://enqcode.com/blog/rethinking-microservices-in-2026-when-modular-monolith-architecture-actually-win)
  2026년 Modular Monolith 회귀 트렌드 분석. Amazon Prime Video 사례 포함.

- [Microservices vs Modular Monolith in 2026 (CNCF Q1 2026)](https://www.ancient.global/en/blogs-ancient/microservices-vs-modular-monolith-2026)
  CNCF Q1 2026 데이터 기반 MSA vs Modular Monolith 비교.

### 책

- **Building Microservices, 2nd Edition** — Sam Newman (O'Reilly)
  MSA 설계의 바이블. 언제 분리해야 하는지, 분리 비용은 무엇인지 깊게 다룬다.
  주의: "무조건 MSA로 가야 한다"는 관점이 아니라 트레이드오프를 설명하는 책.

- **Monolith to Microservices** — Sam Newman (O'Reilly)
  Modular Monolith에서 점진적으로 MSA로 전환하는 방법. Strangler Fig Pattern 등.

- **Software Architecture: The Hard Parts** — Neal Ford, Mark Richards (O'Reilly)
  아키텍처 결정에서 "정답 없음"을 전제로 트레이드오프 분석 방법론을 제시.

---

## 관측 가능성 (챕터 03)

### 공식 문서

- [OpenTelemetry 공식 문서 — Node.js SDK](https://opentelemetry.io/docs/languages/js/)
  `@opentelemetry/sdk-node` 설정, 자동/수동 계측 방법.

- [OpenTelemetry 2026: The Unified Observability Standard](https://techbytes.app/posts/opentelemetry-2026-unified-observability-standard/)
  2026년 OTel 4번째 기둥(Continuous Profiling) RC 포함 현황.

- [Grafana Tempo 공식 문서](https://grafana.com/docs/tempo/latest/)
  분산 추적 백엔드 설정, Grafana 연동 방법.

- [Grafana Loki 공식 문서](https://grafana.com/docs/loki/latest/)
  레이블 기반 로그 수집, LogQL 쿼리 언어.

### 블로그

- [How to correlate Logs and Traces with OpenTelemetry](https://opentelemetry.io/blog/2023/logs-collection/)
  로그와 트레이스를 traceId로 연결하는 방법. pino 통합 예시 포함.

- [Grafana LGTM Stack: Loki, Grafana, Tempo, Mimir 완전 가이드](https://grafana.com/blog/2022/06/08/new-in-grafana-9-0-lets-talk-about-the-grafana-lgtm-stack/)
  LGTM 스택 개요와 docker-compose로 시작하는 방법.

---

## MSA 준비 (챕터 04)

### BFF 패턴

- [The BFF Pattern (Backend for Frontend): An Introduction](https://blog.bitsrc.io/bff-pattern-backend-for-frontend-an-introduction-e4fa965128bf)
  BFF 패턴의 기원(Sam Newman), 구현 방법, 실제 사례.

- [Next.js Route Handlers as BFF Layer](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
  Next.js 공식 문서. Route Handlers가 경량 BFF 역할을 할 수 있는 방법.

### 이벤트 드리븐

- [Redis Streams vs Redis Pub/Sub: Which One to Use?](https://redis.io/blog/redis-streams-vs-pub-sub/)
  Redis 공식 블로그. 두 방식의 차이점과 선택 기준.

- [NATS JetStream Documentation](https://docs.nats.io/nats-concepts/jetstream)
  NATS JetStream 공식 문서. Consumer Group, 영속성 설정.

### Contract-first

- [OpenAPI 3.1 Migration Guide](https://www.openapis.org/blog/2021/02/16/migrating-from-openapi-3-0-to-3-1-0)
  OpenAPI 3.1의 변경점과 3.0에서 마이그레이션하는 방법.

- [tRPC Documentation](https://trpc.io/docs)
  tRPC 공식 문서. Next.js + Fastify 통합 예시.

---

## 도구 심화

### pnpm

- [Node.js Releases (공식)](https://nodejs.org/en/about/previous-releases)
  Node.js LTS 릴리즈 일정. Active LTS와 Maintenance LTS 구분 확인.

- [pnpm workspace 60-80% disk 절약 원리](https://pnpm.io/motivation)
  content-addressable store와 symlink 기반 호이스팅 설명.

### TypeScript

- [tsconfig.json Reference](https://www.typescriptlang.org/tsconfig)
  모든 `tsconfig.json` 옵션 레퍼런스. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` 등 엄격 옵션 설명.

---

## 학습 순서 권장사항

처음 시작한다면:
1. Sam Newman "Monolith to Microservices" 1~3장 (분리 전략 기초)
2. Turborepo 공식 튜토리얼 (https://turborepo.dev/docs/getting-started)
3. OpenTelemetry Node.js 공식 문서 Quickstart

중급 이상이라면:
1. "Software Architecture: The Hard Parts" (트레이드오프 분석 심화)
2. CNCF 2026 Q1 연간 보고서 원문
3. Grafana LGTM Stack 실습 (docker-compose 템플릿 제공)
