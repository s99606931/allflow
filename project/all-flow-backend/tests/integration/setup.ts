/**
 * 통합 테스트 setup — Docker 가용성 사전 점검.
 *
 * Docker 데몬이 없으면 INTEGRATION_DISABLED=1 을 설정하여 테스트가
 * `describe.skipIf` 로 우회되도록 한다 (CI/로컬 어디서나 안전 실행).
 */
import { execSync } from 'node:child_process';

function dockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

if (!dockerAvailable()) {
  process.env.INTEGRATION_DISABLED = '1';
  // 한 번만 출력 (vitest setup 은 worker 별 실행).
  console.warn('[integration] docker 데몬 미가용 → 통합 테스트 skip (INTEGRATION_DISABLED=1)');
}
