# 06. 용어집

> 이 가이드에서 사용된 용어 50개 이상을 정의한다. 개념을 처음 접할 때 참조용으로 사용한다.

---

## A

**--affected**
Turborepo CLI 옵션. git diff를 분석하여 변경된 패키지와 그 의존 패키지만 task를 실행한다. CI에서 불필요한 빌드를 건너뛰는 데 사용한다.

**API Gateway**
여러 백엔드 서비스 앞에 위치하여 인증, 라우팅, rate limiting, 로드 밸런싱을 담당하는 진입점. MSA에서 필수 컴포넌트.

**at-most-once**
메시지 전달 보장 수준. 메시지가 최대 1번 전달되지만 소비자가 없으면 소실될 수 있다. Redis Pub/Sub의 전달 보장 수준.

**at-least-once**
메시지가 최소 1번 이상 전달되도록 보장. 네트워크 오류 시 재전송하므로 중복 수신 가능성 있음. Redis Streams의 기본 전달 보장 수준.

---

## B

**BFF (Backend for Frontend)**
특정 클라이언트(웹, 모바일 등)를 위해 최적화된 중간 API 계층. 오버페칭/언더페칭 해결, 클라이언트별 독립 변경을 가능하게 한다.

**build cache (빌드 캐시)**
이전 빌드의 출력물을 저장하여, 입력이 동일하면 다시 빌드하지 않는 기법. Turborepo의 핵심 기능.

---

## C

**Catalog (pnpm)**
pnpm 10에 도입된 기능. `pnpm-workspace.yaml`에 공통 의존성 버전을 정의하면 모든 workspace 패키지가 `"catalog:"` 참조로 동일 버전을 사용한다.

**CNCF (Cloud Native Computing Foundation)**
클라우드 네이티브 기술 표준화 단체. Kubernetes, Prometheus, OTel 등 주요 프로젝트를 관리한다. 2026 Q1 보고서에서 42% MSA→Modular Monolith 회귀 데이터를 발표했다.

**Consumer Group (Redis Streams)**
Redis Streams에서 여러 소비자가 협력하여 스트림을 처리하는 단위. 같은 group의 소비자들은 메시지를 분산 처리하고, 처리 완료는 XACK로 확인한다.

**Contract-first**
API 구현 전에 스펙(OpenAPI, proto 파일 등)을 먼저 정의하는 개발 방식. 스펙이 BE와 FE의 계약이 된다.

**content-addressable store**
pnpm이 패키지 파일을 저장하는 방식. 파일 내용의 해시를 키로 중앙 저장소에 저장하고, 각 프로젝트는 심볼릭 링크로 참조. 중복 저장 없음.

---

## D

**dependsOn**
`turbo.json`의 task 설정 필드. `["^build"]`는 "의존 패키지의 build 먼저 실행"을 의미한다.

**distributed tracing (분산 추적)**
여러 서비스를 거치는 요청의 전체 경로를 추적하는 기법. traceId로 모든 span을 연결한다.

**drift (드리프트)**
시간이 지남에 따라 원래 상태에서 벗어나는 현상. 의존성 버전 드리프트, OpenAPI drift 등.

---

## E

**Envelope (API 응답 봉투)**
API 응답을 일관된 구조로 감싸는 패턴. `{ success: true, data: T, error: null }` 형태. all-flow `packages/shared/envelope.ts`에서 구현.

**EXPLAIN ANALYZE**
PostgreSQL 명령어. SQL 쿼리의 실행 계획과 실제 실행 시간을 분석하여 인덱스 사용 여부, 풀 테이블 스캔 등을 확인한다.

**exporter (OTel)**
OTel SDK가 수집한 trace/metric/log를 외부 백엔드로 전송하는 컴포넌트. OTLP exporter, Console exporter 등.

---

## F

**fan-out**
1개 이벤트를 N개의 수신자에게 전달하는 패턴. all-flow realtime 모듈의 `redis-fanout.ts`가 이 패턴 구현.

---

## G

**gRPC (Google Remote Procedure Call)**
Google이 개발한 오픈소스 RPC 프레임워크. Protocol Buffers 사용, HTTP/2 기반, 이진 직렬화. 서비스 간 내부 통신에 적합.

**Grafana**
Loki, Tempo, Prometheus 등 다양한 데이터소스를 통합 시각화하는 오픈소스 대시보드. OTel 데이터의 UI 계층.

---

## H

**hoisting (pnpm)**
`node_modules/.pnpm/` 아래 패키지를 배치하고, 상위로 symlink를 노출하는 pnpm의 의존성 관리 방식. npm과 달리 의도치 않은 패키지 접근을 방지한다.

---

## I

**instrumentation (계측)**
코드에 모니터링 데이터 수집 로직을 추가하는 행위. 자동 계측(auto-instrumentation)과 수동 계측(manual instrumentation)이 있다.

---

## J

**JetStream (NATS)**
NATS의 메시지 영속성 및 Consumer Group 지원 확장 기능. 기본 NATS Pub/Sub에 at-least-once 보장과 재처리 기능을 추가.

---

## K

**Kafka**
Apache의 대규모 분산 스트리밍 플랫폼. 높은 처리량, 무제한 보관, 강력한 생태계. 일 수백만 이벤트 이상에서 가치가 있다.

---

## L

**Loki**
Grafana Labs의 오픈소스 로그 집계 시스템. 전문 인덱싱 없이 레이블 기반으로 로그를 저장하여 저비용.

---

## M

**Mermaid**
텍스트로 다이어그램을 작성하는 도구. `flowchart TD`, `sequenceDiagram` 등 여러 타입 지원. Markdown에 내장 가능.

**Metrics (지표)**
시간에 따른 수치 측정값 집합. 알람 설정, 트렌드 분석에 사용. Prometheus가 수집.

**Mimir**
Grafana의 Prometheus 장기 저장 + 수평 확장 솔루션. `remote_write`로 Prometheus에서 데이터를 받아 장기 보관.

**Modular Monolith**
단일 배포 단위로 운영되지만 내부적으로 명확한 모듈 경계를 가진 아키텍처. 2026년 트렌드에서 MSA 회귀의 목적지.

**monkey-patch**
런타임에 기존 라이브러리의 동작을 수정하는 기법. OTel 자동 계측이 Fastify, Prisma 등을 monkey-patch하여 span을 자동 생성한다.

**monorepo**
여러 패키지/앱을 하나의 git 저장소에서 관리하는 방식. 공유 도구(pnpm workspace, Turborepo)로 패키지 간 의존성과 빌드를 관리한다.

**MSA (Microservices Architecture)**
서비스를 작은 독립 단위로 분리하여 각자 배포하는 아키텍처. 높은 확장성이지만 운영 복잡도도 높다.

---

## N

**NATS**
클라우드 네이티브 메시징 시스템. JetStream으로 영속성 지원. Kafka보다 설정이 간단하고 처리량이 높다.

---

## O

**OpenAPI 3.1**
REST API 스펙 표준. JSON Schema와 완전 호환 (3.0 대비 개선). all-flow의 BE-FE 계약 스펙.

**OTel (OpenTelemetry)**
벤더 중립적 관측 가능성 표준. Trace, Metric, Log의 수집, 변환, 내보내기를 표준화. CNCF 프로젝트.

**OTLP (OpenTelemetry Protocol)**
OTel 데이터 전송 표준 프로토콜. gRPC 또는 HTTP/JSON 기반.

**over-fetching (오버페칭)**
API가 클라이언트가 필요 이상의 데이터를 반환하는 현상. BFF로 해결 가능.

---

## P

**p99 latency**
전체 요청 중 상위 1%의 응답 시간. 최악의 사용자 경험을 나타내는 지표. p50(중앙값), p95와 함께 사용.

**persistent (Turborepo)**
`turbo.json`의 task 설정. `"persistent": true`는 task가 종료되지 않는 장기 실행 프로세스임을 나타낸다. dev 서버에 사용.

**pnpm workspace**
여러 패키지를 하나의 pnpm 관리 하에 묶는 기능. `pnpm-workspace.yaml`에 패키지 경로 정의.

**Profiling (프로파일링)**
코드의 어느 줄이 CPU/메모리를 얼마나 사용하는지 측정하는 기법. OTel 2026 Q1에 Continuous Profiling RC 추가.

**Prometheus**
오픈소스 지표 수집 + 저장 시스템. pull 방식으로 `/metrics` 엔드포인트를 scrape. PromQL 쿼리 언어.

**Protocol Buffers (Protobuf)**
Google의 이진 직렬화 형식. JSON보다 작고 빠름. gRPC의 기본 직렬화 형식.

---

## R

**Redis Pub/Sub**
Redis의 발행-구독 메시징 기능. at-most-once 보장. all-flow realtime 모듈이 현재 사용.

**Redis Streams**
Redis의 영속성 있는 스트리밍 데이터 구조. Consumer Group으로 수평 확장, at-least-once 보장.

**remote cache (원격 캐시)**
Turborepo가 빌드 결과를 중앙 서버(Vercel 또는 self-hosted)에 저장하여 다른 머신/CI에서도 캐시를 공유하는 기능.

---

## S

**SAGA 패턴**
분산 트랜잭션 관리 패턴. 각 서비스의 로컬 트랜잭션 체인으로 구성되며, 실패 시 보상 트랜잭션을 실행. MSA에서 Prisma 단일 트랜잭션 대체.

**scrape (스크레이프)**
Prometheus가 애플리케이션의 `/metrics` 엔드포인트를 주기적으로 호출하여 지표를 가져오는 행위.

**service mesh**
MSA에서 서비스 간 통신을 관리하는 인프라 계층. Istio, Linkerd 등. 로컬 개발에서 설치 비용이 높다.

**span**
Trace 내 하나의 작업 단위. 시작 시간, 종료 시간, 속성(attribute)을 가진다. 예: DB 쿼리, 외부 HTTP 호출.

**SOR (Single Source of Truth)**
데이터의 단일 권위 출처. all-flow에서 `packages/contracts/openapi.yaml`이 BE-FE API 계약의 SOR.

---

## T

**task graph (태스크 그래프)**
Turborepo가 패키지 의존성을 분석하여 구성하는 task 실행 순서 그래프. 순환 의존성 감지, 병렬 실행 최적화에 사용.

**Tempo**
Grafana의 오픈소스 분산 추적 백엔드. traceId로 trace를 저장하고 조회. Loki와 통합하여 로그-트레이스 연결 가능.

**Traces (추적)**
단일 요청이 여러 서비스/컴포넌트를 거치는 흐름의 기록. traceId로 모든 span을 연결.

**traceId**
단일 요청의 모든 span을 연결하는 고유 식별자. 128비트(16바이트) hex 문자열.

**traceparent**
W3C TraceContext 표준 HTTP 헤더. `{version}-{traceId}-{spanId}-{flags}` 형식으로 trace 컨텍스트를 전파한다.

**tRPC**
TypeScript 프로젝트에서 스펙 파일 없이 엔드투엔드 타입 안전을 제공하는 RPC 프레임워크. BE의 router 타입이 FE에 자동 전달.

**Turborepo**
Vercel의 오픈소스 monorepo task runner. task graph, 로컬/원격 캐시, `--affected` 지원.

---

## U

**under-fetching (언더페칭)**
필요한 데이터를 얻기 위해 여러 번의 API 호출이 필요한 현상. BFF나 GraphQL로 해결 가능.

---

## W

**workspace:* (pnpm)**
pnpm workspace 내 다른 패키지를 참조하는 버전 프로토콜. `"@all-flow/shared": "workspace:*"`처럼 사용.

---

## Z

**Zod**
TypeScript-first 스키마 검증 라이브러리. all-flow-backend에서 요청/응답 검증에 사용. OpenAPI에서 Zod schema 자동 생성 가능.
