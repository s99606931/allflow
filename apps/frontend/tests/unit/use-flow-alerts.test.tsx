/**
 * useFlowAlerts 훅 테스트 — 10차 PDCA.
 *
 * 검증 포인트:
 *  - flow_overdue 인 미확인 알림만 카운트
 *  - flow.steps.screen 으로 href 매칭 (다른 화면의 알림은 제외)
 *  - flow 미지정 시 전체 flow_overdue 알림 합산
 *  - 정렬: latest 는 가장 최근 createdAt
 */

import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFlowAlerts } from '@/lib/hooks/use-flow-alerts';
import type { BusinessFlow } from '@/lib/api/extended';

const FAKE_NOTIFS = [
  {
    id: 'n1',
    kind: 'flow_overdue',
    title: '프로젝트 라이프사이클 — "기획" 단계 지연',
    href: '/projects',
    time: '2026-05-03T08:00:00.000Z',
    read: false,
  },
  {
    id: 'n2',
    kind: 'flow_overdue',
    title: '이슈 트래킹 흐름 — "등록" 단계 지연',
    href: '/issues',
    time: '2026-05-03T09:00:00.000Z',
    read: false,
  },
  {
    id: 'n3',
    kind: 'flow_overdue',
    title: '읽음 처리된 알림',
    href: '/projects',
    time: '2026-05-02T10:00:00.000Z',
    read: true,
  },
  {
    id: 'n4',
    kind: 'mention',
    title: '멘션 — flow_overdue 가 아니므로 제외',
    href: '/projects',
    time: '2026-05-03T07:00:00.000Z',
    read: false,
  },
];

vi.mock('@/lib/hooks/use-data', () => ({
  useNotifications: () => ({ data: FAKE_NOTIFS }),
}));

const PROJECT_FLOW: BusinessFlow = {
  id: 'project-lifecycle',
  name: '프로젝트 라이프사이클',
  description: '',
  category: 'project',
  steps: [
    { id: 'plan', label: '기획', description: '', screen: '/projects', action: '', aiHint: '' },
    { id: 'kickoff', label: '킥오프', description: '', screen: '/tasks', action: '', aiHint: '' },
  ],
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useFlowAlerts', () => {
  it('flow 지정 시 해당 단계 화면의 미확인 flow_overdue 만 카운트', () => {
    const { result } = renderHook(() => useFlowAlerts(PROJECT_FLOW), {
      wrapper: makeWrapper(),
    });
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.latest?.id).toBe('n1');
    expect(result.current.latest?.href).toBe('/projects');
  });

  it('flow 미지정 시 전체 flow_overdue 미확인 알림 합산', () => {
    const { result } = renderHook(() => useFlowAlerts(undefined), {
      wrapper: makeWrapper(),
    });
    expect(result.current.unreadCount).toBe(2);
    // 가장 최신: n2 (09:00) vs n1 (08:00).
    expect(result.current.latest?.id).toBe('n2');
  });

  it('읽음 처리된 알림은 제외', () => {
    const { result } = renderHook(() => useFlowAlerts(PROJECT_FLOW), {
      wrapper: makeWrapper(),
    });
    // n3 는 read=true 라서 제외, /projects 화면 미확인은 n1 단 1건.
    expect(result.current.unreadCount).toBe(1);
  });

  it('flow_overdue 가 아닌 알림은 카운트 안 함', () => {
    const { result } = renderHook(() => useFlowAlerts(PROJECT_FLOW), {
      wrapper: makeWrapper(),
    });
    // n4 는 mention 이므로 제외.
    expect(result.current.unreadCount).toBe(1);
  });
});
