# T-102 — OpenAPI 3.1 로딩 + Zod 스키마 자동 생성 (frontend yaml mirror)

> Phase: 1 | Owner: Backend-A | Status: done | Created: 2026-04-28
> Acceptance: src/shared/schemas/* 자동 생성 + drift 검증 스크립트
> Dependencies: [T-101]

## Plan

> 무엇을, 왜, 어떻게.

- 목표: 프론트엔드 `project/all-flow-frontend/openapi.yaml` 을 단일 진실 원본으로 삼아 백엔드가 그대로 거울 반사한 zod 스키마를 자동 생성·검증한다. drift = 0 을 CI에서 강제한다.
- 범위:
  - `scripts/openapi-to-zod.mjs` — yaml → zod 변환기 (의존성 yaml 1개)
  - `scripts/openapi-drift.mjs` — yaml SHA-256 ↔ 저장된 hash 비교
  - `src/shared/schemas/api.generated.ts` — 자동 생성물
  - `src/shared/schemas/.openapi.hash` — generator가 마지막으로 본 yaml의 해시
  - `src/shared/schemas/index.ts` — 도메인 코드용 facade 재-export
  - `src/shared/schemas/schemas.test.ts` — 8 케이스 parity 테스트
  - `package.json` — `openapi:gen` / `openapi:check` 스크립트
- 결정/가정:
  - **도구 선택**: `openapi-zod-client` 는 Zodios runtime을 끌어들이고 zod v3에 peer 잠겨 있어 우리 zod v4 환경과 충돌. **자체 50줄짜리 컨버터를 작성**해 의존성을 yaml 1개로 최소화하고 zod v4 출력만 생성.
  - **drift 검출 방식**: yaml 전체 본문을 SHA-256 해시 → 생성기가 hash 파일을 함께 갱신, drift 검사기가 hash 비교만 수행. AST diff보다 단순하고 false negative 없음.
  - **정렬**: `$ref` 의존성 위상 정렬해 `StatusKey` → `Project` 순서를 보장 (zod 즉시 평가 가능, `z.lazy` 불필요).
  - **discriminated union**: openapi `oneOf + discriminator.propertyName` → `z.discriminatedUnion(prop, [...])`.
  - **알 수 없는 노드**는 `z.unknown()` + 경고 로그. 현 yaml에서는 발생하지 않음.
- 리스크:
  - 컨버터 자체 작성으로 OpenAPI feature coverage가 제한됨 (allOf, nullable: true v3 스타일 등). 현재 yaml은 OpenAPI 3.1 + 단순 type/oneOf만 사용 → 충분. 후속 yaml 확장 시 변환기에 케이스 추가.
  - hash 기반 drift는 yaml의 의미론적으로 동등한 변경(공백 줄/주석)도 drift로 잡음 → 의도된 동작 (변경 시 항상 재생성+커밋 강제).

## Do

> 구현 변경 사항.

- 추가 파일:
  - `scripts/openapi-to-zod.mjs` — yaml 파싱 + 위상 정렬 + zod 코드 직렬화 + hash 기록
  - `scripts/openapi-drift.mjs` — `.openapi.hash` ↔ 현재 yaml SHA-256 비교 (불일치 시 exit 1)
  - `src/shared/schemas/api.generated.ts` — **자동 생성** (20 schemas: StatusKey/User/Project/ProjectCreate/ProjectPatch/Task/TaskCreate/TaskPatch/IssueSev/IssuePrio/IssueStatus/Issue/Report/ExtractedAction/Notification/RealtimeEvent/RealtimeNotification/RealtimeActivity/RealtimePresence/RealtimeChat)
  - `src/shared/schemas/.openapi.hash` — `b4e92e4b…` (현재 yaml 해시)
  - `src/shared/schemas/index.ts` — facade
  - `src/shared/schemas/schemas.test.ts` — 8 parity 테스트
  - `docs/pdca/01-foundation-openapi.md` (본 문서)
- 수정 파일:
  - `package.json` — `"openapi:gen": "node scripts/openapi-to-zod.mjs"` 추가
- 추가 의존성: `yaml@^2.8.3` (devDep)
- 핵심 코드 스냅샷:

```javascript
// scripts/openapi-to-zod.mjs (요약)
case 'object': {
  const required = new Set(node.required ?? []);
  const lines = Object.entries(node.properties ?? {}).map(([key, val]) => {
    const inner = toZod(val);
    const field = required.has(key) ? inner : `${inner}.optional()`;
    return `  ${JSON.stringify(key)}: ${field}`;
  });
  return `z.object(${lines.length ? `{\n${lines.join(',\n')}\n}` : '{}'})`;
}
```

```typescript
// 자동 생성 결과 발췌 (api.generated.ts)
export const StatusKey = z.enum(['todo', 'doing', 'review', 'done', 'blocked']);
export const Issue = z.object({
  id: z.string(),
  title: z.string(),
  // ... 16개 필수 필드 ...
  resolved: z.boolean().optional(),
});
```

## Check

> 검증 결과.

- 단위 테스트: `pnpm test` → **16/16 PASS** (env 8 + schemas 8)
  - User canonical fixture / StatusKey enum 일치 / Project 필수 필드 / Task free-form due / Issue 16 필드 / ExtractedAction 0..1 범위 / Notification kind enum / RealtimeEvent discriminator
- 통합 테스트: T-503에서 라우트 단계 검증
- OpenAPI 컨트랙트 검증: `pnpm openapi:gen` → `pnpm openapi:check` 통과 (`hash matches generated schemas`)
- 수동 검증:
  - `pnpm openapi:gen` → 20 schemas 생성, hash 갱신
  - `pnpm openapi:check` → drift 0 확인
  - `pnpm typecheck` 그린, `pnpm lint` (biome) 그린 — 생성 파일은 `**/*.generated.ts` 패턴으로 lint 제외
- 메트릭/로그 확인: 컨버터 stderr 경고 0건 (yaml 전체가 알려진 노드 타입으로 매핑됨)

## Act

> 학습 / 다음 단계.

- 학습한 패턴:
  - **자체 변환기 < 외부 도구**: 외부 도구가 무거운 런타임(Zodios)을 끌어오거나 peer-dep 충돌하면, **단일 책임 50줄 변환기**가 더 안전 + 더 가벼움.
  - **Hash 기반 drift**가 AST 비교보다 단순. 의미론적 동등성을 굳이 추적할 필요 없으면 hash로 충분.
  - **위상 정렬** 한 번이면 zod의 즉시 평가에 안전 → `z.lazy` 회피.
- 메모리에 저장: `프로젝트별 openapi.yaml 변경 시 항상 pnpm openapi:gen 후 커밋. CI는 openapi:check만 돌려서 drift 차단`. 컨트롤러 입력은 항상 `import { ProjectCreate } from '@/shared/schemas'` 식으로 경계 검증.
- 후속 태스크에 영향:
  - **T-103 (auth)**: `User` 스키마를 `req.user` 타입 단일 진실 원본으로 사용.
  - **T-104 (errors)**: ZodError → 통일 ErrorResponse 변환 시 schema 이름 추적 가능.
  - **T-202~T-205 (도메인 라우트)**: requestBody / response 모두 generated zod로 검증.
  - **T-601 (contract verify)**: `pnpm openapi:check` + 응답 본문 zod parse 통합 검증.
- 회고: openapi-zod-client가 메이저 도구이지만 **peer dep 잠금 때문에 zod v4 프로젝트에는 부적합**. 향후 zod v4 native 도구가 나오면 마이그레이션 검토. 지금은 자체 변환기가 deps 최소화 + 명시적 통제 측면에서 더 좋음.
