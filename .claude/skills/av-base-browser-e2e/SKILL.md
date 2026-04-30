---
name: av-base-browser-e2e
description: |
  직접 브라우저 E2E 게이트웨이. 환경 학습 → 메뉴별 시나리오 자동 작성 →
  Playwright 실 브라우저 실행 → 결과 보고를 한 번에 수행한다.
  /av pm team 의 QA 트랙 또는 /av-base-browser-e2e 직접 호출로 진입.
autovibe: true
version: "1.0"
created: "2026-04-30"
group: base
argument-hint: "[all|learn|author|run] [menu-key?]"
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash, Skill, Agent]
context: fork
agent: general-purpose
---

# av-base-browser-e2e — 직접 브라우저 E2E 게이트웨이

> **실 브라우저(Playwright)** 로 모든 메뉴를 CRUD 외 동작까지 망라 검증.
> **gstack 추상화 미사용** — Playwright API 직접 사용.

## 인자

- `all` (기본): learn → author → run 전체 파이프라인
- `learn`: 환경 학습만 (헬스체크 + 인벤토리)
- `author`: spec 파일 작성/갱신만
- `run`: 기존 spec 실행만
- `menu-key?` (선택): 특정 메뉴 1개만 (예: `tasks`)

## 실행 시퀀스

### `all` 모드 (기본)

1. **Learn** — 헬스체크
   ```bash
   curl -sS -o /dev/null -w "FE3000:%{http_code}\n" http://localhost:3000/ || true
   curl -sS -o /dev/null -w "FE80:%{http_code}\n" http://localhost/ || true
   curl -sS http://localhost:8080/health
   ```
   - FE 가 어느 포트에서도 200/3xx 가 아니면 즉시 중단 (사용자에게 `pnpm dev` 또는 `docker compose up` 안내)
   - `E2E_BASE_URL` 자동 결정 (3000 우선, 없으면 80)

2. **Inventory** — 라우트 + 사이드바 메뉴 매핑
   ```bash
   find apps/frontend/src/app -name "page.tsx" -not -path "*/api/*" \
     | sed 's|.*src/app||; s|/page.tsx$||; s|^$|/|' | sort -u
   ```

3. **Author** — `Agent("av-base-browser-e2e-author", { mode: "author" })`
   - 메뉴별로 `apps/frontend/tests/e2e/menus/{menu}.spec.ts` 작성/갱신
   - 기존 파일은 보존 + 헤더에 timestamp 갱신만

4. **Run** — Playwright 실행
   ```bash
   cd apps/frontend
   E2E_BASE_URL="$E2E_BASE_URL" pnpm exec playwright test tests/e2e/menus --reporter=line
   ```

5. **Report** — JSON 보고 (av-base-browser-e2e-author 의 보고 스키마 따름)

### `run` 모드

위 4~5 단계만 수행.

### `author` 모드

1~3 단계만 수행.

### `learn` 모드

1~2 단계만 수행 후 인벤토리 출력.

## 통과 기준

- 메뉴 spec 의 `passed / total` ≥ 0.90 → PASS
- 콘솔 에러 0건 (smoke 필터 적용)
- < 0.90 시 PL에게 보고하고 `Agent("bkit:pdca-iterator", { feature: "browser-e2e", trigger: "qa-fail" })` 자동 트리거 권고

## 호출 예시

```
/av-base-browser-e2e all
/av-base-browser-e2e run tasks
/av-base-browser-e2e author
/av-base-browser-e2e learn
```

## 의존성

- `apps/frontend/playwright.config.ts` (수정 안 함)
- `apps/frontend/tests/e2e/global-setup.ts` (인증 storageState)
- Playwright Chromium binary 가 `pnpm exec playwright install` 로 설치되어 있어야 함
