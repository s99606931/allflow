# AllFlow 프론트엔드 메뉴 기능 명세 — 전체 인덱스

> 생성일: 2026-05-03 | 기준 브랜치: main

## 목적

각 메뉴·화면별로 구현되어야 하는 기능 목록과 설명, 백엔드 연동 여부, 테스트 여부를 기록한다.
미구현 항목의 우선순위 판단 및 QA 기준으로 활용한다.

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | 구현 완료 |
| ⚠️ | 부분 구현 / 제한 있음 |
| ❌ | 미구현 |
| 🔗 | 백엔드 연동 완료 |
| 🔌 | 백엔드 연동 없음 (프론트 자체 처리) |
| 🧪 | 테스트 있음 |
| ⬜ | 테스트 없음 |

## 파일 목록

### 공통 쉘

| 파일 | 설명 |
|------|------|
| [01-left-sidebar.md](./01-left-sidebar.md) | 좌측 사이드바 내비게이션 |
| [02-top-bar.md](./02-top-bar.md) | 상단 탑바 |
| [03-ai-assistant.md](./03-ai-assistant.md) | AI 어시스턴트 패널 (우측) |
| [04-command-palette.md](./04-command-palette.md) | 커맨드 팔레트 (⌘K) |

### 워크스페이스 화면

| 파일 | 경로 | 설명 |
|------|------|------|
| [screens/dashboard.md](./screens/dashboard.md) | `/` | 대시보드 |
| [screens/projects.md](./screens/projects.md) | `/projects` | 프로젝트 목록 |
| [screens/tasks.md](./screens/tasks.md) | `/tasks` | 내 태스크 |
| [screens/gantt.md](./screens/gantt.md) | `/gantt` | 간트차트 |
| [screens/issues.md](./screens/issues.md) | `/issues` | 이슈 관리 |
| [screens/approvals.md](./screens/approvals.md) | `/approvals` | 결재함 |
| [screens/calendar.md](./screens/calendar.md) | `/calendar` | 캘린더 |
| [screens/docs.md](./screens/docs.md) | `/docs` | 문서/위키 |
| [screens/chat.md](./screens/chat.md) | `/chat` | 팀 채팅 |

### 영업/고객사 화면

| 파일 | 경로 | 설명 |
|------|------|------|
| [screens/clients.md](./screens/clients.md) | `/clients` | 고객사 CRM |
| [screens/progress.md](./screens/progress.md) | `/progress` | 진행률 관리 |

### AI 화면

| 파일 | 경로 | 설명 |
|------|------|------|
| [screens/ai-auto.md](./screens/ai-auto.md) | `/ai-auto` | AI 자동 등록 |
| [screens/notion.md](./screens/notion.md) | `/notion` | Notion 연동 |

### 보고 화면

| 파일 | 경로 | 설명 |
|------|------|------|
| [screens/report-weekly.md](./screens/report-weekly.md) | `/reports/weekly` | 주간 보고 |
| [screens/report-monthly.md](./screens/report-monthly.md) | `/reports/monthly` | 월간 보고 |

### 관리 화면

| 파일 | 경로 | 설명 |
|------|------|------|
| [screens/org.md](./screens/org.md) | `/org` | 조직도 |
| [screens/users.md](./screens/users.md) | `/users` | 사용자 관리 |
| [screens/hr.md](./screens/hr.md) | `/hr` | 인사/HR |
| [screens/resources.md](./screens/resources.md) | `/resources` | 회의실·리소스 |
| [screens/admin.md](./screens/admin.md) | `/admin` | 관리자 콘솔 |
| [screens/notifications.md](./screens/notifications.md) | `/notifications` | 알림 센터 |
| [screens/settings.md](./screens/settings.md) | `/settings` | 개인 설정 |

## 요약 현황

| 항목 | 수량 |
|------|------|
| 전체 화면 수 | 22 |
| 백엔드 라우트 모듈 | 30 |
| FE 유닛 테스트 파일 | 20 |
| E2E 스펙 파일 | 17 (menus/ 폴더) |
| BE 테스트 수 | 650/650 PASS |
| FE 테스트 수 | 167/167 PASS |
