import type { PrismaClient } from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';

export async function writeAuditLog(
  prisma: PrismaClient,
  opts: {
    action: string;
    actorId: string;
    targetType?: string;
    targetId?: string;
    metadata?: InputJsonValue;
  },
) {
  return prisma.auditLog.create({ data: opts });
}
