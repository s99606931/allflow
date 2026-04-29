# ALL-Flow Backend — 운영 런북

> 배포/롤백/장애 대응 절차서. T-505 산출물.
> 마지막 업데이트: 2026-04-28

## 1. 시스템 개요

| 항목 | 값 |
|------|----|
| 런타임 | Node.js 20+ (alpine docker) |
| 프레임워크 | Fastify 5 |
| DB | PostgreSQL 16 |
| 메시지 버스 | Redis 7 (Pub/Sub + 추후 BullMQ) |
| 컨테이너 레지스트리 | GHCR (`ghcr.io/<org>/all-flow-backend`) |
| 헬스 엔드포인트 | `GET /health` → 200 `{ status:'ok', uptime, version }` |
| 메트릭/트레이스 | OpenTelemetry HTTP traceId + Pino 구조화 로그 |

핵심 의존:
- `DATABASE_URL` — postgres 연결 문자열
- `REDIS_URL` — redis 연결 문자열 (멀티노드 fan-out 활성화)
- `AUTH_SECRET` — next-auth v5 호환 비밀 (32자 이상)
- `OPENAI_API_KEY` — 선택 (없으면 InMemoryAdapter 폴백)

## 2. 배포 절차

### 2.1 신규 버전 배포

```
1. PR 머지 → main
2. GitHub Actions:
   - ci.yml: typecheck/lint/test/build 4잡 그린 (필수)
   - docker-publish.yml: GHCR multi-arch (amd64/arm64) 푸시 + 태그 부여
3. 인프라 측에서 새 이미지 태그로 ECS/k8s 디플로이먼트 갱신
4. 헬스 체크 자동 통과 후 트래픽 전환
```

### 2.2 사전 점검 체크리스트

- [ ] `pnpm openapi:check` drift 없음 (frontend yaml ↔ backend yaml)
- [ ] `pnpm openapi:contract:strict` strict 컨트랙트 그린
- [ ] DB 마이그레이션 필요 시 별도 PR로 분리 (`prisma migrate deploy` 단독 실행)
- [ ] env 변경(REDIS_URL/AUTH_SECRET 등) 시 secret 매니저에 반영 후 PR

### 2.3 마이그레이션 정책

- 마이그레이션은 **앞으로만 호환** (forward-compatible). 컬럼 추가/인덱스 추가만 deploy 단계에서 자동 적용.
- 컬럼 삭제/이름 변경은 2단계 배포:
  1. `nullable + 양쪽 코드 호환` 배포
  2. 트래픽 안정화 확인 후 `drop` 마이그레이션 단독 PR

## 3. 롤백 절차

### 3.1 트리거 조건

- `/health` 응답 < 99% 또는 5xx 비율 ≥ 1% (5분 윈도우)
- `OpenTelemetry` p95 latency 기준선 대비 +50%
- 핵심 흐름(로그인/태스크 CRUD) E2E 실패

### 3.2 단계

```
1. Slack #ops 알림 + 인시던트 채널 생성
2. 직전 안정 이미지 태그로 디플로이먼트 갱신
   - kubectl rollout undo deployment/all-flow-backend
   - 또는 ECS: 직전 task definition revision 활성
3. 헬스 안정화 확인 (5xx < 0.1%, p95 회복)
4. 인시던트 보고서 작성 → docs/incidents/YYYY-MM-DD.md
```

### 3.3 DB 롤백 주의

- 코드 롤백 ≠ 마이그레이션 롤백.
- forward-only 정책상 **DB 롤백은 수동**. 새 마이그레이션을 작성해 역방향 적용.

### 3.4 dry-run 시나리오 (검증 완료)

```
시나리오: v0.1.5 → v0.1.4 롤백 (가상)
1) GHCR 이미지 ghcr.io/org/all-flow-backend:0.1.4 존재 확인 ✓
2) `kubectl rollout undo deployment/all-flow-backend` (또는 ECS revision)
3) 새 파드 시작 → `/health` 200 응답 확인
4) Pino 로그에 'shutdown signal received' (이전 파드) + 'server listening' (새 파드)
5) 5xx 비율 회복 (Sentry/OTel 대시보드)
시간 예산: 검출 5분 + 롤백 실행 3분 + 안정화 10분 = 약 18분
```

## 4. 장애 대응 플레이북

### 4.1 DB 연결 실패

증상: 5xx + 로그 `prisma:error connection`
조치:
1. RDS/Postgres 인스턴스 상태 확인 (CloudWatch/Grafana)
2. `DATABASE_URL` 시크릿 만료/회전 여부 확인
3. 연결 풀 고갈이면 인스턴스 수 임시 증설
4. 회복 안 되면 직전 안정 버전으로 롤백

### 4.2 Redis 끊김

증상: SSE/WS 양쪽이 동작하지만 멀티노드 동기화 실패
조치:
1. Redis 인스턴스 상태 확인
2. ioredis 자동 재연결 — 메시지 일부 유실 (best-effort 정책)
3. 사용자 영향: 다른 노드의 알림이 잠시 뒤늦게 도착할 수 있음
4. 30분 이상 지속 시 캐파 증설/페일오버

### 4.3 AI 어댑터 오류

증상: `/ai/complete` 502 + `AI_ADAPTER_ERROR`
조치:
1. OpenAI 상태 페이지 확인
2. 키 회전 여부, 사용량 한도 확인
3. 임시로 InMemoryAdapter 폴백 (env에서 OPENAI_API_KEY 제거 후 재시작)
4. 사용자 영향 공지 (status page)

### 4.4 인증 실패 폭주

증상: 401 응답 비율 급증
조치:
1. `AUTH_SECRET` 회전 여부 확인 (frontend/backend 비대칭)
2. 토큰 만료/시계 드리프트 (NTP) 확인
3. 클라이언트 캐시 invalidate 안내

## 5. 대시보드 / 알림 정책

| 지표 | 임계 | 대응 |
|------|-----:|------|
| 5xx 비율 (5분) | ≥ 1% | warning |
| 5xx 비율 (5분) | ≥ 5% | page on-call |
| p95 latency | 기준선 +50% | warning |
| /health 5xx | 5분 연속 | page on-call |
| Redis 연결 끊김 | 1분 이상 | warning |
| AI 502 비율 | ≥ 10% (5분) | warning + 공지 |

알림 채널:
- warning → Slack #backend-alerts
- page → PagerDuty `all-flow-backend` 서비스

## 6. 자주 쓰는 명령

```bash
# 로컬 헬스
curl -fsS http://localhost:8080/health | jq

# 컨테이너 헬스
docker ps --filter name=all-flow-backend
docker logs --tail 200 -f all-flow-backend

# 마이그레이션 적용
pnpm prisma migrate deploy

# OpenAPI drift 점검
pnpm openapi:check
pnpm openapi:contract:strict

# 통합 테스트 (T-503 testcontainers)
pnpm test:int
```

## 7. 변경 이력

| 날짜 | 변경 | 작성자 |
|------|------|--------|
| 2026-04-28 | 초기 작성 (T-505) | Lead |
