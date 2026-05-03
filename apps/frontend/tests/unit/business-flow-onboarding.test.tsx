/**
 * BusinessFlowOnboarding 6차 PDCA — 1회성 온보딩 오버레이 테스트.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BusinessFlowOnboarding } from '@/components/ai/business-flow-onboarding';

const KEY = 'av:bf-onboarding:done';

describe('BusinessFlowOnboarding', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('첫 방문이면 오버레이가 표시된다', () => {
    render(<BusinessFlowOnboarding />);
    expect(screen.getByTestId('business-flow-onboarding')).toBeInTheDocument();
  });

  it('localStorage 에 done 키가 있으면 오버레이가 표시되지 않는다', () => {
    window.localStorage.setItem(KEY, '1');
    render(<BusinessFlowOnboarding />);
    expect(screen.queryByTestId('business-flow-onboarding')).toBeNull();
  });

  it('확인 버튼 클릭 시 오버레이가 사라지고 localStorage 에 기록된다', () => {
    render(<BusinessFlowOnboarding />);
    fireEvent.click(screen.getByTestId('business-flow-onboarding-dismiss'));
    expect(screen.queryByTestId('business-flow-onboarding')).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe('1');
  });

  it('X 버튼 클릭 시 오버레이가 사라지고 localStorage 에 기록된다', () => {
    render(<BusinessFlowOnboarding />);
    fireEvent.click(screen.getByTestId('business-flow-onboarding-close'));
    expect(screen.queryByTestId('business-flow-onboarding')).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBe('1');
  });

  it('한 번 닫으면 다음 마운트에서도 표시되지 않는다', () => {
    const { unmount } = render(<BusinessFlowOnboarding />);
    fireEvent.click(screen.getByTestId('business-flow-onboarding-dismiss'));
    unmount();

    render(<BusinessFlowOnboarding />);
    expect(screen.queryByTestId('business-flow-onboarding')).toBeNull();
  });
});
