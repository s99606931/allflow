/**
 * RBAC 가드 — Owner/Admin/Member + project-level membership 검증.
 *
 * 사용:
 *   app.get('/projects/:id', {
 *     preHandler: [app.authenticate, app.requireMembership('id')],
 *     handler: async (req) => req.membership,
 *   });
 *
 *   app.patch('/projects/:id', {
 *     preHandler: [app.authenticate, app.requireRole(['owner', 'admin'], 'id')],
 *   });
 *
 * 권한 매트릭스:
 *   owner  ⊃ admin ⊃ member
 *   - owner: 프로젝트 삭제, 멤버 추가/삭제, 모든 admin 권한
 *   - admin: 멤버 역할 변경(owner 제외), 모든 member 권한
 *   - member: 읽기 + 자기 태스크/이슈 작성/수정
 */
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import { AuthError, ForbiddenError, NotFoundError } from '../shared/errors.js';

export type ProjectRole = 'owner' | 'admin' | 'member';

export interface Membership {
  projectId: string;
  userId: string;
  role: ProjectRole;
}

declare module 'fastify' {
  interface FastifyInstance {
    requireMembership: (projectIdParam?: string) => preHandlerHookHandler;
    requireRole: (roles: ProjectRole[], projectIdParam?: string) => preHandlerHookHandler;
  }
  interface FastifyRequest {
    membership?: Membership;
  }
}

/**
 * roles 우위 비교: owner > admin > member
 */
const ORDER: Record<ProjectRole, number> = { member: 0, admin: 1, owner: 2 };
export function hasAtLeast(role: ProjectRole, required: ProjectRole): boolean {
  return ORDER[role] >= ORDER[required];
}

/**
 * 권한 매트릭스 정적 검사 (단위 테스트가 import 해서 사용).
 * action × role → boolean
 */
export const PERMISSION_MATRIX = {
  'project.read': ['owner', 'admin', 'member'],
  'project.update': ['owner', 'admin'],
  'project.delete': ['owner'],
  'member.add': ['owner', 'admin'],
  'member.remove': ['owner'],
  'member.role.change': ['owner', 'admin'],
  'task.read': ['owner', 'admin', 'member'],
  'task.create': ['owner', 'admin', 'member'],
  'task.update': ['owner', 'admin', 'member'],
  'task.delete': ['owner', 'admin'],
  'issue.read': ['owner', 'admin', 'member'],
  'issue.create': ['owner', 'admin', 'member'],
  'issue.update': ['owner', 'admin', 'member'],
  'issue.delete': ['owner', 'admin'],
} as const satisfies Record<string, ProjectRole[]>;

export type Permission = keyof typeof PERMISSION_MATRIX;

export function isPermitted(role: ProjectRole, action: Permission): boolean {
  return (PERMISSION_MATRIX[action] as readonly ProjectRole[]).includes(role);
}

function readProjectId(req: FastifyRequest, paramName: string): string {
  const params = req.params as Record<string, unknown> | undefined;
  const id = params?.[paramName];
  if (typeof id !== 'string' || id.length === 0) {
    throw new NotFoundError('Project');
  }
  return id;
}

async function plugin(app: FastifyInstance): Promise<void> {
  app.decorate('requireMembership', (projectIdParam = 'id'): preHandlerHookHandler => {
    return async (req) => {
      const user = req.user;
      if (!user) throw new AuthError();
      const projectId = readProjectId(req, projectIdParam);

      const m = await app.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } },
      });
      if (!m) throw new ForbiddenError('프로젝트 멤버가 아닙니다');
      req.membership = { projectId, userId: user.id, role: m.role as ProjectRole };
    };
  });

  app.decorate(
    'requireRole',
    (roles: ProjectRole[], projectIdParam = 'id'): preHandlerHookHandler => {
      return async (req) => {
        const user = req.user;
        if (!user) throw new AuthError();
        const projectId = readProjectId(req, projectIdParam);

        const m = await app.prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: user.id } },
        });
        if (!m) throw new ForbiddenError('프로젝트 멤버가 아닙니다');

        const role = m.role as ProjectRole;
        if (!roles.includes(role)) {
          throw new ForbiddenError(`이 작업은 ${roles.join('/')} 권한이 필요합니다`);
        }
        req.membership = { projectId, userId: user.id, role };
      };
    },
  );
}

export const rbacPlugin = fp(plugin, {
  name: 'rbac',
  dependencies: ['prisma'],
});
