/**
 * Init seed — 신규 프로젝트 초기 시드.
 *
 * 목적: 깨끗한 DB + 로그인 가능한 owner 사용자 1명 + 기본 LLM 연결.
 * 사용 시나리오: 사용자가 로그인 후 모든 데이터(프로젝트/태스크/이슈/AI 연결 등)를 직접 입력하는 초기 버전.
 *
 * 실행: pnpm seed:init  (apps/backend 에서)
 *       pnpm seed init   (root 에서)
 *
 * 멱등: upsert 기반. 재실행 안전.
 *
 * 주의:
 *   - 이 시드는 데이터를 삭제하지 않는다 (TRUNCATE 없음). 초기화하려면 `pnpm seed:reset` 후 실행.
 *   - admin 사용자 email = ADMIN_EMAIL 환경변수 (없으면 admin@all-flow.local).
 */
import { PrismaClient } from '@prisma/client';
import { ADMIN_USER } from './_shared.js';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? ADMIN_USER.email;
  const adminName = process.env.ADMIN_NAME ?? ADMIN_USER.name;

  // owner 사용자 1명 — 로그인 진입점
  const admin = await prisma.user.upsert({
    where: { id: ADMIN_USER.id },
    update: {
      name: adminName,
      role: ADMIN_USER.role,
      dept: ADMIN_USER.dept,
      initials: ADMIN_USER.initials,
      color: ADMIN_USER.color,
      email: adminEmail,
    },
    create: {
      id: ADMIN_USER.id,
      name: adminName,
      role: ADMIN_USER.role,
      dept: ADMIN_USER.dept,
      initials: ADMIN_USER.initials,
      color: ADMIN_USER.color,
      email: adminEmail,
    },
  });

  // 기본 LLM 연결 (변경/삭제 가능). 활성 연결이 하나도 없을 때만 활성화.
  const existingDefault = await prisma.llmConnection.findFirst({ where: { isDefault: true } });
  if (!existingDefault) {
    const activeExists = await prisma.llmConnection.findFirst({ where: { isActive: true } });
    await prisma.llmConnection.create({
      data: {
        name: 'LMStudio (local)',
        kind: 'lmstudio',
        baseUrl: 'http://192.168.0.104:1234',
        model: 'gemma-4-e4b-it',
        apiKey: null,
        isDefault: true,
        isActive: !activeExists,
      },
    });
  }

  process.stdout.write(
    `[seed:init] OK — admin=${admin.email} (id=${admin.id}). 로그인 후 데이터를 직접 입력하세요.\n`,
  );
}

main()
  .catch((err) => {
    process.stderr.write(`[seed:init] FAILED: ${(err as Error).message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
