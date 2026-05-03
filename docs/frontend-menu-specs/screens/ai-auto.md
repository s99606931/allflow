# AI 자동 등록 (AI Auto)

> 경로: `/ai-auto` | 파일: `src/components/screens/ai-auto.tsx`  
> E2E: `tests/e2e/menus/ai-auto.spec.ts`

## 개요

AI를 활용한 데이터 자동 등록 화면. 음성·텍스트 입력으로 태스크·이슈·이벤트를 자동 생성한다.

## 기능 목록

### 1. 자동 등록 입력

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 텍스트 입력 | 자연어로 등록할 내용 입력 | ✅ | 🔗 POST /ai/chat | 🧪 ai-auto.spec.ts |
| 음성 입력 | 마이크 → Web Speech API → 텍스트 변환 | ✅ | 🔌 (브라우저 API) | 🧪 use-voice-input.test.tsx |
| 음성 기간 토글 | 음성 인식 언어/기간 설정 | ✅ | 🔌 | 🧪 menus/ai-auto.spec.ts |
| 파일 첨부 | 이미지·파일 첨부로 AI 분석 | ✅ | 🔗 POST /ai/attachments | 🧪 use-file-attach.test.tsx |

### 2. AI 자동 파싱 결과

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 항목 타입 분류 | 태스크/이슈/이벤트 자동 분류 | ✅ | 🔗 (AI tool 호출) | 🧪 tool-dispatcher.test.ts |
| 파싱 결과 미리보기 | AI가 추출한 정보 카드 표시 | ✅ | 🔗 | 🧪 extract-actions.test.ts |
| 필드 수정 | 파싱 결과 수동 편집 | ✅ | 🔌 | 🧪 menus/ai-auto.spec.ts |
| 등록 확인 | "등록" 버튼 → 실제 API 호출 | ✅ | 🔗 POST /tasks or /issues or /events | 🧪 menus/ai-auto.spec.ts |

### 3. AI 스트리밍

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| SSE 스트리밍 응답 | 처리 진행 상태 실시간 표시 | ✅ | 🔗 SSE /ai/chat | 🧪 use-ai.test.tsx |
| 처리 중 표시 | 로딩 스피너·진행 텍스트 | ✅ | 🔌 | 🧪 menus/ai-auto.spec.ts |

### 4. 등록 히스토리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 최근 등록 목록 | 자동 등록된 항목 이력 | ✅ | 🔗 GET /ai/threads | 🧪 menus/ai-auto.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 음성 등록 힌트 | 음성 입력 사용 예시 힌트 | ✅ | 🔌 | 🧪 menus/ai-auto.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 음성 기간 토글 E2E 테스트 | 설정 변경 검증 없음 | 중 |
| 배치 등록 | 여러 항목 한 번에 등록 | 낮음 |
| 등록 템플릿 | 자주 쓰는 등록 패턴 저장 | 낮음 |

## 테스트 실행 결과 (2026-05-03)
- BE vitest: 657/657 PASS
- FE vitest: 175/175 PASS
