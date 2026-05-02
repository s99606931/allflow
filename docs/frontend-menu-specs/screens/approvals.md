# 결재함 (Approvals)

> 경로: `/approvals` | 파일: `src/components/screens/approvals.tsx`  
> E2E: `tests/e2e/menus/approvals-resources.spec.ts`

## 개요

전자 결재 워크플로우 관리. 결재 요청·승인·반려·결재라인 설정을 지원한다.

## 기능 목록

### 1. 결재 목록

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 결재 목록 조회 | 받은·보낸 결재 목록 | ✅ | 🔗 GET /approvals | 🧪 use-data.test.tsx |
| 상태 필터 탭 | pending / approved / rejected / all | ✅ | 🔌 (클라이언트) | 🧪 |
| 결재 상태 뱃지 | pending(대기)/approved(승인)/rejected(반려) | ✅ | 🔗 | 🧪 |
| 결재 제목·요청자·날짜 표시 | 목록 기본 정보 | ✅ | 🔗 | 🧪 |

### 2. 결재 CRUD

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 결재 요청 생성 | ApprovalFormDialog → POST | ✅ | 🔗 POST /approvals | 🧪 menus-crud.spec.ts |
| 결재 승인 | "승인" 버튼 → approved 전환 | ✅ | 🔗 PATCH /approvals/:id (decision) | 🧪 |
| 결재 반려 | "반려" 버튼 + 반려 사유 입력 | ✅ | 🔗 PATCH /approvals/:id | 🧪 |
| 결재 취소 | 본인 요청 취소 (pending 상태만) | ✅ | 🔗 DELETE /approvals/:id | 🧪 menus/approvals-resources.spec.ts |

### 3. 결재 폼 다이얼로그 (ApprovalFormDialog)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 결재 제목 입력 | 필수 텍스트 | ✅ | 🔗 | 🧪 |
| 결재 내용 입력 | 텍스트에어리어 | ✅ | 🔗 | 🧪 |
| 결재라인 설정 | ApprovalLineEditor로 순서·결재자 지정 | ✅ | 🔗 | 🧪 |
| 첨부 파일 | 파일 첨부 지원 | ⚠️ | 🔗 POST /ai/attachments | ⬜ |

### 4. 결재라인 편집 (ApprovalLineEditor)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 결재자 추가 | 사용자 검색·선택으로 결재라인 추가 | ✅ | 🔗 GET /users | 🧪 |
| 결재 순서 조정 | 드래그 또는 ↑↓ 버튼으로 순서 변경 | ✅ | 🔌 (로컬) | 🧪 menus/approvals-resources.spec.ts |
| 결재자 삭제 | 결재라인에서 제거 | ✅ | 🔌 | 🧪 menus/approvals-resources.spec.ts |

### 5. 더보기 메뉴 (MoreHorizontal)

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 결재 상세 보기 | 전체 결재 내용 모달 표시 | ✅ | 🔗 | 🧪 menus/approvals-resources.spec.ts |
| 결재 취소 드롭다운 | 드롭다운에서 취소 선택 | ✅ | 🔗 | 🧪 menus/approvals-resources.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 결재 알림 | 결재 요청 시 담당자 실시간 알림 | 중 |
| 결재 파일 첨부 완성 | 파일 업로드 UI 연결 | 중 |
| 결재 히스토리 | 승인/반려 이력 타임라인 | 낮음 |
| 모바일 결재 | 모바일 최적화 결재 UX | 낮음 |
