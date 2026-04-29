// Next.js 16+ uses `proxy.ts` (renamed from `middleware.ts`).
// next-auth v5 still exposes the handler under `auth`; we just re-export it
// under the `proxy` name so Next 16 picks it up.
export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:png|jpe?g|svg|webp|woff2?)).*)'],
};
