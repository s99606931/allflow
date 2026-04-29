# 보안 정책 / Security Policy

> Owner: av-oss-security-officer

## 지원 버전 / Supported Versions

| 버전 | 지원 |
| --- | --- |
| 최신 minor | ✅ 모든 패치 |
| 이전 minor | ⚠️ critical만 |
| 그 이전 | ❌ |

## 취약점 보고 / Reporting a Vulnerability

**공개 이슈로 보고하지 마세요. / Do NOT open a public issue.**

다음 중 하나로 보고해 주세요 / Please use one of:

- GitHub Security Advisory: <https://github.com/s99606931/allflow/security/advisories/new>
- Email: s99606931@gmail.com

## 응답 정책 / Response Policy

| 단계 | SLA |
|------|-----|
| 접수 확인 | 48시간 이내 |
| 초기 평가 | 7일 이내 |
| 패치 릴리즈 (critical) | 30일 이내 |
| 공개 announcement | 패치 후 90일 (책임 있는 공개) |

## 안전한 의존성 / Dependencies

- Dependabot 주간 업데이트 (`.github/dependabot.yml`)
- 라이선스 호환성 자동 검증 (`.claude/hooks/av-oss-license-check.sh`)
- 시크릿 스캔 자동 차단 (`.claude/hooks/av-oss-secret-scan.sh`)
- DCO 강제 (`.claude/hooks/av-oss-sign-off.sh`)
