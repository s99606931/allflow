import { randomBytes } from 'node:crypto';
import { ValidationError } from '@all-flow/shared/errors';
import type { FastifyInstance } from 'fastify';
import * as OTPAuth from 'otpauth/dist/otpauth.node.cjs';
import { z } from 'zod';

const ISSUER = 'ALL-Flow';
const RECOVERY_COUNT = 8;

function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_COUNT }, () =>
    randomBytes(5)
      .toString('hex')
      .toUpperCase()
      .replace(/(.{4})/g, '$1-')
      .slice(0, 9),
  );
}

const VerifyBody = z
  .object({
    code: z
      .string()
      .length(6)
      .regex(/^\d{6}$/),
  })
  .strict();
const DisableBody = z
  .object({
    code: z
      .string()
      .length(6)
      .regex(/^\d{6}$/),
  })
  .strict();

export async function mfaRoutes(app: FastifyInstance): Promise<void> {
  // Step 1: generate TOTP secret + QR URI (does not enable MFA yet)
  app.post('/auth/mfa/setup', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: authenticated
    const userId = req.user!.id;
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.name,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });

    await app.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: totp.secret.base32, mfaEnabled: false },
    });

    return {
      otpUri: totp.toString(),
      secret: totp.secret.base32,
    };
  });

  // Step 2: verify TOTP code and enable MFA, returns recovery codes
  app.post('/auth/mfa/verify', { preHandler: [app.authenticate] }, async (req, reply) => {
    // biome-ignore lint/style/noNonNullAssertion: authenticated
    const userId = req.user!.id;
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) {
      reply.status(400);
      return { error: { code: 'MFA_NOT_SETUP', message: 'MFA setup not initiated' } };
    }
    if (user.mfaEnabled) {
      reply.status(400);
      return { error: { code: 'MFA_ALREADY_ENABLED', message: 'MFA already enabled' } };
    }

    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.name,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    });

    const delta = totp.validate({ token: parsed.data.code, window: 1 });
    if (delta === null) {
      reply.status(422);
      return { error: { code: 'INVALID_TOTP', message: '인증 코드가 올바르지 않습니다.' } };
    }

    const recoveryCodes = generateRecoveryCodes();
    await app.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaRecovery: recoveryCodes },
    });

    return { enabled: true, recoveryCodes };
  });

  // Disable MFA — requires valid TOTP code
  app.delete('/auth/mfa', { preHandler: [app.authenticate] }, async (req, reply) => {
    // biome-ignore lint/style/noNonNullAssertion: authenticated
    const userId = req.user!.id;
    const parsed = DisableBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled || !user.mfaSecret) {
      reply.status(400);
      return { error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled' } };
    }

    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.name,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    });

    const delta = totp.validate({ token: parsed.data.code, window: 1 });
    if (delta === null) {
      reply.status(422);
      return { error: { code: 'INVALID_TOTP', message: '인증 코드가 올바르지 않습니다.' } };
    }

    await app.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaRecovery: [] },
    });

    return { disabled: true };
  });

  // Get MFA status
  app.get('/auth/mfa/status', { preHandler: [app.authenticate] }, async (req) => {
    // biome-ignore lint/style/noNonNullAssertion: authenticated
    const userId = req.user!.id;
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { mfaEnabled: true, mfaRecovery: true },
    });
    return {
      enabled: user.mfaEnabled,
      recoveryCodesRemaining: user.mfaRecovery.length,
    };
  });

  // View recovery codes — requires valid TOTP
  app.post('/auth/mfa/recovery', { preHandler: [app.authenticate] }, async (req, reply) => {
    // biome-ignore lint/style/noNonNullAssertion: authenticated
    const userId = req.user!.id;
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('잘못된 입력', parsed.error.issues);

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled || !user.mfaSecret) {
      reply.status(400);
      return { error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled' } };
    }

    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email ?? user.name,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    });

    const delta = totp.validate({ token: parsed.data.code, window: 1 });
    if (delta === null) {
      reply.status(422);
      return { error: { code: 'INVALID_TOTP', message: '인증 코드가 올바르지 않습니다.' } };
    }

    return { recoveryCodes: user.mfaRecovery };
  });
}
