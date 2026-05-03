import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  waitFor,
  type RenderOptions,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlowInsightsPanel } from '@/components/ai/flow-insights-panel';
import { api } from '@/lib/api';
import type { FlowInsight } from '@/lib/api/extended';

vi.mock('@/lib/api', () => ({
  api: {
    getBusinessFlowInsights: vi.fn(),
  },
}));

function render(ui: ReactElement, options?: RenderOptions) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

const INSIGHT_WITH_BOTTLENECK: FlowInsight = {
  flowId: 'project-lifecycle',
  totalMembers: 3,
  bottleneckStepId: 'kickoff',
  aiExplanation: '"킥오프" 단계에서 팀원의 100%가 지연되고 있습니다. 차단 요인 점검이 필요합니다.',
  steps: [
    {
      stepId: 'plan',
      label: '기획',
      memberCount: 1,
      avgDwellDays: 1,
      overdueRatio: 0,
      isBottleneck: false,
    },
    {
      stepId: 'kickoff',
      label: '킥오프',
      memberCount: 2,
      avgDwellDays: 9,
      overdueRatio: 1,
      isBottleneck: true,
    },
    {
      stepId: 'execute',
      label: '실행',
      memberCount: 0,
      avgDwellDays: 0,
      overdueRatio: 0,
      isBottleneck: false,
    },
    {
      stepId: 'review',
      label: '검토',
      memberCount: 0,
      avgDwellDays: 0,
      overdueRatio: 0,
      isBottleneck: false,
    },
    {
      stepId: 'closeout',
      label: '마무리',
      memberCount: 0,
      avgDwellDays: 0,
      overdueRatio: 0,
      isBottleneck: false,
    },
  ],
};

const INSIGHT_EMPTY: FlowInsight = {
  flowId: 'project-lifecycle',
  totalMembers: 0,
  bottleneckStepId: null,
  aiExplanation: '프로젝트 라이프사이클 플로우에 참여 중인 팀원이 없습니다. 첫 단계부터 시작해 보세요.',
  steps: [
    {
      stepId: 'plan',
      label: '기획',
      memberCount: 0,
      avgDwellDays: 0,
      overdueRatio: 0,
      isBottleneck: false,
    },
  ],
};

describe('FlowInsightsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('병목 단계는 data-bottleneck=true 로 노출 + 빨간 ring 클래스 적용', async () => {
    vi.mocked(api.getBusinessFlowInsights).mockResolvedValueOnce(
      INSIGHT_WITH_BOTTLENECK,
    );
    render(<FlowInsightsPanel />);

    await waitFor(() => {
      expect(api.getBusinessFlowInsights).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('flow-insights-step-kickoff')).toBeInTheDocument();
    });

    const kickoff = screen.getByTestId('flow-insights-step-kickoff');
    expect(kickoff.getAttribute('data-bottleneck')).toBe('true');
    expect(kickoff.className).toMatch(/ring-red-500/);

    const plan = screen.getByTestId('flow-insights-step-plan');
    expect(plan.getAttribute('data-bottleneck')).toBe('false');
  });

  it('AI 설명 텍스트를 렌더한다', async () => {
    vi.mocked(api.getBusinessFlowInsights).mockResolvedValueOnce(
      INSIGHT_WITH_BOTTLENECK,
    );
    render(<FlowInsightsPanel />);

    await waitFor(() => {
      const aiBox = screen.getByTestId('flow-insights-ai-text');
      expect(aiBox.textContent).toContain('킥오프');
      expect(aiBox.textContent).toContain('100%');
    });
  });

  it('빈 결과(병목 없음) 도 패널을 표시하고 totalMembers=0 노출', async () => {
    vi.mocked(api.getBusinessFlowInsights).mockResolvedValueOnce(INSIGHT_EMPTY);
    render(<FlowInsightsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('flow-insights-step-plan')).toBeInTheDocument();
    });
    // Header 의 "· 0명" — 텍스트 노드가 형제로 분리되므로 textContent 로 검증.
    expect(screen.getByTestId('flow-insights-panel').textContent).toContain('0명');
    // bottleneckStepId=null → 어떤 단계도 isBottleneck=true 아님
    const plan = screen.getByTestId('flow-insights-step-plan');
    expect(plan.getAttribute('data-bottleneck')).toBe('false');
  });

  it('네트워크 실패 시 패널을 표시하지 않는다 (silent fallback)', async () => {
    vi.mocked(api.getBusinessFlowInsights).mockRejectedValueOnce(
      new Error('network'),
    );
    const { container } = render(<FlowInsightsPanel />);

    await waitFor(() => {
      expect(api.getBusinessFlowInsights).toHaveBeenCalled();
    });
    // queryFn catch → null 반환 → 컴포넌트 비렌더 (data===null 분기).
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="flow-insights-panel"]'),
      ).toBeNull();
    });
  });

  it('flowId prop 을 API 에 전달한다', async () => {
    vi.mocked(api.getBusinessFlowInsights).mockResolvedValueOnce(INSIGHT_EMPTY);
    render(<FlowInsightsPanel flowId="task-lifecycle" />);

    await waitFor(() => {
      expect(api.getBusinessFlowInsights).toHaveBeenCalledWith('task-lifecycle');
    });
  });
});
