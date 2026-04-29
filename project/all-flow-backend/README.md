# ALL-Flow — Backend

> ALL-Flow 사내 협업 시스템 백엔드. Frontend(`../all-flow-frontend`)의 OpenAPI 3.1 스펙(`openapi.yaml`)을 그대로 구현한다.

## 스택 (확정)

| 영역 | 선택 | 근거 |
|------|------|------|
| 언어/런타임 | **Node.js 20 LTS + TypeScript 5.x** | Frontend(Next.js 16/TS)와 동일 → 스키마 공유, 학습비용 0 |
| 프레임워크 | **Fastify 5** | OpenAPI 자동 검증 + 빠른 부트 + Pino 통합 |
| ORM / DB | **Prisma 6 + PostgreSQL 16** | Frontend Zod와 mirror, 마이그레이션 안전 |
| 캐시 / Pub-Sub | **Redis 7** | 세션, SSE 팬아웃, BullMQ 큐 |
| 인증 | **JWT (next-auth v5 호환 secret 공유)** | Frontend Bearer 토큰 그대로 검증 |
| 실시간 | **SSE (`/realtime/sse`) + WebSocket(socket.io 5)** | OpenAPI에 명시된 양 방식 모두 지원 |
| 큐 / 잡 | **BullMQ 5** | AI 보고/추출 비동기, 주간/월간 스케줄 |
| AI | **OpenAI / Anthropic SDK 추상 어댑터** | `/ai/complete`, `/ai/extract-actions`, `/reports/*` |
| 검증 | **Zod 3** | OpenAPI ↔ Zod ↔ Prisma 단일 소스 |
| 테스트 | **Vitest + Supertest + Testcontainers (Postgres/Redis)** | 단위 + 통합 + E2E |
| 관측 | **Pino + OpenTelemetry HTTP** | Trace ID + 구조화 로그 |
| 개발 도구 | **pnpm + tsup + tsx + biome** | Frontend와 통일 |
| 컨테이너 | **Docker + docker-compose** | Postgres/Redis 로컬 부트스트랩 |
| CI | **GitHub Actions** | typecheck → lint → test → build → image |

## 디렉토리

```
all-flow-backend/
├─ src/
│  ├─ server.ts                      # Fastify 부트
│  ├─ app.ts                         # 플러그인 등록
│  ├─ config/                        # env 로딩 (zod)
│  ├─ plugins/                       # auth, cors, openapi, prisma, redis, pino
│  ├─ modules/
│  │  ├─ identity/                   # /users/me
│  │  ├─ projects/                   # /projects, /projects/:id
│  │  ├─ tasks/                      # /tasks, /tasks/:id
│  │  ├─ issues/                     # /issues
│  │  ├─ reports/                    # /reports/weekly, /reports/monthly
│  │  ├─ ai/                         # /ai/complete, /ai/extract-actions
│  │  ├─ realtime/                   # /realtime/sse + ws
│  │  └─ notifications/              # /notifications
│  ├─ shared/
│  │  ├─ schemas/                    # Zod (frontend와 mirror)
│  │  ├─ errors/                     # 통일 에러 포맷
│  │  ├─ middleware/                 # auth, rate-limit, request-id
│  │  └─ services/                   # ai-adapter, mailer, websocket-bus
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ tests/
│  ├─ unit/
│  ├─ integration/                   # supertest + testcontainers
│  └─ e2e/                           # 프론트 OpenAPI 컨트랙트 검증
├─ docker/
│  ├─ Dockerfile
│  └─ docker-compose.yml
├─ .github/workflows/ci.yml
├─ openapi.yaml                      # 프론트와 1:1 동기화 (symlink/copy)
├─ package.json
├─ tsconfig.json
└─ README.md
```

## 진행 방식 (PDCA + 상태 추적)

모든 task는 `.bkit/state/features/all-flow-backend/tasks.json` 에서 상태 추적된다.
각 task 완료 시:

1. `tasks.json` 의 해당 항목을 `done` 으로 업데이트 + completed_at 기록
2. `.bkit/state/features/all-flow-backend/progress.md` 자동 갱신
3. PDCA 문서 (`docs/pdca/{phase}-{task}.md`) 생성
4. `git commit -m "feat(backend): T-{id} {title}"`

## Quick Start (구현 후)

```bash
cd all-flow-backend
pnpm install
docker compose -f docker/docker-compose.yml up -d  # postgres + redis
pnpm prisma migrate dev
pnpm seed
pnpm dev                 # → http://localhost:8080/api/v1
pnpm openapi:check       # 프론트와 스펙 일치 검증
pnpm test                # 단위
pnpm test:int            # 통합 (testcontainers)
pnpm test:e2e            # 컨트랙트 (frontend openapi.yaml 기준)
```
