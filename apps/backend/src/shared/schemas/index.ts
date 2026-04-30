/**
 * Generated zod schemas re-export.
 *
 * `api.generated.ts`는 @all-flow/contracts (packages/contracts/openapi.yaml)에서
 * 자동 생성되며 직접 수정 금지. 도메인 코드는 항상 이 인덱스를 통해 import →
 * 향후 generator 출력 형식이 바뀌더라도 영향 없음.
 *
 * 재생성 / drift 검사:
 *   pnpm openapi:gen     # @all-flow/contracts gen:zod 위임 (소스 → ts + .openapi.hash 갱신)
 *   pnpm openapi:check   # CI에서 hash drift 차단
 */
export * from './api.generated.js';
