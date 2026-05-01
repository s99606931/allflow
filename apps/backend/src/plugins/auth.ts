/**
 * JWT 인증 미들웨어 (next-auth v5 호환).
 *
 * 동작:
 *  1) `Authorization: Bearer <token>` 헤더에서 토큰 추출
 *  2) AUTH_SECRET을 HKDF로 32바이트 키로 유도(next-auth v5 기본 알고리즘)
 *  3) `jose.jwtDecrypt` 로 JWE 복호화 또는 JWS 검증
 *  4) RevokedToken 블록리스트 확인 — tokenId(jti) 존재 시 401
 *  5) 페이로드를 `req.user` 에 주입 (id/name/email)
 *  6) 실패 시 `AuthError` (401)
 *
 * `app.authenticate` decorator 를 라우트 preHandler 로 사용한다:
 *   app.get('/users/me', { preHandler: app.authenticate }, async (req) => req.user);
 */
import { hkdf } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthError } from '@all-flow/shared/errors';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { jwtDecrypt, jwtVerify } from 'jose';
import { getEnv } from '../config/env.js';
import { getPrisma } from './prisma.js';

const hkdfAsync = promisify(hkdf);

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * next-auth v5 의 JWE 키 유도 로직과 동일.
 * 참고: next-auth/core/lib/jwt.ts → `getDerivedEncryptionKey` (HKDF-SHA256, 32 bytes)
 * salt 는 next-auth v5에서 cookie 이름이 디폴트지만, 환경변수 AUTH_SALT 로 오버라이드 가능.
 */
async function deriveKey(secret: string, salt: string): Promise<Uint8Array> {
  const info = `Auth.js Generated Encryption Key (${salt})`;
  const buf = await hkdfAsync('sha256', secret, salt, info, 32);
  return new Uint8Array(buf);
}

const BEARER_RE = /^Bearer\s+(.+)$/i;

function extractToken(req: FastifyRequest): string {
  const header = req.headers.authorization;
  if (!header) throw new AuthError('Authorization 헤더가 필요합니다');
  const match = BEARER_RE.exec(header);
  if (!match) throw new AuthError('Bearer 토큰 형식이 올바르지 않습니다');
  return match[1] as string;
}

function isJwe(token: string): boolean {
  // JWE 는 5 segment, JWS 는 3 segment
  return token.split('.').length === 5;
}

interface VerifyOptions {
  secret: string;
  salt: string;
}

interface VerifyResult {
  user: AuthUser;
  jti?: string;
}

async function verifyTokenInternal(token: string, opts: VerifyOptions): Promise<VerifyResult> {
  if (isJwe(token)) {
    const key = await deriveKey(opts.secret, opts.salt);
    const { payload } = await jwtDecrypt(token, key);
    return { user: toAuthUser(payload), jti: typeof payload.jti === 'string' ? payload.jti : undefined };
  }
  const secretBytes = new TextEncoder().encode(opts.secret);
  const { payload } = await jwtVerify(token, secretBytes);
  return { user: toAuthUser(payload), jti: typeof payload.jti === 'string' ? payload.jti : undefined };
}

export async function verifyToken(token: string, opts: VerifyOptions): Promise<AuthUser> {
  const { user } = await verifyTokenInternal(token, opts);
  return user;
}

function toAuthUser(payload: Record<string, unknown>): AuthUser {
  const sub = payload.sub ?? payload.id;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new AuthError('토큰에 사용자 식별자(sub)가 없습니다');
  }
  return {
    id: sub,
    ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
    ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
    ...(typeof payload.role === 'string' ? { role: payload.role } : {}),
  };
}

async function plugin(app: FastifyInstance): Promise<void> {
  const env = getEnv();
  if (!env.AUTH_SECRET) {
    throw new Error('[auth] AUTH_SECRET이 설정되지 않았습니다');
  }
  const secret = env.AUTH_SECRET;
  const salt = process.env.AUTH_SALT ?? 'authjs.session-token';

  app.decorate('authenticate', async (req: FastifyRequest, _reply: FastifyReply) => {
    try {
      const token = extractToken(req);
      const { user, jti } = await verifyTokenInternal(token, { secret, salt });
      if (jti) {
        const prisma = app.prisma ?? getPrisma();
        const revoked = await prisma.revokedToken.findUnique({ where: { tokenId: jti } });
        if (revoked) throw new AuthError('토큰이 폐기되었습니다');
      }
      req.user = user;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('토큰 검증 실패', { cause: (err as Error).message });
    }
  });
}

export const authPlugin = fp(plugin, { name: 'auth' });
