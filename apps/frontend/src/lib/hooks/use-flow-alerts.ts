'use client';

/**
 * 10차 PDCA — 플로우 알림 카운터 훅.
 *
 * useNotifications() 결과에서 kind==='flow_overdue' + read===false 인 알림을 필터링하고,
 * (선택) flowId 의 단계 화면(`step.screen`) 으로 href 매칭하여 해당 플로우에 속한
 * 미확인 알림 수를 계산한다.
 *
 * 이 훅은 추가 네트워크 호출을 발생시키지 않는다 — 기존 알림 쿼리에 의존.
 */

import { useMemo } from 'react';
import { useNotifications } from '@/lib/hooks/use-data';
import type { BusinessFlow } from '@/lib/api/extended';

export interface FlowAlertsResult {
  /** 미확인 flow_overdue 알림 총 개수. */
  unreadCount: number;
  /** 가장 최신 미확인 알림 1건 (피크용, 없으면 null). */
  latest: { id: string; title: string; href?: string; time: string } | null;
}

/**
 * @param flow 플로우 정의 — 단계 screen 으로 알림 href 매칭.
 *             undefined 이면 전체 flow_overdue 알림을 카운트.
 */
export function useFlowAlerts(flow?: BusinessFlow): FlowAlertsResult {
  const { data: items = [] } = useNotifications();
  return useMemo(() => {
    const screenSet = flow ? new Set(flow.steps.map((s) => s.screen)) : null;
    const matched = items.filter((n) => {
      if (n.kind !== 'flow_overdue') return false;
      if (n.read) return false;
      if (screenSet) {
        if (!n.href) return false;
        if (!screenSet.has(n.href)) return false;
      }
      return true;
    });
    matched.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
    const top = matched[0];
    return {
      unreadCount: matched.length,
      latest: top
        ? {
            id: top.id,
            title: top.title,
            ...(top.href ? { href: top.href } : {}),
            time: top.time,
          }
        : null,
    };
  }, [items, flow]);
}
