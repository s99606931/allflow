# PDCA Master Tracking — tech-stack-modernization-2026-04-29

> **Phase**: Do (Module 1+2+4+5 완료 / Module 3 pending)
> **기준**: 2026-04-29
> **목표**: manifest 거버넌스 + 스택 인벤토리 + CLAUDE.md 금지형 정리

---

## 진행 현황

| Module | 설명 | 태스크 | 상태 | 메모 |
|--------|------|--------|------|------|
| **M1** | stack-matrix 작성 | T-101~T-104 | ✅ done | `docs/02-design/stack-matrix-2026-04-29.md` 69행 |
| **M2** | av-base-stack-approval 훅 | T-201~T-206 | ✅ done | exit 2 차단 검증 완료 (4건 유닛) |
| **M3** | manifest 채택 적용 (도그푸딩) | T-301~T-304 | 🔄 pending | M2 훅 통해 사용자 승인 필요 |
| **M4** | 메모리 5파일 Stack Recommendations | T-401~T-405 | ✅ done | skills 2 + agent-memory 3 완료 |
| **M5** | CLAUDE.md 권장 표현 제거 | T-501~T-505 | ✅ done | 이미 0건 (변경 불필요) |
| **M6** | 분기별 갱신 cron | T-601~T-602 | ⬜ optional | 다음 iteration |

**진행률**: 5/6 (83%) — 핵심 4모듈 완료, M3 pending

---

## Acceptance Criteria 현황

| ID | 기준 | 상태 | 증거 |
|----|------|------|------|
| **S1** | stack-matrix ≥ 69행 | ✅ | 86 data rows (121줄) |
| **S2** | 현재/최신/채택/비고 4컬럼 | ✅ | 모든 행 완비 |
| **S3** | 훅 작동 (exit 2 차단) | ✅ | unit test 4건 PASS: exit 2 / 0 / 0 / 0 |
| **S4** | CLAUDE.md grep 0건 | ✅ | `grep -iE "권장|recommend|prefer|should consider"` → 0건 |
| **S5** | MEMORY.md 5파일 섹션 확인 | ✅ | `find .claude -name MEMORY.md | xargs grep -l "## Stack Recommendations"` → 5건 |
| **S6** | gap-detector ≥ 90% | ⏳ | `/pdca analyze` 대기 중 |
| **S7** | 거부 사유 학습 | ⏳ | M3 도그푸딩 시 검증 |

---

## Stack Matrix P0 채택 대상 (M3 pending)

> 훅 도그푸딩으로 진행 예정. 각 변경 시 `av-base-stack-approval.sh`가 사용자 승인 요청.

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|---------|
| `project/all-flow-backend/Dockerfile` | `ARG NODE_VERSION=20.18.1` → `22` (LTS) | P0 |
| `project/all-flow-frontend/package.json` | `next-auth: 5.0.0-beta.30` → `5.0.0` stable | P0 |
| `project/all-flow-backend/package.json` | `typescript: ^5.7.2` → `^5.8.x`, `vitest: ^2.1.8` → `^2.3.x` | P1 |
| `project/all-flow-frontend/package.json` | `typescript: ^5.7.3` → `^5.8.x` | P1 |

---

## Iter 로그

| Iter | 날짜 | 내용 |
|------|------|------|
| 1 | 2026-04-29 | PRD + Plan 작성 (be-fe-mapping-fix 종결 직후) |
| 2 | 2026-04-29 | M1+M2+M4+M5 병렬 에이전트 완료, S1~S5 PASS, commit 6052f13 |
| 3 | - | M3 manifest 채택 + gap-detector + report |

---

**Next**: `/pdca analyze tech-stack-modernization-2026-04-29` 또는 M3 도그푸딩 진행
