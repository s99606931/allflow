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

  // ---------------------------------------------------------------------
  // 6차 PDCA: overdue 경고 + 단계 완료 알림
  // ---------------------------------------------------------------------

  it('overdue: enableServerSync=false 면 stepStartedAt 이 없어 경고 미표시', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    expect(screen.queryByTestId('business-flow-overdue-warning')).toBeNull();
  });

  it('overdue: stepStartedAt 이 expectedDays 초과 시 amber 경고 배너 표시', async () => {
    // execute 단계는 expectedDays=30. 60일 전 시작 → 30일 초과.
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    (api.getBusinessFlowProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
      flowId: 'project-lifecycle',
      currentStepId: 'execute',
      completedSteps: ['plan', 'kickoff'],
      stepStartedAt: sixtyDaysAgo.toISOString(),
      updatedAt: sixtyDaysAgo.toISOString(),
    });
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
        enableServerSync
      />,
    );
    await waitFor(() => {
      const warning = screen.getByTestId('business-flow-overdue-warning');
      expect(warning).toBeInTheDocument();
      // 30일 초과
      expect(Number(warning.getAttribute('data-days-over'))).toBeGreaterThanOrEqual(30);
    });
  });

  it('overdue: stepStartedAt 이 최근이면 경고 미표시', async () => {
    const today = new Date();
    (api.getBusinessFlowProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
      flowId: 'project-lifecycle',
      currentStepId: 'plan',
      completedSteps: [],
      stepStartedAt: today.toISOString(),
      updatedAt: today.toISOString(),
    });
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="plan"
        enableServerSync
      />,
    );
    // server progress 가 로드된 후에도 경고는 없어야 함
    await waitFor(() => {
      // plan stepStartedAt 가 방금이라 expectedDays=5 안전.
      expect(screen.queryByTestId('business-flow-overdue-warning')).toBeNull();
    });
  });

  it('completion toast: currentStepId 가 다음 단계로 전진하면 sonner toast 호출', async () => {
    const { toast } = await import('sonner');
    const successSpy = toast.success as ReturnType<typeof vi.fn>;
    successSpy.mockClear();

    const { rerender } = render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="create"
      />,
    );
    // 처음 마운트는 toast 안 호출 (prevStepIdRef 초기화 단계).
    expect(successSpy).not.toHaveBeenCalled();

    // create → doing 으로 전진
    rerender(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
      />,
    );
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledTimes(1);
      const call = successSpy.mock.calls[0];
      expect(call?.[0]).toContain('진행'); // doing 단계 label
    });
  });

  it('completion toast: 뒤로 가기(인덱스 감소)는 toast 호출 안 함', async () => {
    const { toast } = await import('sonner');
    const successSpy = toast.success as ReturnType<typeof vi.fn>;
    successSpy.mockClear();

    const { rerender } = render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="review"
      />,
    );
    // review → doing 으로 후퇴
    rerender(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
      />,
    );
    // 역방향 전이는 toast 미호출
    expect(successSpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // 7차 PDCA: 접근성(a11y) + 키보드 네비게이션 + 완주 축하
  // ---------------------------------------------------------------------

  it('a11y: nav role + aria-label 부여', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    const nav = screen.getByTestId('business-flow-stepper');
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toContain(BUSINESS_FLOWS.project.name);
  });

  it('a11y: 현재 단계 버튼은 aria-current="step"', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    const currentBtn = screen.getByTestId('business-flow-step-execute');
    expect(currentBtn.getAttribute('aria-current')).toBe('step');
    const otherBtn = screen.getByTestId('business-flow-step-plan');
    expect(otherBtn.getAttribute('aria-current')).toBeNull();
  });

  it('a11y: 단계 버튼은 aria-describedby 로 role=tooltip 노드를 참조', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    const btn = screen.getByTestId('business-flow-step-execute');
    const tooltipId = btn.getAttribute('aria-describedby');
    expect(tooltipId).toBeTruthy();
    const tooltip = document.getElementById(tooltipId ?? '');
    expect(tooltip).not.toBeNull();
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    // 툴팁 내용에 description + screen 포함
    expect(tooltip?.textContent).toContain('태스크');
    expect(tooltip?.textContent).toContain('/dashboard');
  });

  it('keyboard: ArrowRight 로 다음 단계 버튼에 포커스 이동', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    const planBtn = screen.getByTestId('business-flow-step-plan');
    planBtn.focus();
    expect(document.activeElement).toBe(planBtn);
    fireEvent.keyDown(planBtn, { key: 'ArrowRight' });
    const kickoffBtn = screen.getByTestId('business-flow-step-kickoff');
    expect(document.activeElement).toBe(kickoffBtn);
  });

  it('keyboard: ArrowLeft 로 이전 단계 버튼에 포커스 이동', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    const executeBtn = screen.getByTestId('business-flow-step-execute');
    executeBtn.focus();
    fireEvent.keyDown(executeBtn, { key: 'ArrowLeft' });
    const kickoffBtn = screen.getByTestId('business-flow-step-kickoff');
    expect(document.activeElement).toBe(kickoffBtn);
  });

  it('keyboard: Home/End 로 첫/끝 단계 이동', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="execute"
      />,
    );
    const executeBtn = screen.getByTestId('business-flow-step-execute');
    executeBtn.focus();
    fireEvent.keyDown(executeBtn, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByTestId('business-flow-step-closeout'));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByTestId('business-flow-step-plan'));
  });

  it('keyboard: 첫 단계에서 ArrowLeft 는 무시 (out-of-range)', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.project}
        currentStepId="plan"
      />,
    );
    const planBtn = screen.getByTestId('business-flow-step-plan');
    planBtn.focus();
    fireEvent.keyDown(planBtn, { key: 'ArrowLeft' });
    // 포커스 유지
    expect(document.activeElement).toBe(planBtn);
  });

  it('완주 축하: 미완 → 마지막 단계 전이 시 toast.success + confetti 표시', async () => {
    const { toast } = await import('sonner');
    const successSpy = toast.success as ReturnType<typeof vi.fn>;
    successSpy.mockClear();

    const { rerender } = render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="review"
      />,
    );
    // review(미완) → done(마지막) 으로 전이
    rerender(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="done"
      />,
    );
    await waitFor(() => {
      // 두 개의 toast: 단계 전이("다음 단계: ...") + 완주("🎉 ...")
      const calls = successSpy.mock.calls.map((c) => c[0]);
      expect(calls.some((msg) => typeof msg === 'string' && msg.includes('🎉'))).toBe(true);
    });
    // 컨페티 오버레이 표시
    await waitFor(() => {
      expect(screen.getByTestId('business-flow-confetti')).toBeInTheDocument();
    });
    // data-flow-complete + data-celebrating 어트리뷰트
    const stepper = screen.getByTestId('business-flow-stepper');
    expect(stepper.getAttribute('data-flow-complete')).toBe('true');
    expect(stepper.getAttribute('data-celebrating')).toBe('true');
  });

  it('완주 축하: 첫 마운트가 이미 완료 상태면 toast 미호출 (이미 본 것)', async () => {
    const { toast } = await import('sonner');
    const successSpy = toast.success as ReturnType<typeof vi.fn>;
    successSpy.mockClear();

    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="done" // 처음부터 마지막
      />,
    );
    // 초기 마운트는 prev=null 이므로 축하 효과 미실행
    expect(
      successSpy.mock.calls.some(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('🎉'),
      ),
    ).toBe(false);
    // 컨페티 오버레이 미표시
    expect(screen.queryByTestId('business-flow-confetti')).toBeNull();
  });

  it('완주 축하: localStorage 가드로 동일 플로우 재완주 시 toast 미호출', async () => {
    window.localStorage.setItem('av:bf-stepper:completed:task-lifecycle', '1');
    const { toast } = await import('sonner');
    const successSpy = toast.success as ReturnType<typeof vi.fn>;
    successSpy.mockClear();

    const { rerender } = render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="review"
      />,
    );
    rerender(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="done"
      />,
    );
    // 이미 축하한 기록 → 🎉 미호출
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalled();
    });
    expect(
      successSpy.mock.calls.some(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('🎉'),
      ),
    ).toBe(false);
    expect(screen.queryByTestId('business-flow-confetti')).toBeNull();
  });

  it('focus-visible: 단계 버튼 className 에 focus-visible 토큰 포함', () => {
    render(
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.task}
        currentStepId="doing"
      />,
    );
    const btn = screen.getByTestId('business-flow-step-doing');
    expect(btn.className).toContain('focus-visible:ring-2');
    expect(btn.className).toContain('focus-visible:ring-accent');
    expect(btn.className).toContain('focus-visible:outline-none');
  });
});
