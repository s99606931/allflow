/**
 * Prisma 시드 (호환 레이어) — 본 파일은 데모 시드를 호출한다.
 *
 * 신규 사용 (권장):
 *   pnpm seed:init   # 빈 DB + admin 1명 (사용자 직접 입력)
 *   pnpm seed:demo   # 모든 메뉴 데모 데이터
 *   pnpm seed:reset  # 데이터 초기화
 *
 * 하위 호환:
 *   pnpm seed         # = pnpm seed:demo
 *   prisma db seed    # 본 파일 호출 → demo.ts 실행
 *
 * 실 구현은 prisma/seeds/{init,demo,reset}.ts 분리.
 */
import './seeds/demo.js';
