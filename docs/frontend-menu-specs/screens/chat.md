# 팀 채팅 (Chat)

> 경로: `/chat` | 파일: `src/components/screens/chat.tsx`  
> E2E: `tests/e2e/menus/chat.spec.ts`

## 개요

팀 내 채널 기반 실시간 메시징. 채널 목록, DM, 메시지 CRUD, 고정 메시지, AI 요약을 지원한다.

## 기능 목록

### 1. 채널 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 채널 목록 조회 | 워크스페이스 채널 목록 | ✅ | 🔗 GET /channels | 🧪 use-chat-messages.test.tsx |
| 채널 검색 | 채널 이름 텍스트 검색 | ✅ | 🔌 (클라이언트 필터) | 🧪 menus/chat.spec.ts |
| 채널 선택 | 채널 클릭 → 메시지 뷰 전환 | ✅ | 🔌 | 🧪 menus/chat.spec.ts |
| 새 채널 생성 | 채널 생성 다이얼로그 | ✅ | 🔗 POST /channels | 🧪 menus/chat.spec.ts |

### 2. 메시지 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 메시지 목록 조회 | 채널 메시지 스크롤 목록 | ✅ | 🔗 GET /channels/:id/messages | 🧪 channels.routes.test.ts |
| 메시지 전송 | Enter 전송, Shift+Enter 줄바꿈 | ✅ | 🔗 POST /channels/:id/messages | 🧪 menus-crud.spec.ts |
| 메시지 편집 | 내 메시지 편집 버튼 → PATCH | ✅ | 🔗 PATCH /channels/:id/messages/:msgId | 🧪 menus/chat.spec.ts |
| 메시지 삭제 | 내 메시지 삭제 버튼 → DELETE | ✅ | 🔗 DELETE /channels/:id/messages/:msgId | 🧪 menus/chat.spec.ts |

### 3. 고정 메시지 (PinnedMessage)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 고정 메시지 표시 | 채널 상단 핀 메시지 배너 | ✅ | 🔗 GET /channels/:id/pinned | 🧪 menus/chat.spec.ts |
| 메시지 고정 | 메시지 옵션에서 고정 | ✅ | 🔗 POST /channels/:id/pin | 🧪 menus/chat.spec.ts |
| 메시지 고정 해제 | 핀 해제 | ✅ | 🔗 DELETE /channels/:id/pin/:msgId | 🧪 menus/chat.spec.ts |

### 4. 파일·미디어

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 파일 첨부 | 이미지·파일 업로드 | ✅ | 🔗 POST /ai/attachments | 🧪 use-file-attach.test.tsx |
| 이미지 미리보기 | 채팅에서 이미지 인라인 표시 | ✅ | 🔌 | 🧪 menus/chat.spec.ts |

### 5. AI 기능

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| AI 채팅 요약 | 채널 대화 내용 AI 요약 | ✅ | 🔗 POST /ai/chat (채팅 컨텍스트) | 🧪 menus/chat.spec.ts |
| AI 가이드 위젯 | 채팅 활용 힌트 | ✅ | 🔌 | 🧪 menus/chat.spec.ts |

### 6. 실시간

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 실시간 메시지 수신 | WebSocket 이벤트로 새 메시지 표시 | ✅ | 🔗 WebSocket /realtime | 🧪 use-realtime.test.tsx |
| 읽음 표시 | 메시지 읽음 상태 | ✅ | 🔗 PATCH /channels/:id/messages/:id (read) | 🧪 menus/chat.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 새 채널 생성 UI 완성 | 채널 생성 폼 다이얼로그 | 중 |
| DM (다이렉트 메시지) | 1:1 채팅 채널 | 중 |
| 메시지 반응(이모지) | 이모지 리액션 기능 | 낮음 |
| 스레드 답글 | 메시지 스레드 답글 | 낮음 |
| 멘션 알림 (@mention) | 멘션 시 알림 발송 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
