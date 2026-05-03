import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  type RenderOptions,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessFlowStepper } from '@/components/ai/business-flow-stepper';
import { BUSINESS_FLOWS } from '@/lib/business-flows';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    suggestBusinessFlowNext: vi.fn(),
    getBusinessFlowProgress: vi.fn(),
    patchBusinessFlowProgress: vi.fn(),
  },
}));

// 4차 PDCA: BusinessFlowStepper 가 react-query 훅을 사용 (서버 동기화 옵션).
// enableServerSync prop 미지정 시 disabled 라 네트워크 호출은 없지만 QueryClient 는 필요.
function render(ui: ReactElement, options?: RenderOptions) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('BusinessFlowStepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders all steps with correct current/past/future state', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    // 5 단계 모두 렌더
    for (const step of BUSINESS_FLOWS.project.steps) {
      const btn = screen.getByTestId(`business-flow-step-${step.id}`);
      expect(btn).toBeInTheDocument();
    }
    // current 단계는 data-current="true"
    const current = screen.getByTestId('business-flow-step-execute');
    expect(current.getAttribute('data-current')).toBe('true');
    // 다른 단계는 data-current 없음
    const planStep = screen.getByTestId('business-flow-step-plan');
    expect(planStep.getAttribute('data-current')).toBeNull();
  });

  it('marks past steps as completed (data-completed="true")', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    // plan, kickoff 는 past — data-completed="true"
    expect(
      screen.getByTestId('business-flow-step-plan').getAttribute('data-completed'),
    ).toBe('true');
    expect(
      screen.getByTestId('business-flow-step-kickoff').getAttribute('data-completed'),
    ).toBe('true');
    // execute(current) 와 review/closeout(future) 는 completed 아님
    expect(
      screen.getByTestId('business-flow-step-execute').getAttribute('data-completed'),
    ).toBeNull();
    expect(
      screen.getByTestId('business-flow-step-review').getAttribute('data-completed'),
    ).toBeNull();
  });

  it('renders progress bar with correct percentage based on currentStepId', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    // project 5단계, execute=index 2 → 2/5 = 40%
    const text = screen.getByTestId('business-flow-progress-text');
    expect(text.textContent).toContain('40%');
    const bar = screen.getByTestId('business-flow-progress-bar');
    const inner = bar.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe('40%');
  });

  it('calls onStepSelect when a step is clicked', () => {
    const onSelect = vi.fn();
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
        onStepSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('business-flow-step-review'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ id: 'review' });
  });

  it('AI suggest 클릭 시 enriched context 를 BE 에 전달', async () => {
    (api.suggestBusinessFlowNext as ReturnType<typeof vi.fn>).mockResolvedValue({
      flowId: 'approval-lifecycle',
      currentStep: BUSINESS_FLOWS.approval.steps[0],
      nextStep: BUSINESS_FLOWS.approval.steps[1],
      suggestion: '결재선을 지정하고 상신하세요.',
      adapter: 'in-memory',
    });

    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.approval}
        currentStepId="draft"
        systemContext="테스트 컨텍스트"
      />,
    );

    fireEvent.click(screen.getByTestId('business-flow-ai-suggest'));

    await waitFor(() => {
      expect(api.suggestBusinessFlowNext).toHaveBeenCalledTimes(1);
    });
    const call = (api.suggestBusinessFlowNext as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(call[0]).toBe('approval-lifecycle');
    expect(call[1].currentStepId).toBe('draft');
    // enriched: systemContext + 현재 단계 액션 + aiHint
    expect(call[1].context).toContain('테스트 컨텍스트');
    expect(call[1].context).toContain('기안');
    expect(call[1].context).toContain('기안서 작성');

    await waitFor(() => {
      expect(screen.getByTestId('business-flow-suggestion')).toBeInTheDocument();
      expect(screen.getByText('결재선을 지정하고 상신하세요.')).toBeInTheDocument();
    });
  });

  it('AI suggest 실패 시 stepper 자체는 유지', async () => {
    (api.suggestBusinessFlowNext as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.issue}
        currentStepId="open"
      />,
    );
    fireEvent.click(screen.getByTestId('business-flow-ai-suggest'));
    await waitFor(() => {
      expect(api.suggestBusinessFlowNext).toHaveBeenCalled();
    });
    // suggestion 영역은 렌더되지 않음
    expect(screen.queryByTestId('business-flow-suggestion')).toBeNull();
    // stepper 본문은 유지
    expect(screen.getByTestId('business-flow-stepper')).toBeInTheDocument();
  });

  it('toggle 버튼으로 접고 펼칠 수 있고 localStorage 에 상태 저장', () => {
    const { rerender } = render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
      />,
    );
    // 기본은 펼침 — step 버튼 보임
    expect(screen.getByTestId('business-flow-step-doing')).toBeInTheDocument();
    // 토글 클릭 → 접힘
    fireEvent.click(screen.getByTestId('business-flow-toggle'));
    expect(screen.queryByTestId('business-flow-step-doing')).toBeNull();
    expect(
      screen.getByTestId('business-flow-stepper').getAttribute('data-collapsed'),
    ).toBe('true');
    // localStorage 저장 확인
    expect(window.localStorage.getItem('av:bf-stepper:collapsed:task-lifecycle')).toBe('1');
    // 진행률 바는 접혀도 표시 (currentIdx>=0)
    expect(screen.getByTestId('business-flow-progress-bar')).toBeInTheDocument();

    // 다른 인스턴스로 새로 마운트해도 collapsed 상태 복원
    rerender(<div />);
    rerender(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
      />,
    );
    expect(
      screen.getByTestId('business-flow-stepper').getAttribute('data-collapsed'),
    ).toBe('true');
    expect(screen.queryByTestId('business-flow-step-doing')).toBeNull();

    // 다시 토글하면 펼쳐지고 localStorage 제거
    fireEvent.click(screen.getByTestId('business-flow-toggle'));
    expect(screen.getByTestId('business-flow-step-doing')).toBeInTheDocument();
    expect(window.localStorage.getItem('av:bf-stepper:collapsed:task-lifecycle')).toBeNull();
  });

  it('flow 별 collapsed 상태는 독립적으로 저장된다', () => {
    window.localStorage.setItem('av:bf-stepper:collapsed:project-lifecycle', '1');
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
      />,
    );
    // task-lifecycle 은 collapsed 키가 없으므로 펼쳐진 상태
    expect(screen.getByTestId('business-flow-step-doing')).toBeInTheDocument();
  });
});
