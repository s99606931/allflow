/**
 * Reset seed — 모든 데이터를 비운다 (스키마는 유지).
 *
 * 목적: init/demo 시드 재적용 전 깨끗한 상태 보장.
 * 사용 시나리오: 데모 → 초기 상태 전환, QA 환경 재구축, 로컬 개발 데이터 정리.
 *
 * 실행: pnpm seed:reset  (apps/backend 에서)
 *       pnpm seed reset   (root 에서)
 *
 * 주의:
 *   - PRODUCTION 가드: NODE_ENV === 'production' 일 때 실행 거부.
 *   - TRUNCATE ... CASCADE 로 모든 모델 데이터 삭제. 마이그레이션은 유지.
 *   - 강제 실행: SEED_RESET_FORCE=1 환경변수.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TABLES = [
  // 의존성 역순 (자식 → 부모)
  'ai_attachments',
  'ai_messages',
  'ai_threads',
  'mcp_connections',
  'task_dependencies',
  'comments',
  'tasks',
  'issues',
  'reports',
  'notifications',
  'messages',
  'channels',
  'audit_logs',
  'leave_requests',
  'notion_connections',
  'docs',
  'approvals',
  'clients',
  'events',
  'bookings',
  'resources',
  'project_members',
  'projects',
  'llm_connections',
  'users',
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_RESET_FORCE !== '1') {
    process.stderr.write(
      '[seed:reset] REFUSED — NODE_ENV=production. Set SEED_RESET_FORCE=1 to override (DANGEROUS).\n',
    );
    process.exit(1);
  }

  // CASCADE 로 한 번에 — 의존성 순서 무시 가능
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

  process.stdout.write(`[seed:reset] OK — ${TABLES.length} tables truncated.\n`);
}

main()
  .catch((err) => {
    process.stderr.write(`[seed:reset] FAILED: ${(err as Error).message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
