---
title: "Tech Stack Matrix — ALL-Flow 2026-04-29"
date: 2026-04-29
pdca: tech-stack-modernization-2026-04-29
---

# Tech Stack Matrix — ALL-Flow

> PDCA 사이클: `tech-stack-modernization-2026-04-29`
> 기준일: 2026-04-29 | 총 69행 인벤토리 (BE 22 + FE 38 + Infra 4 + Tooling 5)
> **v2 수정 (2026-04-29)**: CTO 팀 실사 후 8건 오류 수정 — Biome/ESLint/jose/@fastify/jwt/Node LTS/PostgreSQL/Redis/@auth/core

---

## 1. BE — Node.js Ecosystem (22행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **node** | 22.x (Dockerfile ARG, 갱신 완료) | **24.15.0 LTS (Active)** | 현재 유지 → P1 고려 | ⚠️ **Node 24 "Krypton" 2026-04-15 Active LTS 진입.** 22.x는 Maintenance LTS("Jod")로 전환. 새 프로젝트는 24.x 권장. 현 사이클 유지, 별도 업그레이드 사이클 추천 |
| **pnpm** | 10.33.0 (packageManager) | **10.33.2** | 현재 유지 | patch 차이 (10.33.0 → 10.33.2), 무관 |
| **fastify** | ^5.8.5 | 5.x | 현재 유지 | v5 stable, v4→v5 이미 마이그레이션 완료 |
| **fastify-plugin** | ^5.1.0 | 5.x | 현재 유지 | fastify v5 대응 버전 |
| **@fastify/jwt** | ^9.1.0 | **10.0.0** | 현재 유지 (별도 사이클) | ⚠️ major 10.0.0 GA 출시. 9.x → 10.x breaking 변경 있음 — 별도 사이클 처리 |
| **@fastify/sensible** | ^6.0.4 | 6.x | 현재 유지 | fastify v5 호환 |
| **@fastify/websocket** | ^11.2.0 | 11.x | 현재 유지 | fastify v5 호환 |
| **@prisma/client** | ^6.19.3 | 7.8.0 | 현재 유지 | Prisma 7 major — 별도 사이클 (breaking). 6.x 안정 유지 |
| **prisma** (devDep) | ^6.19.3 | 7.8.0 | 현재 유지 | CLI 버전 client와 동기 필수. 7.x는 별도 사이클 |
| **ioredis** | ^5.10.1 | 5.x | 현재 유지 | Redis 7.x 완전 호환 |
| **jose** | ^5.10.0 | **6.2.3** | 현재 유지 (별도 사이클) | ⚠️ v6 GA 출시. npm latest 태그 = 6.x. 5.x → 6.x breaking API 변경 검토 후 별도 사이클 |
| **pino** | ^10.3.1 | 10.x | 현재 유지 | 고성능 JSON 로거 |
| **pino-pretty** | ^13.1.3 | 13.x | 현재 유지 | dev 전용 pretty 출력 |
| **ws** | ^8.20.0 | 8.x | 현재 유지 | @fastify/websocket 내부 dep |
| **zod** | ^4.3.6 | 4.x | 현재 유지 | v4 stable (v3→v4 마이그레이션 완료) |
| **@biomejs/biome** | 1.9.4 (exact) | **2.4.13** | 현재 유지 → P1 채택 검토 | ⚠️ **오류 수정**: 이전 표기 "2.0.x RC"는 잘못됨. 2.x는 이미 GA stable (latest=2.4.13). 1.9.4 → 2.x 마이그레이션 검토 필요 (config format 변경) |
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
| **node** (runtime) | 22.x (engines, BE와 정렬 완료) | **24.15.0 LTS (Active)** | 현재 유지 → P1 고려 | ⚠️ Node 24 Active LTS 진입. BE 항목 동일 — 별도 사이클에서 BE/FE 동시 업그레이드 권장 |
| **react** | 19.2.0 | 19.2.5 | 19.2.5 | patch 업그레이드 안전. react-dom과 동기 필수 |
| **react-dom** | 19.2.0 | 19.2.5 | 19.2.5 | react와 동기 필수 |
| **next** | 16.2.0 | 16.2.4 | 16.2.4 | patch 업그레이드 안전. Turbopack GA 유지 |
| **next-auth** | 5.0.0-beta.30 | beta.31 (v5 stable 미출시) | 현재 유지 | v5 stable 미출시. beta.31이 최신 beta (현재 beta.30 사용). v4 LTS 전환 불필요 |
| **@auth/core** | ^0.40.0 | **0.34.x** (주의) | 현재 유지 — 검증 필요 | ⚠️ npm latest = 0.34.3. 0.40.x는 next-auth v5 beta 피어 dep으로 별도 배포 채널일 수 있음. package.json ^0.40.0이 동작 중이면 유지, 미동작 시 0.34.x로 핀 |
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
| **tailwindcss** | ^4.1.0 | **4.2.4** | **4.2.4** 채택 | minor 업그레이드 안전. 4.2.x에 Vite 최적화 + 성능 개선 포함 |
| **@tailwindcss/postcss** | ^4.1.0 | **4.2.4** | **4.2.4** 채택 | tailwindcss와 동기 필수 |
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
| **eslint** | ^9.20.1 | **10.2.1** | 현재 유지 (별도 사이클) | ⚠️ ESLint 10 GA 출시. 9.x → 10.x 마이그레이션 필요 (flat config 유지이나 API 변경). 별도 사이클 |
| **@eslint/js** | ^9.39.4 | **10.0.1** | 현재 유지 (별도 사이클) | eslint 10과 동기. 별도 사이클에서 함께 업그레이드 |
| **@eslint/eslintrc** | ^3.3.5 | 3.x | 현재 유지 | 레거시 config 호환 브릿지 |
| **typescript** | ^5.7.3 | 6.0.3 | 현재 유지 | TS 6 major — BE와 함께 별도 사이클 |
| **vitest** | ^2.1.9 | 4.1.5 | 현재 유지 | Vitest 4 major — BE와 함께 별도 사이클 |
| **@playwright/test** | ^1.50.0 | 1.59.1 | 1.59.1 | E2E 프레임워크, 마이너 업 안전. trace viewer + 브라우저 지원 개선 |
| **storybook** | ^10.3.5 | 10.x | 현재 유지 | 컴포넌트 문서화, v10 stable |

---

## 3. Infra (4행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **PostgreSQL** | 16-alpine (docker-compose) | **17.9** (최신 stable) | 현재 유지 → P2 고려 | ⚠️ **오류 수정**: PG 17.9가 현재 latest stable. PG 18.3도 출시(2025-09). 16 EOL은 2028-11로 유효하나 17이 production 권장. 별도 마이그레이션 사이클 권장 |
| **Redis** | 7-alpine (docker-compose) | **8.6.2** (GA) | 현재 유지 → P2 고려 | ⚠️ **오류 수정**: "Early Access" 표기는 잘못됨. Redis 8.x는 GA (8.6.2 latest). 7.4.x는 여전히 지원되나 8.x 업그레이드 계획 필요 |
| **Node.js base image** | 22.x-alpine (Dockerfile, 갱신 완료) | **24.x-alpine (Active LTS)** | 현재 유지 → P1 고려 | ⚠️ Node 24 Active LTS. 22.x Maintenance LTS. 별도 사이클에서 Dockerfile NODE_VERSION=24로 업데이트 권장 |
| **Docker Compose** | v2 (파일 스펙) | 2.x | 현재 유지 | compose v2 문법 사용 중, 업데이트 불필요 |

---

## 4. Tooling (5행)

| 패키지 | 현재 버전 | 최신 stable (2026-04-29) | 채택 | 비고 |
|--------|-----------|--------------------------|------|------|
| **pnpm** | 10.33.0 | **10.33.2** | 현재 유지 | patch 차이만 (10.33.0 vs 10.33.2). packageManager 필드 갱신 선택 사항 |
| **TypeScript** | ^5.7.2 / ^5.7.3 | 6.0.3 | 현재 유지 | TS 6 major GA (2026-04-16 latest 태그 승격). 5.x → 6.x 호환성 검토 후 별도 사이클 |
| **Vitest** | ^2.1.8 / ^2.1.9 | 4.1.5 | 현재 유지 | Vitest 4 major stable. beta.1은 v5 pre-release. BE/FE 별도 사이클 |
| **Playwright** | ^1.50.0 | 1.59.1 | 1.59.1 | E2E + a11y 테스트. 마이너 업 안전 — trace viewer + 브라우저 지원 개선 포함 |
| **Biome** | 1.9.4 (exact pin) | **2.4.13** | **P1 채택 검토** | ⚠️ **오류 수정**: "2.0.x RC"는 잘못됨. Biome 2.x는 GA stable (latest=2.4.13). config format 변경 있으나 마이그레이션 가이드 제공. 1.9.4 → 2.4.13 계획 수립 권장 |

---

## 채택 우선순위 요약 (v2 수정판)

> **⚠️ v2 변경**: CTO 팀 실사 결과 8건 오류 수정. 우선순위 재정렬.

| 우선순위 | 항목 | 이유 |
|---------|------|------|
| ~~P0~~ | ~~Node.js 20 → 22 LTS~~ | 완료 — Dockerfile NODE_VERSION=22 반영 (2026-04-29) |
| **P0 (즉시)** | next 16.2.0 → 16.2.4 | patch, 안전. 즉시 적용 권장 |
| **P0 (즉시)** | react / react-dom 19.2.0 → 19.2.5 | patch, 안전. next와 함께 적용 |
| **P0 (즉시)** | Playwright 1.50 → 1.59.1 | minor, 안전. trace viewer + 브라우저 지원 개선 |
| **P0 (즉시)** | tailwindcss + @tailwindcss/postcss 4.1.x → 4.2.4 | minor, 안전. Vite 최적화 + 성능 개선 |
| ~~P0~~ | ~~next-auth beta.30 → 5.0.0 stable~~ | v5 stable 없음 (beta.31 최신). 유지 |
| **P1 (단기)** | Biome 1.9.4 → 2.4.13 | **2.x GA 확인됨** (이전 "RC" 표기 오류). config 마이그레이션 필요 |
| **P1 (단기)** | Node.js 22 → 24 (Active LTS) | 24 "Krypton" 2026-04-15 Active LTS 진입. Dockerfile + engines 업데이트 |
| **P1 (단기)** | Redis 7.x → 8.6.2 | **8.x GA 확인됨** (이전 "Early Access" 표기 오류). docker-compose 이미지 태그 변경 |
| P2 (중기) | PostgreSQL 16 → 17.9 | 17이 현재 latest stable. 16 EOL 2028-11로 유효하나 17 채택 권장 |
| P2 (중기) | ESLint 9.x → 10.2.1 | **ESLint 10 GA** (이전 "9.x latest" 오류). 9.x → 10.x flat config API 변경 확인 필요 |
| P2 (중기) | @fastify/jwt 9.x → 10.0.0 | major GA. 9.x → 10.x breaking 변경 검토 후 BE 별도 사이클 |
| P2 (중기) | jose 5.x → 6.2.3 | major GA. 5.x → 6.x API 변경 검토 후 BE 별도 사이클 |
| P2 (중기) | TypeScript 5.x → 6.0.3 | major GA (2026-04-16). 호환성 검토 후 BE/FE 동시 사이클 |
| P2 (중기) | Vitest 2.x → 4.1.5 | major — BE/FE 별도 사이클 |
| P2 (중기) | Prisma 6.x → 7.8.0 | major, breaking — 별도 사이클 |
| P2 (중기) | zod FE ^4.1.0 → ^4.3.x (BE 정렬) | BE/FE 패치 버전 정렬 |
| P3 (검토) | @auth/core 0.40.x 검증 | npm latest=0.34.3 불일치. next-auth v5 beta 채널 확인 필요 |
