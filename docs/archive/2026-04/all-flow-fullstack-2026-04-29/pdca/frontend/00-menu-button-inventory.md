# PDCA-00 — 전체 메뉴 / 버튼 / 기능 인벤토리

> Phase: 0 (Plan) | Owner: PL (av-do-orchestrator) | Status: in-review | Created: 2026-04-29
> 대상 프로젝트: `/data/allflow/project/all-flow-frontend`
> 산출 목적: 모든 메뉴 · 모든 버튼 · 모든 기능을 빠짐없이 정리하여 후속 PDCA(01~10)의 단일 진실 공급원(SSoT)으로 사용한다.
> 누락 기준: 사이드바 NAV(`src/lib/fixtures.ts` `NAV` 상수)에 등록된 메뉴 25개 + 모든 화면 컴포넌트의 가시 버튼.

## Plan — 인벤토리 작성 원칙

- 목표: 사이드바 5개 섹션, 25개 라우트, 25개 화면 컴포넌트의 모든 사용자 액션(button / link / 단축키 / 폼 제출)을 표로 정리한다.
- 범위: `/data/allflow/project/all-flow-frontend/src/components/screens/*.tsx` + `src/components/shell/*.tsx` 만 대상. node_modules·storybook 제외.
- 결정: 액션 단위는 (A) 시각적으로 클릭 가능한 컨트롤 (B) 키보드 단축키 (C) 폼 입력 → 제출. 단순 hover/decoration은 제외.
- 분류: 상태값 4종 → `wired`(실제 동작) · `local`(로컬 state만 갱신) · `decoration`(빈 onClick 또는 미구현) · `missing`(있어야 하는데 없음).
- 출력 컬럼: `메뉴 / 컨트롤 / 위치 / 의도 / 현재 상태 / 후속 PDCA 번호`.

## 0. 글로벌 셸 (모든 페이지 공통)

### 0.1 사이드바 (`src/components/shell/sidebar.tsx`)

| # | 컨트롤 | 위치 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|------|
| G1 | 워크스페이스 스위처 (오믈렛 워크스페이스) | 헤더 | 다중 워크스페이스 전환 | decoration | 09 |
| G2 | 사이드바 접기 (ChevronsLeft) | 헤더 | UI store toggleSidebar | wired | — |
| G3 | 검색 바 (⌘K) | 상단 | CommandPalette 오픈 | wired (CustomEvent allflow:cmdk) | 09 |
| G4 | 새로 만들기 | 상단 | 글로벌 신규(태스크/이슈/문서/프로젝트) 디스패처 | decoration | 02 |
| G5 | 메뉴 25개 (Link 라우팅) | nav | 페이지 이동 | wired | — |

### 0.2 상단바 (`src/components/shell/topbar.tsx`)

| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| G6 | 실시간 연결 상태 칩 | SSE 연결 표시 | wired (useRealtime) | — |
| G7 | AI 어시스턴트 토글 (Sparkles) | AIPanel 열기 | wired | 06 |
| G8 | 알림 (Bell) | 알림 센터 패널 | decoration (붉은 점만) | 08 |
| G9 | 도움말 (HelpCircle) | 도움말 팝오버 | decoration | 09 |
| G10 | 테마 토글 (Sun/Moon) | dark/light 전환 | wired | — |
| G11 | 사용자 아바타 | 프로필/로그아웃 메뉴 | decoration | 09 |

### 0.3 커맨드 팔레트 / AI 패널 / Tweaks

| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| G12 | CommandPalette (⌘K) | 전역 명령/검색 | wired (open) — 항목 라우팅 미구현 | 09 |
| G13 | AIPanel | AI 어시스턴트 대화 | wired (open) — 메시지 처리 미구현 | 06 |
| G14 | Tweaks (좌하단) | 테마/액센트 변경 | wired | — |

## 1. 워크스페이스 섹션 (8개 메뉴)

### 1.1 대시보드 `/` — `dashboard.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.1.1 | 태스크 추가 (Topbar action) | 태스크 생성 모달 | decoration | 02 |
| 1.1.2 | AI에게 요청 (Topbar action) | AIPanel 오픈 | decoration | 06 |
| 1.1.3 | 프로젝트 카드 CTA "{cta} →" | 프로젝트 상세 이동 | decoration | 03 |
| 1.1.4 | 위젯: 오늘의 KPI · 진행중 프로젝트 · 최근 활동 | 실시간 데이터 | mock 픽스처 | 01 |

### 1.2 프로젝트 `/projects` — `projects.tsx` / `projects-route.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.2.1 | 새 프로젝트 (primary) | 프로젝트 생성 다이얼로그 | decoration | 03 |
| 1.2.2 | 프로젝트 카드 클릭 | `/projects/[id]` 상세 | decoration (라우트 미존재) | 03 |
| 1.2.3 | 샘플 태스크 열기 (route 페이지) | TaskDetailDialog | wired | — |
| 1.2.4 | 미구현: 프로젝트 필터/정렬/뷰 전환(보드/리스트/간트) | — | missing | 03 |
| 1.2.5 | 미구현: 멤버 추가/제거, 즐겨찾기, 아카이브 | — | missing | 03 |

### 1.3 내 태스크 `/tasks` — `tasks.tsx` / `task-detail.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.3.1 | 필터 칩 (전체/내 태스크/오늘/지연) | 클라이언트 필터 | wired (local) | 02 |
| 1.3.2 | 필터 (Filter 버튼) | 고급 필터 패널 | decoration | 02 |
| 1.3.3 | 검색 입력 | 제목 부분일치 | wired (local) | — |
| 1.3.4 | 새 태스크 (primary) | 태스크 생성 다이얼로그 | decoration | 02 |
| 1.3.5 | 뷰 탭 (리스트/보드/캘린더) | Radix Tabs | wired | — |
| 1.3.6 | 태스크 행 / 카드 클릭 | TaskDetailDialog | wired | — |
| 1.3.7 | 캘린더 셀 클릭 | TaskDetailDialog | wired | — |
| 1.3.8 | TaskDetail: 링크 복사 / 외부 열기 / 닫기 | 다이얼로그 액션 | wired (close) / decoration | 02 |
| 1.3.9 | TaskDetail: 첨부 / 멘션 | 댓글 입력 보조 | decoration | 02 |
| 1.3.10 | TaskDetail: 댓글 등록 | POST 댓글 | decoration | 02 |
| 1.3.11 | 미구현: 태스크 상태 인라인 변경, 우선순위 변경, 담당자 변경, 마감 변경 | — | missing | 02 |
| 1.3.12 | 미구현: 보드 드래그앤드롭, 일괄 선택, CSV 내보내기 | — | missing | 02 |

### 1.4 이슈 관리 `/issues` — `issues.tsx` / `issues-full.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.4.1 | 백업 라우트 활성화 | 폴백 라우트 토글 | decoration | 02 |
| 1.4.2 | 필터 칩 (P0/P1/P2/P3, 심각도) | 우선순위 필터 | local | 02 |
| 1.4.3 | 필터 버튼 | 고급 필터 | decoration | 02 |
| 1.4.4 | AI 자동 분류 | AI로 sev/prio 추정 | decoration | 06 |
| 1.4.5 | 새 이슈 | 이슈 생성 다이얼로그 | decoration | 02 |
| 1.4.6 | 이슈 행 클릭 → 상세 | 상세 패널 | decoration | 02 |
| 1.4.7 | 근거 보기 / 무시 (AI 추천 행) | AI 추천 액션 | decoration | 06 |
| 1.4.8 | 미구현: 상태 변경(open→in-progress→resolved), 담당자 변경, SLA 알림 | — | missing | 02 |
| 1.4.9 | 미구현: 링크된 태스크/PR 추가, 댓글, 첨부 | — | missing | 02 |

### 1.5 결재함 `/approvals` — `approvals.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.5.1 | 탭 (받은/보낸/완료/임시저장) | 분류 전환 | wired (local) | — |
| 1.5.2 | 새 결재 (primary) | 결재 양식 작성 | decoration | 04 |
| 1.5.3 | 결재 행 클릭 → 상세 패널 | 본문/결재선/이력 | wired (local select) | — |
| 1.5.4 | 승인 / 반려 / 보류 | 결재 액션 | decoration | 04 |
| 1.5.5 | 미구현: 결재선 편집, 첨부, AI 양식 추천, 위임/회수 | — | missing | 04 |

### 1.6 캘린더 `/calendar` — `calendar.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.6.1 | 뷰 전환 (월/주/일) | 뷰 토글 | wired (local) | 05 |
| 1.6.2 | 오늘 | 현재로 이동 | decoration | 05 |
| 1.6.3 | 이전/다음 (←→) | 기간 이동 | decoration | 05 |
| 1.6.4 | 캘린더 동기화 (Google/Outlook) | OAuth 연결 | decoration | 05 |
| 1.6.5 | 자동 조정 (AI) | AI 일정 충돌 해소 | decoration | 06 |
| 1.6.6 | 일정 추가 (primary) | 이벤트 생성 | decoration | 05 |
| 1.6.7 | 미구현: 이벤트 클릭 상세, 드래그 리사이즈, 반복 일정, 참석자 응답 | — | missing | 05 |

### 1.7 문서 / 위키 `/docs` — `docs.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.7.1 | 새 문서 (primary) | 문서 작성기 오픈 | decoration | 04 |
| 1.7.2 | AI 요약 | 선택 문서 요약 | decoration | 06 |
| 1.7.3 | 문서 트리 / 검색 | 탐색 | decoration | 04 |
| 1.7.4 | 미구현: 에디터(WYSIWYG), 태그, 양방향 링크, 버전 이력, 권한 | — | missing | 04 |

### 1.8 팀 채팅 `/chat` — `chat.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 1.8.1 | 채널/DM 리스트 클릭 | 대화방 전환 | wired (local) | — |
| 1.8.2 | 메시지 입력 / 전송 | 메시지 전송 | decoration | 04 |
| 1.8.3 | 대화 요약 (AI) | 채널 요약 | decoration | 06 |
| 1.8.4 | 태스크로 등록 (메시지 컨텍스트) | 태스크 생성 | decoration | 02 |
| 1.8.5 | 무시 (AI 제안) | 제안 닫기 | decoration | 06 |
| 1.8.6 | 답글(스레드) 진입 | 스레드 패널 | decoration | 04 |
| 1.8.7 | 미구현: 파일 첨부, 멘션 자동완성, 이모지/리액션, 검색 | — | missing | 04 |

## 2. 영업 / 고객사 섹션 (2개 메뉴)

### 2.1 진행률 관리 `/progress` — `progress.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 2.1.1 | 포트폴리오 그리드 (프로젝트별 카드) | 시각화 | wired (read-only) | — |
| 2.1.2 | 미구현: 간트 뷰 토글, 헬스 임계값 설정, 드릴다운 | — | missing | 03 |
| 2.1.3 | 미구현: 카드 클릭 → 프로젝트 상세 | — | missing | 03 |

### 2.2 고객사 (CRM) `/clients` — `clients.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 2.2.1 | 새 고객사 (primary) | 고객사 생성 | decoration | 07 |
| 2.2.2 | 고객사 카드 클릭 | 상세 패널 | decoration | 07 |
| 2.2.3 | 단계 칩 (lead/active/churned) | 분류 필터 | decoration | 07 |
| 2.2.4 | 미구현: MRR/ARR 추적, 활동 타임라인, 노트, 거래 단계, 첨부 | — | missing | 07 |

## 3. AI 섹션 (2개 메뉴)

### 3.1 AI 자동 등록 `/ai-auto` — `ai-auto.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 3.1.1 | 입력 소스 5종 (회의록/이메일/Notion/녹음/파일) 탭 | 소스 전환 | wired (local) | — |
| 3.1.2 | 파일 업로드 | 파일 첨부 | decoration | 06 |
| 3.1.3 | 녹음 시작 | 마이크 캡처 | decoration | 06 |
| 3.1.4 | 연결하기 (Notion/이메일) | OAuth 연결 | decoration | 06 |
| 3.1.5 | 추출 실행 (runExtract) | LLM 추출 호출 | wired (mock) | 06 |
| 3.1.6 | 항목 선택/제거 | 후보 큐레이션 | wired (local) | — |
| 3.1.7 | 검토 후 등록 | 태스크/이슈로 일괄 생성 | decoration | 06 |
| 3.1.8 | 미구현: 신뢰도 임계값 설정, 재추출, 근거 라인 연결 | — | missing | 06 |

### 3.2 Notion 연동 `/notion` — `notion.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 3.2.1 | 전체 동기화 | 양방향 sync 트리거 | decoration | 06 |
| 3.2.2 | 설정 | 매핑 규칙 편집 | decoration | 06 |
| 3.2.3 | DB 추가 | Notion DB 새로 연결 | decoration | 06 |
| 3.2.4 | DB 카드 액션 (켜기/끄기/지금 동기화) | 개별 sync 제어 | decoration | 06 |
| 3.2.5 | 미구현: 충돌 해결 UI, 동기화 로그, 매핑 미리보기 | — | missing | 06 |

## 4. 보고 섹션 (2개 메뉴)

### 4.1 주간 보고 `/reports/weekly` — `report-weekly.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 4.1.1 | PDF 다운로드 | @react-pdf 렌더 | decoration ("준비 중") | 07 |
| 4.1.2 | AI 다시 생성 | LLM 재합성 | decoration | 06 |
| 4.1.3 | 발송 (이메일) | 메일 큐 적재 | decoration | 07 |
| 4.1.4 | 인용 칩 클릭 | 근거 데이터 패널 | decoration | 07 |
| 4.1.5 | 미구현: 기간 변경, 섹션 토글, 수신자 편집 | — | missing | 07 |

### 4.2 월간 보고 `/reports/monthly` — `report-monthly.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 4.2.1 | PDF 다운로드 | @react-pdf 렌더 | decoration | 07 |
| 4.2.2 | AI 다시 생성 | LLM 재합성 | decoration | 06 |
| 4.2.3 | 임원진 발송 | 메일 발송 | decoration | 07 |
| 4.2.4 | 미구현: KPI 편집, OKR 매핑, 리스크 매트릭스 편집 | — | missing | 07 |

## 5. 관리 섹션 (7개 메뉴)

### 5.1 조직도 `/org` — `org.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.1.1 | 트리 보기 / 리스트 보기 | 뷰 전환 | decoration | 09 |
| 5.1.2 | 부서 추가 | 부서 생성 | decoration | 09 |
| 5.1.3 | 미구현: 멤버 드래그 이동, 보고선 편집, 직책 변경 | — | missing | 09 |

### 5.2 사용자 관리 `/users` — `users.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.2.1 | 필터 | 역할/상태 필터 | decoration | 09 |
| 5.2.2 | CSV (내보내기) | CSV 다운로드 | decoration | 09 |
| 5.2.3 | 사용자 초대 (primary) | 초대 다이얼로그 | decoration | 09 |
| 5.2.4 | 사용자 행 액션 (역할 변경, MFA 강제, 비활성화) | RBAC 관리 | decoration | 09 |
| 5.2.5 | 미구현: 일괄 선택, SCIM 동기화 트리거, 감사 이력 | — | missing | 09 |

### 5.3 인사 / HR `/hr` — `hr.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.3.1 | 휴가 신청 (primary) | 휴가 결재 생성 | decoration | 04 |
| 5.3.2 | 퇴근 체크 | 출퇴근 기록 | decoration | 09 |
| 5.3.3 | 새 1:1 예약 | 1:1 일정 생성 | decoration | 05 |
| 5.3.4 | 참석 노트 | 노트 작성 | decoration | 04 |
| 5.3.5 | 미구현: 휴가 잔여 계산, 평가 사이클, OKR 연동, 채용 파이프라인 | — | missing | 09 |

### 5.4 회의실 · 리소스 `/resources` — `resources.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.4.1 | 오늘 (날짜 필터) | 오늘로 이동 | decoration | 05 |
| 5.4.2 | 예약 (primary) | 예약 다이얼로그 | decoration | 05 |
| 5.4.3 | 바로 예약 (시간 슬롯 클릭) | 즉시 예약 | decoration | 05 |
| 5.4.4 | 미구현: 자원 필터(회의실/장비/차량), 반복 예약, 충돌 경고 | — | missing | 05 |

### 5.5 관리자 콘솔 `/admin` — `admin.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.5.1 | 플랜 변경 | 빌링 플랜 변경 | decoration | 09 |
| 5.5.2 | 전체 세션 강제 종료 | 보안 액션 | decoration | 09 |
| 5.5.3 | API 토큰 일괄 회수 | 보안 액션 | decoration | 09 |
| 5.5.4 | 워크스페이스 잠금 | 비상 잠금 | decoration | 09 |
| 5.5.5 | 미구현: 감사 로그 검색·내보내기, SSO/SCIM 설정, AI 거버넌스 | — | missing | 09 |

### 5.6 알림 센터 `/notifications` — `notifications.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.6.1 | 필터 (카테고리) | 분류 필터 | decoration | 08 |
| 5.6.2 | 모두 읽음 | 일괄 읽음 처리 | decoration | 08 |
| 5.6.3 | 알림 항목 클릭 | 컨텍스트 라우팅 | decoration | 08 |
| 5.6.4 | 미구현: 알림 환경설정 진입, 무음 시간, 이메일/슬랙 라우팅 | — | missing | 08 |

### 5.7 개인 설정 `/settings` — `settings.tsx`
| # | 컨트롤 | 의도 | 현재 | 후속 |
|---|--------|------|------|------|
| 5.7.1 | 사진 변경 | 아바타 업로드 | decoration | 09 |
| 5.7.2 | 프로필 저장 / 취소 | 프로필 PATCH | decoration | 09 |
| 5.7.3 | 알림 설정 (이메일/슬랙/푸시) | 토글 저장 | decoration | 09 |
| 5.7.4 | 비밀번호 변경 | 보안 설정 | decoration | 09 |
| 5.7.5 | API 토큰 재발급 / 코드 보기 | 개인 토큰 관리 | decoration | 09 |
| 5.7.6 | 모든 다른 세션 종료 | 보안 액션 | decoration | 09 |
| 5.7.7 | 통합 연결 / 연결 관리 | OAuth 연결 | decoration | 09 |
| 5.7.8 | 계정 영구 삭제 | 위험 액션 | decoration | 09 |
| 5.7.9 | 미구현: 언어/시간대/접근성 설정, MFA 등록 | — | missing | 09 |

## Check — 완전성 검증

- 사이드바 NAV 25개 메뉴 ↔ 화면 컴포넌트 25개: **1:1 매칭 확인 완료** (`stub-screen.tsx` 정의 11개 + 실제 구현 14개).
- 가시 버튼 총합: **약 110개** (글로벌 14개 + 25개 메뉴 96개).
- 그 중 `wired`: 22개 (20%) — 주로 로컬 state 토글.
- `decoration`: 88개 (80%) — 시각만 존재.
- `missing` 카테고리: 메뉴별로 식별 (위 표 마지막 행).
- API 레이어(`src/lib/api.ts`)는 픽스처/HTTP 듀얼 모드. **버튼-API 연결이 끊긴 상태** — 후속 PDCA의 핵심 작업.
- 후속 PDCA 라우팅:
  - 01: 데이터/API 컨트랙트 정합 + 픽스처 → 실서버 토글
  - 02: 태스크/이슈 CRUD 와이어링
  - 03: 프로젝트 CRUD + 진행률
  - 04: 결재 / 문서 / 채팅 (협업 트랙)
  - 05: 캘린더 / 리소스 (스케줄 트랙)
  - 06: AI 통합 (자동 등록 / 요약 / 분류 / Notion sync)
  - 07: 보고 / CRM (PDF + 메일 발송)
  - 08: 알림 센터 / 실시간 (SSE 라우팅)
  - 09: 관리 (조직 / 사용자 / HR / 관리자 콘솔 / 설정)
  - 10: QA / E2E / 접근성 / i18n 최종 게이트

## Act — 후속 단계

- 본 인벤토리는 SSoT. 후속 PDCA 01~10이 본 표의 row id (예: 1.3.4)를 인용한다.
- 신규 버튼/메뉴 추가 시 본 문서를 먼저 갱신한다 (av-docs-guard 자동 검증 대상).
- bkit:gap-detector 측정 시 본 문서를 spec 입력으로 사용 → match_rate 기준선 확보.
- 메모리 보존: `av-base-memory-keeper` 가 인벤토리 요약을 L4 글로벌에 저장.
