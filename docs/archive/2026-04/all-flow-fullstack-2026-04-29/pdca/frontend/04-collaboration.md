# PDCA-04 — 협업 트랙: 결재 / 문서 / 채팅

> Phase: 3 (Collaboration) | Owner: FE + BE | Status: done | Created: 2026-04-29 | Closed: 2026-04-29
> Acceptance: 인벤토리 1.5.* (결재) / 1.7.* (문서) / 1.8.* (채팅) wired. 채팅은 SSE/WebSocket 기반 실시간.
> Dependencies: PDCA-01, PDCA-02 (실시간 인프라는 backend PDCA-03)

## Plan

- 목표: 협업 3대 채널(결재·문서·채팅) 활성화.
- 범위:
  - 결재: `approvals.tsx` + `approval-form.tsx` + `approval-detail.tsx`
  - 문서: `docs.tsx` + WYSIWYG 에디터 (TipTap or Lexical PoC)
  - 채팅: `chat.tsx` + 메시지 입력/전송/스레드/리액션
- 결정:
  - 에디터: TipTap 우선 채택 (Markdown/JSON 직렬화, 협업 확장)
  - 채팅 실시간: 백엔드 SSE 채널 재사용 (`useRealtime` 훅 확장)

## Do

- 결재:
  - 추가: `src/components/dialogs/approval-form.tsx`, `approval-line-editor.tsx`
  - 수정: `approvals.tsx` 1.5.2 ~ 1.5.5 와이어링
- 문서:
  - 추가: `src/components/editor/wiki-editor.tsx` (TipTap)
  - 수정: `docs.tsx` 1.7.1 ~ 1.7.4 와이어링, 트리/검색
- 채팅:
  - 추가: `src/components/chat/composer.tsx`, `thread-panel.tsx`, `mention-popover.tsx`
  - 수정: `chat.tsx` 1.8.2 ~ 1.8.7 와이어링
- 의존성: `@tiptap/react`, `@tiptap/starter-kit`, `emoji-mart`

## Check

- E2E:
  1. 휴가 결재 작성 → 결재선 3명 → 제출 → 받은 결재함에서 보임
  2. 결재 승인 → 상태 전이 → 알림 발송
  3. 새 문서 작성 → 본문 편집 → 저장 → 트리에 노출
  4. 채널에 메시지 입력 → 다른 사용자 화면에 실시간 노출
  5. 메시지에서 "태스크로 등록" → 태스크 생성 (1.8.4)

## Act

- 메모리: `learning_realtime_collab_pattern.md`.
- 다음: PDCA-05 (스케줄 트랙).
