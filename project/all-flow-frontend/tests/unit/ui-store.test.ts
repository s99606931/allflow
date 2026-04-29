import { describe, expect, it, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUIStore } from '@/store/ui-store';

describe('UI Store (Zustand)', () => {
  beforeEach(() => {
    // persist 미들웨어 — localStorage 초기화는 setup.ts 의 afterEach 에서 수행
    useUIStore.setState({
      theme: 'light',
      accent: 'blue',
      sidebarCollapsed: false,
      aiPanelOpen: false,
    });
  });

  it('초기 상태', () => {
    const s = useUIStore.getState();
    expect(s.theme).toBe('light');
    expect(s.accent).toBe('blue');
    expect(s.sidebarCollapsed).toBe(false);
    expect(s.aiPanelOpen).toBe(false);
  });

  it('테마 토글', () => {
    act(() => useUIStore.getState().setTheme('dark'));
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it.each(['indigo', 'violet', 'teal', 'amber', 'rose'] as const)('액센트=%s 변경', a => {
    act(() => useUIStore.getState().setAccent(a));
    expect(useUIStore.getState().accent).toBe(a);
  });

  it('사이드바 토글', () => {
    act(() => useUIStore.getState().toggleSidebar());
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    act(() => useUIStore.getState().toggleSidebar());
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('AI 패널 토글', () => {
    act(() => useUIStore.getState().toggleAIPanel());
    expect(useUIStore.getState().aiPanelOpen).toBe(true);
    act(() => useUIStore.getState().toggleAIPanel());
    expect(useUIStore.getState().aiPanelOpen).toBe(false);
  });
});
