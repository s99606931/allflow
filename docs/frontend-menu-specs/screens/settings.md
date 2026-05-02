# 개인 설정 (Settings)

> 경로: `/settings` | 파일: `src/components/screens/settings.tsx`, `settings/`  
> E2E: `tests/e2e/menus/admin-notifications-settings.spec.ts`

## 개요

사용자 개인 설정 허브. 프로필·외관·언어·알림·보안·통합·단축키·계정 삭제 섹션으로 구성.

## 섹션별 기능

### 1. 프로필 (ProfileSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 이름 표시/수정 | 표시명 변경 | ✅ | 🔗 PATCH /identity/profile | 🧪 menus/admin-notifications-settings.spec.ts |
| 아바타 업로드 | 프로필 이미지 변경 | ✅ | 🔗 POST /ai/attachments (presigned) | 🧪 menus/admin-notifications-settings.spec.ts |
| 부서 표시/수정 | 소속 부서 변경 | ✅ | 🔗 PATCH /identity/profile | 🧪 menus/admin-notifications-settings.spec.ts |
| bio 입력 | 자기소개 텍스트 | ✅ | 🔗 PATCH /identity/profile (bio 필드) | 🧪 menus/admin-notifications-settings.spec.ts |
| 상태 메시지 | 현재 상태 텍스트 입력 | ✅ | 🔗 PATCH /identity/profile (status 필드) | 🧪 menus/admin-notifications-settings.spec.ts |

### 2. 외관 (AppearanceSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 다크/라이트 모드 | 테마 토글 | ✅ | 🔌 (zustand persist) | 🧪 ui-store.test.ts |
| 레이아웃 밀도 | compact/comfortable 밀도 선택 | ✅ | 🔌 (zustand persist) | 🧪 menus/admin-notifications-settings.spec.ts |
| 색상 테마 | 액센트 컬러 선택 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |
| DND(방해금지) 설정 | 알림 방해금지 시간 설정 | ✅ | 🔌 (zustand persist) | 🧪 menus/admin-notifications-settings.spec.ts |

### 3. 언어 (LanguageSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 언어 선택 | 한국어/English 선택 | ✅ | 🔌 (zustand persist + i18n shim) | 🧪 i18n.test.ts |
| 날짜 형식 | 날짜 표시 형식 선택 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |

### 4. 알림 설정 (NotifSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 알림 유형별 설정 | 태스크/이슈/결재/댓글별 알림 토글 | ✅ | 🔗 PATCH /identity/notification-settings | 🧪 menus/admin-notifications-settings.spec.ts |
| 이메일 알림 | 이메일 알림 수신 여부 | ✅ | 🔗 | 🧪 menus/admin-notifications-settings.spec.ts |
| 알림 패널 표시 | 알림 설정 패널 토글 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |

### 5. 보안 (SecuritySection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 비밀번호 변경 | 현재→새 비밀번호 변경 | ⚠️ | 🔗 (OIDC ADR 보류) | ⬜ |
| 2FA (TOTP) 설정 | QR 코드 스캔 + 인증 코드 확인 | ✅ | 🔗 POST /auth/mfa/setup | 🧪 menus/admin-notifications-settings.spec.ts |
| 2FA 비활성화 | 2FA 비활성화 확인 | ✅ | 🔗 DELETE /auth/mfa | 🧪 menus/admin-notifications-settings.spec.ts |
| 복구 코드 표시 | 백업 복구 코드 8개 표시 | ✅ | 🔗 (mfa setup 응답) | 🧪 menus/admin-notifications-settings.spec.ts |
| API 토큰 생성 | 개인 API 토큰 생성 | ✅ | 🔗 POST /identity/api-tokens | 🧪 menus/admin-notifications-settings.spec.ts |
| API 토큰 목록 | 발급된 토큰 목록 | ✅ | 🔗 GET /identity/api-tokens | 🧪 menus/admin-notifications-settings.spec.ts |
| API 토큰 삭제 | 토큰 폐기 | ✅ | 🔗 DELETE /identity/api-tokens/:id | 🧪 menus/admin-notifications-settings.spec.ts |
| 세션 목록 | 활성 세션 목록 표시 | ✅ | 🔗 GET /auth/sessions | 🧪 menus/admin-notifications-settings.spec.ts |
| 세션 종료 | 특정 세션 강제 종료 | ✅ | 🔗 DELETE /auth/sessions/:jti | 🧪 menus/admin-notifications-settings.spec.ts |

### 6. 통합 (IntegrationsSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| Notion 연결 상태 | Notion 연동 ON/OFF | ✅ | 🔗 GET /integrations/notion/status | 🧪 menus/admin-notifications-settings.spec.ts |
| 캘린더 연동 | Google Calendar 연동 (준비중) | ⚠️ | — | ⬜ |

### 7. 단축키 (ShortcutsSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 단축키 목록 표시 | 전체 키보드 단축키 목록 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |
| 단축키 커스터마이징 | 사용자 정의 단축키 | ✅ | 🔌 | 🧪 menus/admin-notifications-settings.spec.ts |

### 8. 계정 삭제 (DangerSection)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 계정 삭제 | sonner toast 확인 → DELETE 계정 | ✅ | 🔗 DELETE /identity/account | 🧪 menus/admin-notifications-settings.spec.ts |
| 워크스페이스 데이터 삭제 | 워크스페이스 전체 삭제 (관리자) | ✅ | 🔗 DELETE /org/workspace | 🧪 menus/admin-notifications-settings.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 보안 섹션 E2E | 2FA·세션·토큰 E2E 없음 | 높음 |
| 비밀번호 변경 완성 | OIDC 기반 구현 필요 (ADR 보류) | 중 |
| Google Calendar 연동 | 캘린더 통합 구현 | 중 |
| 색상 테마 완성 | 액센트 컬러 설정 미완성 | 낮음 |
| 단축키 커스터마이징 완성 | 사용자 정의 키 저장 | 낮음 |
