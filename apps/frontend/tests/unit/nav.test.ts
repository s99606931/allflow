import { describe, expect, it } from 'vitest';
import { NAV } from '@/lib/nav';

/**
 * 사이드바 네비게이션 무결성 테스트.
 * NAV 의 모든 href 가 실제 라우트와 매칭되는지, 중복이 없는지 검증.
 */
const ROUTES = [
  '/', '/projects', '/tasks', '/gantt', '/issues', '/calendar', '/docs', '/chat',
  '/progress', '/clients',
  '/ai-auto', '/notion',
  '/reports/weekly', '/reports/monthly',
  '/org', '/users', '/admin', '/notifications',
  '/approvals', '/hr', '/resources', '/settings',
];

describe('NAV 무결성', () => {
  it('섹션은 비어있지 않음', () => {
    expect(NAV.length).toBeGreaterThan(0);
    NAV.forEach(s => expect(s.items.length).toBeGreaterThan(0));
  });

  it('id 는 전역 유일', () => {
    const ids = NAV.flatMap(s => s.items.map(i => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('href 는 전역 유일', () => {
    const hrefs = NAV.flatMap(s => s.items.map(i => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('모든 href 가 알려진 라우트 집합에 속함', () => {
    const hrefs = NAV.flatMap(s => s.items.map(i => i.href));
    for (const h of hrefs) expect(ROUTES).toContain(h);
  });

  it('icon 이름은 PascalCase 문자열', () => {
    NAV.flatMap(s => s.items).forEach(i => {
      expect(i.icon).toMatch(/^[A-Z][A-Za-z0-9]+$/);
    });
  });

  it('label 은 비어있지 않음', () => {
    NAV.flatMap(s => s.items).forEach(i => expect(i.label.length).toBeGreaterThan(0));
  });
});
