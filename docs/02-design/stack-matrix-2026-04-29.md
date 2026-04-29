---
title: "Tech Stack Matrix — ALL-Flow 2026-04-29"
date: 2026-04-29
pdca: tech-stack-modernization-2026-04-29
---

# Tech Stack Matrix — ALL-Flow

> PDCA 사이클: `tech-stack-modernization-2026-04-29`
> 기준일: 2026-04-29 | 총 69행 인벤토리 (BE 22 + FE 38 + Infra 4 + Tooling 5)

---

## 1. BE — Node.js Ecosystem (22행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **node** | 22.x (Dockerfile ARG, 갱신 완료) | 22.x LTS | 현재 유지 | Node 22.x LTS(Active). Dockerfile NODE_VERSION=22 이미 반영 |
| **pnpm** | 10.33.0 (packageManager) | 10.x | 현재 유지 | 최신 마이너, 유지 |
| **fastify** | ^5.8.5 | 5.x | 현재 유지 | v5 stable, v4→v5 이미 마이그레이션 완료 |
| **fastify-plugin** | ^5.1.0 | 5.x | 현재 유지 | fastify v5 대응 버전 |
| **@fastify/jwt** | ^9.1.0 | 9.x | 현재 유지 | fastify v5 호환 |
| **@fastify/sensible** | ^6.0.4 | 6.x | 현재 유지 | fastify v5 호환 |
| **@fastify/websocket** | ^11.2.0 | 11.x | 현재 유지 | fastify v5 호환 |
| **@prisma/client** | ^6.19.3 | 7.8.0 | 현재 유지 | Prisma 7 major — 별도 사이클 (breaking). 6.x 안정 유지 |
| **prisma** (devDep) | ^6.19.3 | 7.8.0 | 현재 유지 | CLI 버전 client와 동기 필수. 7.x는 별도 사이클 |
| **ioredis** | ^5.10.1 | 5.x | 현재 유지 | Redis 7.x 완전 호환 |
| **jose** | ^5.10.0 | 5.x | 현재 유지 | JWT/JWK 표준 라이브러리, v5 stable |
| **pino** | ^10.3.1 | 10.x | 현재 유지 | 고성능 JSON 로거 |
| **pino-pretty** | ^13.1.3 | 13.x | 현재 유지 | dev 전용 pretty 출력 |
| **ws** | ^8.20.0 | 8.x | 현재 유지 | @fastify/websocket 내부 dep |
| **zod** | ^4.3.6 | 4.x | 현재 유지 | v4 stable (v3→v4 마이그레이션 완료) |
| **@biomejs/biome** | 1.9.4 (exact) | 1.9.x | 현재 유지 | Biome v2 RC 출시 전, exact pin 유지 |
| **typescript** | ^5.7.2 | 6.0.3 | 현재 유지 | TS 6 major — 호환성 검토 후 별도 사이클 |
| **vitest** | ^2.1.8 | 4.1.5 | 현재 유지 | Vitest 4 major — 별도 사이클 |
| **tsup** | ^8.3.5 | 8.x | 현재 유지 | ESM 번들러, 안정 |
| **tsx** | ^4.19.2 | 4.x | 현재 유지 | ts 실행기, 최신 마이너 |
| **testcontainers** | ^11.14.0 | 11.x | 현재 유지 | 통합 테스트 DB 격리, 최신 마이너 |
| **yaml** | ^2.8.3 | 2.x | 현재 유지 | OpenAPI 스크립트 파싱용 |

---

## 2. FE — React Ecosystem (38행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **node** (runtime) | 22.x (engines, BE와 정렬 완료) | 22.x LTS | 현재 유지 | BE와 동일 버전 정렬 완료 |
| **react** | 19.2.0 | 19.2.5 | 19.2.5 | patch 업그레이드 안전. react-dom과 동기 필수 |
| **react-dom** | 19.2.0 | 19.2.5 | 19.2.5 | react와 동기 필수 |
| **next** | 16.2.0 | 16.2.4 | 16.2.4 | patch 업그레이드 안전. Turbopack GA 유지 |
| **next-auth** | 5.0.0-beta.30 | 4.24.14 (v4 LTS) | 현재 유지 | v5 beta 채택 유지 (v5 stable 미출시). v4 LTS 전환 불필요 |
| **@auth/core** | ^0.40.0 | 0.40.x | 현재 유지 | next-auth v5 피어 dep |
| **@tanstack/react-query** | ^5.83.0 | 5.x | 현재 유지 | TanStack Query v5 stable, 최신 마이너 |
| **react-hook-form** | ^7.65.0 | 7.x | 현재 유지 | 안정 버전, 최신 마이너 |
| **@hookform/resolvers** | ^5.0.1 | 5.x | 현재 유지 | zod v4 resolver 지원 |
| **zod** | ^4.1.0 | 4.x | 현재 유지 | BE와 동일 major. FE는 ^4.1.0, BE는 ^4.3.6 — 정렬 권장 |
| **zustand** | ^5.0.8 | 5.x | 현재 유지 | 경량 전역 상태 관리 v5 stable |
| **ky** | ^1.7.5 | 1.x | 현재 유지 | Fetch wrapper, 경량 |
| **date-fns** | ^4.1.0 | 4.x | 현재 유지 | 날짜 유틸, v4 stable |
| **clsx** | ^2.1.1 | 2.x | 현재 유지 | 조건부 className |
| **tailwind-merge** | ^3.0.1 | 3.x | 현재 유지 | Tailwind 클래스 병합 |
| **class-variance-authority** | ^0.7.1 | 0.7.x | 현재 유지 | CVA, UI 컴포넌트 variant |
| **tailwindcss** | ^4.1.0 | 4.1.x | 현재 유지 | v4 stable (Oxide engine), PostCSS 플러그인 방식 |
| **@tailwindcss/postcss** | ^4.1.0 | 4.1.x | 현재 유지 | Tailwind v4 PostCSS 통합 |
| **postcss** | ^8.5.2 | 8.5.x | 현재 유지 | CSS 트랜스파일러 |
| **motion** | ^12.10.0 | 12.x | 현재 유지 | Framer Motion → Motion 리브랜딩, v12 stable |
| **sonner** | ^2.0.0 | 2.x | 현재 유지 | Toast 알림, v2 stable |
| **lucide-react** | ^0.475.0 | 0.475.x | 현재 유지 | 아이콘 라이브러리, 최신 마이너 |
| **@react-pdf/renderer** | ^4.3.0 | 4.x | 현재 유지 | PDF 렌더링, v4 stable |
| **@radix-ui/react-checkbox** | ^1.1.4 | 1.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **@radix-ui/react-dialog** | ^1.1.6 | 1.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **@radix-ui/react-dropdown-menu** | ^2.1.6 | 2.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **@radix-ui/react-popover** | ^1.1.6 | 1.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **@radix-ui/react-slot** | ^1.1.2 | 1.x | 현재 유지 | Radix UI asChild 패턴 |
| **@radix-ui/react-switch** | ^1.1.3 | 1.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **@radix-ui/react-tabs** | ^1.1.3 | 1.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **@radix-ui/react-tooltip** | ^1.1.8 | 1.x | 현재 유지 | Radix UI 무접속 컴포넌트 |
| **eslint** | ^9.20.1 | 9.x | 현재 유지 | v9 flat config 사용 중 |
| **@eslint/js** | ^9.39.4 | 9.x | 현재 유지 | ESLint v9 core rules |
| **@eslint/eslintrc** | ^3.3.5 | 3.x | 현재 유지 | 레거시 config 호환 브릿지 |
| **typescript** | ^5.7.3 | 6.0.3 | 현재 유지 | TS 6 major — BE와 함께 별도 사이클 |
| **vitest** | ^2.1.9 | 4.1.5 | 현재 유지 | Vitest 4 major — BE와 함께 별도 사이클 |
| **@playwright/test** | ^1.50.0 | 1.59.1 | 1.59.1 | E2E 프레임워크, 마이너 업 안전. trace viewer + 브라우저 지원 개선 |
| **storybook** | ^10.3.5 | 10.x | 현재 유지 | 컴포넌트 문서화, v10 stable |

---

## 3. Infra (4행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **PostgreSQL** | 16-alpine (docker-compose) | 16.x (LTS) | 현재 유지 | PostgreSQL 16 LTS (2028-11 EOL). 안정적. 17로 메이저 업은 불필요 |
| **Redis** | 7-alpine (docker-compose) | 7.2.x (LTS) | 현재 유지 | Redis 7.x LTS. 8.x은 아직 Early Access, 유지 |
| **Node.js base image** | 22.x-alpine (Dockerfile, 갱신 완료) | 22.x-alpine | 현재 유지 | NODE_VERSION=22 이미 반영. engines 필드도 동반 업데이트 완료 |
| **Docker Compose** | v2 (파일 스펙) | 2.x | 현재 유지 | compose v2 문법 사용 중, 업데이트 불필요 |

---

## 4. Tooling (5행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **pnpm** | 10.33.0 | 10.x | 현재 유지 | corepack 관리, 최신 마이너 |
| **TypeScript** | ^5.7.2 / ^5.7.3 | 6.0.3 | 현재 유지 | TS 6 major — 호환성 검토 별도 사이클. 5.x 유지 |
| **Vitest** | ^2.1.8 / ^2.1.9 | 4.1.5 | 현재 유지 | Vitest 4 major — BE/FE 별도 사이클. 2.x 유지 |
| **Playwright** | ^1.50.0 | 1.59.1 | 1.59.1 | E2E + a11y 테스트. 마이너 업 안전 — trace viewer + 브라우저 지원 개선 포함 |
| **Biome** | 1.9.4 (exact pin) | 2.0.x RC | 현재 유지 (1.9.4) | v2 RC 안정화 후 채택 검토. 현재 exact pin 유지 권장 |

---

## 채택 우선순위 요약

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| ~~P0~~ | ~~Node.js 20 → 22 LTS~~ | 완료 — Dockerfile NODE_VERSION=22 반영 (2026-04-29) |
| P0 (즉시) | next 16.2.0 → 16.2.4 | patch, 안전. 즉시 적용 권장 |
| P0 (즉시) | react / react-dom 19.2.0 → 19.2.5 | patch, 안전. next와 함께 적용 |
| P0 (즉시) | Playwright 1.50 → 1.59.1 | minor, 안전. trace viewer + 브라우저 지원 개선 |
| ~~P0~~ | ~~next-auth beta.30 → 5.0.0 stable~~ | v5 stable 없음 — 현재 유지 (2026-04-29 조사 결과) |
| P2 (중기) | TypeScript 5.x → 6.0.3 | major — 호환성 검토 별도 사이클 |
| P2 (중기) | Vitest 2.x → 4.1.5 | major — BE/FE 별도 사이클 |
| P2 (중기) | Prisma 6.x → 7.8.0 | major, breaking — 별도 사이클 |
| P2 (중기) | zod FE ^4.1.0 → ^4.3.x (BE 정렬) | BE/FE 패치 버전 정렬 |
| P3 (검토) | Biome 1.9.4 → 2.x (v2 GA 후) | 현재 RC, GA 후 채택 결정 |
