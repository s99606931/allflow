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
| **node** | 20.18.1 (Dockerfile ARG) | 22.x | 22.x LTS | Node 20은 2026-04 LTS 종료 예정. 22.x LTS(Active) 전환 권장 |
| **pnpm** | 10.33.0 (packageManager) | 10.x | 현재 유지 | 최신 마이너, 유지 |
| **fastify** | ^5.8.5 | 5.x | 현재 유지 | v5 stable, v4→v5 이미 마이그레이션 완료 |
| **fastify-plugin** | ^5.1.0 | 5.x | 현재 유지 | fastify v5 대응 버전 |
| **@fastify/jwt** | ^9.1.0 | 9.x | 현재 유지 | fastify v5 호환 |
| **@fastify/sensible** | ^6.0.4 | 6.x | 현재 유지 | fastify v5 호환 |
| **@fastify/websocket** | ^11.2.0 | 11.x | 현재 유지 | fastify v5 호환 |
| **@prisma/client** | ^6.19.3 | 6.x | 현재 유지 | Prisma 6 stable. ORM 레이어 안정 |
| **prisma** (devDep) | ^6.19.3 | 6.x | 현재 유지 | CLI 버전 client와 동기 필수 |
| **ioredis** | ^5.10.1 | 5.x | 현재 유지 | Redis 7.x 완전 호환 |
| **jose** | ^5.10.0 | 5.x | 현재 유지 | JWT/JWK 표준 라이브러리, v5 stable |
| **pino** | ^10.3.1 | 10.x | 현재 유지 | 고성능 JSON 로거 |
| **pino-pretty** | ^13.1.3 | 13.x | 현재 유지 | dev 전용 pretty 출력 |
| **ws** | ^8.20.0 | 8.x | 현재 유지 | @fastify/websocket 내부 dep |
| **zod** | ^4.3.6 | 4.x | 현재 유지 | v4 stable (v3→v4 마이그레이션 완료) |
| **@biomejs/biome** | 1.9.4 (exact) | 1.9.x | 현재 유지 | Biome v2 RC 출시 전, exact pin 유지 |
| **typescript** | ^5.7.2 | 5.8.x | 5.8.x | 5.8 — `erasableSyntaxOnly` + perf 개선. 마이너 업 권장 |
| **vitest** | ^2.1.8 | 2.3.x | 2.3.x | 2.3 — improved browser/worker mode. 마이너 업 권장 |
| **tsup** | ^8.3.5 | 8.x | 현재 유지 | ESM 번들러, 안정 |
| **tsx** | ^4.19.2 | 4.x | 현재 유지 | ts 실행기, 최신 마이너 |
| **testcontainers** | ^11.14.0 | 11.x | 현재 유지 | 통합 테스트 DB 격리, 최신 마이너 |
| **yaml** | ^2.8.3 | 2.x | 현재 유지 | OpenAPI 스크립트 파싱용 |

---

## 2. FE — React Ecosystem (38행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **node** (runtime) | 20.x (engines inherit) | 22.x | 22.x LTS | BE와 동일 버전 정렬 권장 |
| **react** | 19.2.0 | 19.2.x | 현재 유지 | React 19 stable (2024-12 출시), 최신 유지 |
| **react-dom** | 19.2.0 | 19.2.x | 현재 유지 | react와 동기 필수 |
| **next** | 16.2.0 | 16.2.x | 현재 유지 | Next.js 16 (Turbopack GA). 현재 최신 마이너 |
| **next-auth** | 5.0.0-beta.30 | 5.0.0 stable | 5.0.0 stable | beta.30 → stable 업그레이드 권장. 보안 수정 포함 가능성 |
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
| **typescript** | ^5.7.3 | 5.8.x | 5.8.x | BE와 동일 — 마이너 업 정렬 권장 |
| **vitest** | ^2.1.9 | 2.3.x | 2.3.x | BE와 동일 — 마이너 업 정렬 권장 |
| **@playwright/test** | ^1.50.0 | 1.52.x | 1.52.x | E2E 프레임워크, 마이너 업 권장 |
| **storybook** | ^10.3.5 | 10.x | 현재 유지 | 컴포넌트 문서화, v10 stable |

---

## 3. Infra (4행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **PostgreSQL** | 16-alpine (docker-compose) | 16.x (LTS) | 현재 유지 | PostgreSQL 16 LTS (2028-11 EOL). 안정적. 17로 메이저 업은 불필요 |
| **Redis** | 7-alpine (docker-compose) | 7.2.x (LTS) | 현재 유지 | Redis 7.x LTS. 8.x은 아직 Early Access, 유지 |
| **Node.js base image** | 20.18.1-alpine (Dockerfile) | 22.x-alpine | 22.x-alpine | Docker base image를 Node 22로 전환. engines 필드도 동반 업데이트 |
| **Docker Compose** | v2 (파일 스펙) | 2.x | 현재 유지 | compose v2 문법 사용 중, 업데이트 불필요 |

---

## 4. Tooling (5행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **pnpm** | 10.33.0 | 10.x | 현재 유지 | corepack 관리, 최신 마이너 |
| **TypeScript** | ^5.7.2 / ^5.7.3 | 5.8.x | 5.8.x | BE/FE 모두 5.8로 정렬 권장. `erasableSyntaxOnly` 신규 플래그 활용 가능 |
| **Vitest** | ^2.1.8 / ^2.1.9 | 2.3.x | 2.3.x | BE/FE 모두 2.3으로 정렬. 브라우저/워커 모드 개선 포함 |
| **Playwright** | ^1.50.0 | 1.52.x | 1.52.x | E2E + a11y 테스트. 마이너 업 — trace viewer 개선 포함 |
| **Biome** | 1.9.4 (exact pin) | 2.0.x RC | 현재 유지 (1.9.4) | v2 RC 안정화 후 채택 검토. 현재 exact pin 유지 권장 |

---

## 채택 우선순위 요약

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| P0 (즉시) | Node.js 20 → 22 LTS (Dockerfile + engines) | Node 20 LTS Active 종료 임박 |
| P0 (즉시) | next-auth beta.30 → 5.0.0 stable | beta 버전 보안 리스크 |
| P1 (단기) | TypeScript 5.7 → 5.8 (BE + FE 정렬) | 성능 개선, erasableSyntaxOnly |
| P1 (단기) | Vitest 2.1 → 2.3 (BE + FE 정렬) | 워커 모드 안정성 개선 |
| P1 (단기) | Playwright 1.50 → 1.52 | trace viewer 개선, 최신 브라우저 대응 |
| P2 (중기) | zod FE ^4.1.0 → ^4.3.x (BE 정렬) | BE/FE 패치 버전 정렬 |
| P3 (검토) | Biome 1.9.4 → 2.x (v2 GA 후) | 현재 RC, GA 후 채택 결정 |
