import { describe, expect, it } from 'vitest';

// 동적 currentStepId 추론 순수 로직 단위 테스트
// dashboard.tsx 및 projects.tsx 에서 분리한 추론 규칙을 검증한다.

function inferDashboardStep(opts: { projectsLength: number; doingCount: number; todoCount: number }): string {
  const { projectsLength, doingCount, todoCount } = opts;
  return (
    projectsLength === 0 ? 'plan' :
    doingCount > 0 ? 'execute' :
    todoCount > 0 ? 'kickoff' :
    'execute'
  );
}

function inferProjectsStep(opts: {
  projectsLength: number;
  doneCount: number;
  activeCount: number;
  blockedCount: number;
  overdueCount: number;
}): string {
  const { projectsLength, doneCount, activeCount, blockedCount, overdueCount } = opts;
  return (
    projectsLength === 0 ? 'plan' :
    doneCount === projectsLength ? 'closeout' :
    overdueCount > 0 ? 'review' :
    blockedCount > 0 ? 'review' :
    activeCount > 0 ? 'execute' :
    'plan'
  );
}

describe('Dashboard flow step inference', () => {
  it('shows plan when no projects exist (new user)', () => {
    expect(inferDashboardStep({ projectsLength: 0, doingCount: 0, todoCount: 0 })).toBe('plan');
  });

  it('shows execute when tasks are in-progress', () => {
    expect(inferDashboardStep({ projectsLength: 2, doingCount: 3, todoCount: 5 })).toBe('execute');
  });

  it('shows kickoff when tasks exist but none started yet', () => {
    expect(inferDashboardStep({ projectsLength: 1, doingCount: 0, todoCount: 4 })).toBe('kickoff');
  });

  it('defaults to execute for active project with no open tasks', () => {
    expect(inferDashboardStep({ projectsLength: 2, doingCount: 0, todoCount: 0 })).toBe('execute');
  });
});

describe('Projects flow step inference', () => {
  it('shows plan when no projects exist', () => {
    expect(inferProjectsStep({ projectsLength: 0, doneCount: 0, activeCount: 0, blockedCount: 0, overdueCount: 0 })).toBe('plan');
  });

  it('shows closeout when all projects are done', () => {
    expect(inferProjectsStep({ projectsLength: 3, doneCount: 3, activeCount: 0, blockedCount: 0, overdueCount: 0 })).toBe('closeout');
  });

  it('shows review when overdue projects exist', () => {
    expect(inferProjectsStep({ projectsLength: 2, doneCount: 0, activeCount: 2, blockedCount: 0, overdueCount: 1 })).toBe('review');
  });

  it('shows review when blocked projects exist', () => {
    expect(inferProjectsStep({ projectsLength: 2, doneCount: 0, activeCount: 2, blockedCount: 1, overdueCount: 0 })).toBe('review');
  });

  it('overdue takes precedence over blocked', () => {
    expect(inferProjectsStep({ projectsLength: 3, doneCount: 0, activeCount: 3, blockedCount: 1, overdueCount: 2 })).toBe('review');
  });

  it('shows execute for healthy active projects', () => {
    expect(inferProjectsStep({ projectsLength: 3, doneCount: 1, activeCount: 2, blockedCount: 0, overdueCount: 0 })).toBe('execute');
  });
});

function inferDocsStep(opts: { docsLength: number; editing: boolean }): string {
  const { docsLength, editing } = opts;
  return docsLength === 0 ? 'draft' : editing ? 'review' : 'archive';
}

function inferReportStep(opts: { report: { id: string } | null; historyIds: string[]; scopeSize: number }): string {
  const { report, historyIds, scopeSize } = opts;
  return (
    report && historyIds.includes(report.id) ? 'share' :
    report ? 'review' :
    scopeSize > 0 ? 'draft' :
    'collect'
  );
}

describe('Docs flow step inference', () => {
  it('shows draft when no docs exist', () => {
    expect(inferDocsStep({ docsLength: 0, editing: false })).toBe('draft');
  });

  it('shows review when editing is active', () => {
    expect(inferDocsStep({ docsLength: 3, editing: true })).toBe('review');
  });

  it('shows archive when docs exist and not editing', () => {
    expect(inferDocsStep({ docsLength: 5, editing: false })).toBe('archive');
  });
});

describe('Report flow step inference', () => {
  it('shows collect when no scope selected', () => {
    expect(inferReportStep({ report: null, historyIds: [], scopeSize: 0 })).toBe('collect');
  });

  it('shows draft when scope selected but no report', () => {
    expect(inferReportStep({ report: null, historyIds: [], scopeSize: 2 })).toBe('draft');
  });

  it('shows review when report generated but not yet in history', () => {
    expect(inferReportStep({ report: { id: 'r1' }, historyIds: ['r0'], scopeSize: 2 })).toBe('review');
  });

  it('shows share when report is saved in history', () => {
    expect(inferReportStep({ report: { id: 'r1' }, historyIds: ['r0', 'r1'], scopeSize: 2 })).toBe('share');
  });
});

function inferIssueStep(opts: {
  issuesLength: number;
  newCount: number;
  inProgressCount: number;
  inReviewCount: number;
  resolvedCount: number;
}): string {
  const { issuesLength, newCount, inProgressCount, inReviewCount, resolvedCount } = opts;
  return (
    issuesLength === 0 ? 'open' :
    newCount > 0 ? 'triage' :
    inProgressCount > 0 ? 'in-progress' :
    inReviewCount > 0 ? 'verify' :
    resolvedCount === issuesLength ? 'closed' :
    'triage'
  );
}

function inferTaskStep(opts: { reviewCount: number; doingCount: number; doneCount: number; allCount: number }): string {
  const { reviewCount, doingCount, doneCount, allCount } = opts;
  return (
    reviewCount > 0 ? 'review' :
    doingCount > 0 ? 'doing' :
    allCount === 0 ? 'create' :
    doneCount === allCount ? 'done' :
    'create'
  );
}

function inferGanttStep(opts: {
  tasksLength: number;
  doneCount: number;
  reviewCount: number;
  inProgressCount: number;
}): string {
  const { tasksLength, doneCount, reviewCount, inProgressCount } = opts;
  if (tasksLength === 0) return 'plan';
  if (doneCount === tasksLength) return 'closeout';
  if (reviewCount > 0) return 'review';
  if (inProgressCount > 0) return 'execute';
  return 'kickoff';
}

function inferApprovalStep(opts: { inboxCount: number; sentCount: number }): string {
  const { inboxCount, sentCount } = opts;
  return inboxCount > 0 ? 'review' : sentCount > 0 ? 'submit' : 'draft';
}

describe('Issue flow step inference', () => {
  it('shows open when no issues exist (prompts to register first issue)', () => {
    expect(inferIssueStep({ issuesLength: 0, newCount: 0, inProgressCount: 0, inReviewCount: 0, resolvedCount: 0 })).toBe('open');
  });

  it('shows triage when open/untriaged issues need assignment', () => {
    expect(inferIssueStep({ issuesLength: 3, newCount: 2, inProgressCount: 1, inReviewCount: 0, resolvedCount: 0 })).toBe('triage');
  });

  it('shows in-progress when issues are being worked on', () => {
    expect(inferIssueStep({ issuesLength: 3, newCount: 0, inProgressCount: 2, inReviewCount: 0, resolvedCount: 0 })).toBe('in-progress');
  });

  it('shows verify when issues are awaiting review', () => {
    expect(inferIssueStep({ issuesLength: 2, newCount: 0, inProgressCount: 0, inReviewCount: 1, resolvedCount: 0 })).toBe('verify');
  });

  it('shows closed when all issues are resolved', () => {
    expect(inferIssueStep({ issuesLength: 4, newCount: 0, inProgressCount: 0, inReviewCount: 0, resolvedCount: 4 })).toBe('closed');
  });

  it('shows triage when issues exist but none started yet', () => {
    expect(inferIssueStep({ issuesLength: 2, newCount: 0, inProgressCount: 0, inReviewCount: 0, resolvedCount: 0 })).toBe('triage');
  });
});

describe('Task flow step inference', () => {
  it('shows create when board is empty (prompts to create first task)', () => {
    expect(inferTaskStep({ reviewCount: 0, doingCount: 0, doneCount: 0, allCount: 0 })).toBe('create');
  });

  it('shows create when tasks exist but none started', () => {
    expect(inferTaskStep({ reviewCount: 0, doingCount: 0, doneCount: 0, allCount: 3 })).toBe('create');
  });

  it('shows doing when tasks are in progress', () => {
    expect(inferTaskStep({ reviewCount: 0, doingCount: 2, doneCount: 1, allCount: 4 })).toBe('doing');
  });

  it('shows review when tasks await review (takes priority over doing)', () => {
    expect(inferTaskStep({ reviewCount: 1, doingCount: 2, doneCount: 0, allCount: 4 })).toBe('review');
  });

  it('shows done when all tasks are completed', () => {
    expect(inferTaskStep({ reviewCount: 0, doingCount: 0, doneCount: 5, allCount: 5 })).toBe('done');
  });
});

describe('Gantt flow step inference', () => {
  it('shows plan when no tasks exist', () => {
    expect(inferGanttStep({ tasksLength: 0, doneCount: 0, reviewCount: 0, inProgressCount: 0 })).toBe('plan');
  });

  it('shows kickoff when tasks exist but none started', () => {
    expect(inferGanttStep({ tasksLength: 3, doneCount: 0, reviewCount: 0, inProgressCount: 0 })).toBe('kickoff');
  });

  it('shows execute when tasks are in progress', () => {
    expect(inferGanttStep({ tasksLength: 4, doneCount: 1, reviewCount: 0, inProgressCount: 2 })).toBe('execute');
  });

  it('shows review when tasks are in review (takes priority over execute)', () => {
    expect(inferGanttStep({ tasksLength: 4, doneCount: 1, reviewCount: 1, inProgressCount: 2 })).toBe('review');
  });

  it('shows closeout when all tasks are done', () => {
    expect(inferGanttStep({ tasksLength: 5, doneCount: 5, reviewCount: 0, inProgressCount: 0 })).toBe('closeout');
  });
});

describe('Approval flow step inference', () => {
  it('shows draft when no approvals exist', () => {
    expect(inferApprovalStep({ inboxCount: 0, sentCount: 0 })).toBe('draft');
  });

  it('shows submit when the user has sent approvals', () => {
    expect(inferApprovalStep({ inboxCount: 0, sentCount: 2 })).toBe('submit');
  });

  it('shows review when the user has approvals to process', () => {
    expect(inferApprovalStep({ inboxCount: 3, sentCount: 1 })).toBe('review');
  });

  it('inbox takes priority over sent', () => {
    expect(inferApprovalStep({ inboxCount: 1, sentCount: 5 })).toBe('review');
  });
});
