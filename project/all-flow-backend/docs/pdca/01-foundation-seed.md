# T-106 — Prisma 시드 스크립트 (frontend fixtures.ts 기반)

> Phase: 1 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: pnpm seed 후 사용자 5+ / 프로젝트 8 / 태스크 30+ 적재
> Dependencies: [T-101]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: 개발/통합 테스트 환경에서 즉시 의미 있는 데이터로 일할 수 있도록 frontend `fixtures.ts` 기반 시드를 구성한다. 멱등(재실행 안전) + 8 프로젝트 / 30+ 태스크 acceptance를 충족한다.
- 범위:
  - `prisma/seed.ts` — 7 사용자 / 8 프로젝트 / 32 태스크 / 8 이슈 + ProjectMember
  - `tsconfig.seed.json` — 별도 typecheck 컨텍스트(`rootDir = "."`로 prisma/ 포함)
  - `package.json` — `typecheck` 가 두 tsconfig 모두 검증
- 결정/가정:
  - **Source of Truth**: `project/all-flow-frontend/src/lib/fixtures.ts` 의 TEAM/PROJECTS/TASKS/ISSUES.
  - **Frontend는 ID 5 프로젝트 / 6 태스크 / 8 이슈** → acceptance(8/30+) 미달이므로 **시드 단계에서 보강**: 추가 3 프로젝트(p6/p7/p8) + 26 태스크.
  - **upsert 기반 멱등성** — `prisma seed`는 재실행해도 카운트 동일.
  - **ProjectMember**: 첫 멤버를 `owner`, 나머지 `member` (T-105 RBAC 가드 단일 진실 원본).
  - **Issue.status 매핑**: openapi `"in-progress"` / `"in-review"` ↔ Prisma enum `in_progress` / `in_review` (`@map`으로 DB는 frontend와 동일).
  - **별도 tsconfig**: `tsconfig.json` 의 `rootDir: "src"` 제약을 깨지 않으면서 `prisma/seed.ts` 도 typecheck.
- 리스크:
  - 시드 데이터가 통합 테스트 결과에 영향 → T-503 testcontainers 단계에서 fresh DB로 복원 후 시드.
  - Issue.created (human-readable "2시간 전") 컬럼은 시드에서 제거 → DB는 createdAt 자동 timestamp 사용. 응답 직렬화 시 frontend용 포맷터로 변환 (T-204에서 처리).

## Do

> 구현 변경 사항.

- 추가 파일:
  - `prisma/seed.ts` — 4 도메인 upsert + console.info 진행 로그
  - `tsconfig.seed.json` — `rootDir: "."` + prisma/seed.ts 포함, noEmit
  - `docs/pdca/01-foundation-seed.md` (본 문서)
- 수정 파일:
  - `tsconfig.json` — include에서 prisma/seed.ts 제거 (rootDir 충돌 방지)
  - `package.json` — `typecheck`이 `tsc --noEmit && tsc -p tsconfig.seed.json` 2단계 실행
- 추가 의존성: 없음 (prisma/client + tsx 기존 사용)
- 핵심 코드 스냅샷:

```typescript
// prisma/seed.ts (요약)
for (const p of PROJECTS) {
  await prisma.project.upsert({
    where: { id: p.id },
    update: { name: p.name, /* ... */ due: new Date(p.due) },
    create: { id: p.id, name: p.name, /* ... */ due: new Date(p.due) },
  });
  for (const userId of p.members) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: p.id, userId } },
      update: {},
      create: { projectId: p.id, userId, role: userId === p.members[0] ? 'owner' : 'member' },
    });
  }
}
```

## Check

> 검증 결과.

- 단위 테스트: 변경 없음 — 시드 자체는 통합 단계에서 검증
- 통합 테스트: T-503 testcontainers에서 fresh DB → 시드 → API 검증 흐름 추가 예정
- OpenAPI 컨트랙트 검증: ID/필드명이 frontend fixtures와 1:1 매칭 (수동 확인)
- 수동 검증:
  - `DATABASE_URL=postgresql://allflow:allflow@localhost:15432/allflow pnpm seed` → 7/8/32/8 적재
  - 재실행 → 동일 카운트(7/8/32/8) — **멱등성 확인**
  - `psql -c "SELECT COUNT(*) FROM project_members;"` → **21** (8 프로젝트 멤버십)
  - `pnpm typecheck` 그린 (src + prisma/seed.ts 두 컨텍스트), `pnpm lint` 그린, `pnpm test` 22/22 PASS

```
 users | projects | tasks | issues | members 
-------+----------+-------+--------+---------
     7 |        8 |    32 |      8 |      21
```

- 메트릭/로그 확인: console.info 진행 로그만 출력. 에러는 catch → process.exit(1).

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **시드 = 멱등 upsert** : 재실행 안전 + CI/통합 테스트에서 안전하게 재호출 가능.
  - **별도 tsconfig** : `rootDir: src` 제약을 유지하면서 prisma/seed.ts 도 검증. tsup build 산출물에는 영향 없음 (build는 tsconfig.json만 사용).
  - **frontend ID를 그대로 보존** : `me`/`u1`/`p1`/`T-1024`/`ISS-241` opaque string ID 호환 → frontend USE_MOCK=false 전환 시 무중단.
- 메모리에 저장: `시드 데이터는 frontend fixtures와 1:1 매칭 + acceptance용 보강분만 추가. 시드 변경은 fixtures 변경 PR과 함께 묶음`. ProjectMember 첫 멤버 = owner 컨벤션.
- 후속 태스크에 영향:
  - **T-105 RBAC**: ProjectMember.role(owner/admin/member) 기반 권한 매트릭스 단위 테스트가 시드 데이터를 활용 가능.
  - **T-202~T-204 도메인 라우트**: 통합 테스트가 시드 데이터로 정합성 빠르게 검증.
  - **T-503 통합 테스트**: testcontainers 부팅 → migrate → seed → API smoke의 표준 흐름 형성.
  - **T-604 코드 분석**: 시드 데이터에 시크릿/PII 없음 (이메일은 `me`만 가짜 도메인).
- 회고: console.log 대신 console.info 사용 → biome 린트 정책(noConsoleLog)을 자연스럽게 충족. 시드처럼 **CLI 도구**는 console.info가 정답이고, production 코드는 logger 사용.
