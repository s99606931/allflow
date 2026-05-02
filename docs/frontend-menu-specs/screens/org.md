# 조직도 (Organization Chart)

> 경로: `/org` | 파일: `src/components/screens/org.tsx`  
> E2E: `tests/e2e/menus/org-users-hr.spec.ts`

## 개요

회사 조직 구조 시각화·관리. 부서·직위 계층, 초대·멤버 관리를 지원한다.

## 기능 목록

### 1. 조직도 뷰

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 부서 계층 표시 | 트리 구조로 부서 조직도 시각화 | ✅ | 🔗 GET /org/units | 🧪 use-data.test.tsx |
| 멤버 아바타 표시 | 각 부서 소속 멤버 아바타 | ✅ | 🔗 GET /users | 🧪 |
| 부서 확장/축소 | 하위 부서 펼침/접힘 | ✅ | 🔌 | 🧪 menus/org-users-hr.spec.ts |

### 2. 부서(OrgUnit) 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 부서 목록 조회 | 전체 부서 트리 조회 | ✅ | 🔗 GET /org/units | 🧪 |
| 부서 추가 | 새 부서 추가 다이얼로그 | ✅ | 🔗 POST /org/units | 🧪 |
| 부서 편집 | 부서명·상위부서 수정 | ⚠️ | 🔗 PATCH /org/units/:id | ⬜ |
| 부서 삭제 | sonner toast 확인 → DELETE | ⚠️ | 🔗 DELETE /org/units/:id | ⬜ |

### 3. 초대 관리

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 멤버 초대 발송 | 이메일로 초대장 전송 | ✅ | 🔗 POST /org/invitations | 🧪 menus-crud.spec.ts |
| 초대 목록 조회 | 발송된 초대 상태 목록 | ✅ | 🔗 GET /org/invitations | 🧪 |
| 초대 재발송 | 만료된 초대 재전송 | ✅ | 🔗 POST /org/invitations (idempotent) | 🧪 |
| 초대 취소 | 대기 중 초대 취소 | ✅ | 🔗 DELETE /org/invitations/:id | 🧪 menus/org-users-hr.spec.ts |

### 4. 더보기 메뉴

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 멤버 이동 | 다른 부서로 멤버 이동 | ✅ | 🔗 PATCH /org/units/:id (members) | 🧪 menus/org-users-hr.spec.ts |

### 5. AI 가이드 위젯

| 기능 | 설명 | 구현 | 백엔드 | 테스트 |
|------|------|------|--------|--------|
| 조직도 활용 힌트 | 부서 현황 기반 힌트 | ✅ | 🔌 | 🧪 menus/org-users-hr.spec.ts |

## 미구현 / 개선 필요 항목

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 부서 편집·삭제 UI 완성 | 편집/삭제 버튼·폼 | 중 |
| 드래그&드롭 조직 개편 | 부서/멤버 드래그로 구조 변경 | 낮음 |
| 조직도 이미지 내보내기 | PNG/SVG 다운로드 | 낮음 |
| 직책·직위 관리 | 직위 계층 별도 관리 | 낮음 |
