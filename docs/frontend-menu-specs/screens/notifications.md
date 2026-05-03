# 알림 센터 (Notifications)

> 경로: `/notifications` | 파일: `src/components/screens/notifications.tsx`  
> E2E: `tests/e2e/menus/admin-notifications-settings.spec.ts`

## 개요

전체 알림 목록 관리 화면. 탑바 드롭다운의 확장 버전으로 모든 알림 이력을 확인한다.

## 기능 목록

### 1. 알림 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 알림 목록 조회 | 전체 알림 페이지네이션 목록 | ✅ | 🔗 GET /notifications | 🧪 menus/admin-notifications-settings.spec.ts |
| 읽음/안읽음 구분 | 읽지 않은 알림 강조 표시 | ✅ | 🔗 (read 필드) | 🧪 menus/admin-notifications-settings.spec.ts |
| 알림 유형 아이콘 | 태스크/이슈/결재/댓글 등 유형별 아이콘 | ✅ | 🔗 | 🧪 menus/admin-notifications-settings.spec.ts |
| 타임스탬프 | "X분 전" 상대 시각 표시 | ✅ | 🔗 | 🧪 menus/admin-notifications-settings.spec.ts |

### 2. 알림 액션

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 알림 읽음 처리 | 클릭 또는 읽음 버튼 | ✅ | 🔗 PATCH /notifications/:id | 🧪 menus/admin-notifications-settings.spec.ts |
| 전체 읽음 처리 | "전체 읽음" 버튼 | ✅ | 🔗 PATCH /notifications/read-all | 🧪 menus/admin-notifications-settings.spec.ts |
| 알림 삭제 | 개별 알림 삭제 | ✅ | 🔗 DELETE /notifications/:id | 🧪 menus/admin-notifications-settings.spec.ts |
| 알림 클릭 이동 | 알림 클릭 → 관련 화면 이동 | ✅ | 🔌 (router push) | 🧪 menus/admin-notifications-settings.spec.ts |

### 3. 알림 필터

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 유형별 필터 | 태스크/이슈/결재/댓글 필터 탭 | ✅ | 🔌 (클라이언트) | 🧪 menus/admin-notifications-settings.spec.ts |
| 읽음/안읽음 필터 | 미읽음만 표시 토글 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |

### 4. 실시간 알림

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 실시간 알림 수신 | WebSocket 이벤트로 새 알림 즉시 표시 | ✅ | 🔗 WebSocket /realtime | 🧪 use-realtime.test.tsx |
| 탑바 뱃지 갱신 | 새 알림 수신 시 탑바 카운트 즉시 갱신 | ✅ | 🔗 GET /nav/counts | 🧪 nav.test.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 알림 센터 E2E 테스트 | 전용 E2E 없음 | 중 |
| 알림 설정 | 알림 수신 채널·유형 설정 (설정 화면으로 이동) | 낮음 |
| 브라우저 푸시 알림 | Web Push API 지원 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
