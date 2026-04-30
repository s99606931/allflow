import { describe, expect, it } from 'vitest';
import { hasAtLeast, isPermitted, PERMISSION_MATRIX, type ProjectRole } from './rbac.js';

describe('plugins/rbac — permission matrix', () => {
  it('hasAtLeast: owner ≥ admin ≥ member', () => {
    expect(hasAtLeast('owner', 'admin')).toBe(true);
    expect(hasAtLeast('admin', 'member')).toBe(true);
    expect(hasAtLeast('owner', 'member')).toBe(true);
    expect(hasAtLeast('member', 'admin')).toBe(false);
    expect(hasAtLeast('admin', 'owner')).toBe(false);
  });

  it('owner는 모든 권한을 가진다', () => {
    for (const action of Object.keys(PERMISSION_MATRIX) as (keyof typeof PERMISSION_MATRIX)[]) {
      expect(isPermitted('owner', action)).toBe(true);
    }
  });

  it('admin은 project.delete / member.remove 만 막힌다', () => {
    const denied = ['project.delete', 'member.remove'] as const;
    for (const action of Object.keys(PERMISSION_MATRIX) as (keyof typeof PERMISSION_MATRIX)[]) {
      expect(isPermitted('admin', action)).toBe(!denied.includes(action as never));
    }
  });

  it('member는 읽기 + task/issue create/update 만 가능, delete/관리 불가', () => {
    const allowed: ReadonlyArray<keyof typeof PERMISSION_MATRIX> = [
      'project.read',
      'task.read',
      'task.create',
      'task.update',
      'issue.read',
      'issue.create',
      'issue.update',
    ];
    for (const action of Object.keys(PERMISSION_MATRIX) as (keyof typeof PERMISSION_MATRIX)[]) {
      expect(isPermitted('member', action)).toBe(allowed.includes(action));
    }
  });

  it('정책: owner는 admin이 가진 모든 권한을 가진다 (단조성)', () => {
    const roles: ProjectRole[] = ['member', 'admin', 'owner'];
    for (const action of Object.keys(PERMISSION_MATRIX) as (keyof typeof PERMISSION_MATRIX)[]) {
      let prevAllowed = false;
      for (const role of roles) {
        const allowed = isPermitted(role, action);
        // 한번 허용되면 더 높은 role 에서 거부되면 안 됨
        if (prevAllowed) expect(allowed).toBe(true);
        prevAllowed = allowed || prevAllowed;
      }
    }
  });

  it('PERMISSION_MATRIX 키는 모두 dot-notation', () => {
    for (const k of Object.keys(PERMISSION_MATRIX)) {
      expect(k).toMatch(/^[a-z]+(\.[a-z]+)+$/);
    }
  });
});
