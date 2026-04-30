/**
 * Report builder — KPI/section 생성 핵심 로직.
 *
 * T-404 (weekly), T-405 (monthly) 공통 기반.
 *  - DB(Prisma) 에서 기간별 task/issue 집계 → KPIs
 *  - AI adapter 로 sections 본문 생성 (실패해도 deterministic fallback)
 *  - 본문에 [task:id] / [issue:id] 인용 마커가 들어가면 citations 로 추출
 *
 * 네이밍:
 *  - "scope" = 프로젝트 ID 화이트리스트(weekly), monthly 는 전체 권한 범위.
 *  - "tone"  = exec | team | casual (출력 어조).
 */

import { extractCitations } from '../ai/ai.routes.js';
import type { AIAdapter } from '../ai/ai-adapter.js';

export type ReportTone = 'exec' | 'team' | 'casual';

export interface ReportPrismaClient {
  task: {
    findMany(args: ReportTaskArgs): Promise<ReportTask[]>;
  };
  issue: {
    findMany(args: ReportIssueArgs): Promise<ReportIssue[]>;
  };
}

export interface ReportTask {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done' | 'blocked';
  priority: 'high' | 'med' | 'low';
  projectId: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface ReportIssue {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'in_review' | 'resolved';
  prio: 'P0' | 'P1' | 'P2' | 'P3';
  sev: 'critical' | 'high' | 'med' | 'low';
  resolved: boolean;
  projectId: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface ReportTaskArgs {
  where: {
    deletedAt: null;
    updatedAt: { gte: Date; lte: Date };
    projectId?: { in: string[] };
  };
  select: {
    id: true;
    title: true;
    status: true;
    priority: true;
    projectId: true;
    updatedAt: true;
    createdAt: true;
  };
  take: number;
}

export interface ReportIssueArgs {
  where: {
    deletedAt: null;
    updatedAt: { gte: Date; lte: Date };
    projectId?: { in: string[] };
  };
  select: {
    id: true;
    title: true;
    status: true;
    prio: true;
    sev: true;
    resolved: true;
    projectId: true;
    updatedAt: true;
    createdAt: true;
  };
  take: number;
}

export interface BuildReportInput {
  kind: 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  scopeIds?: string[];
  tone?: ReportTone;
}

export interface ReportKPI {
  label: string;
  value: string;
  delta: string;
  dir: 'up' | 'down' | 'flat';
}

export interface ReportSection {
  heading: string;
  body: string;
  citations: { kind: string; id: string; label?: string }[];
}

export interface BuildReportOutput {
  tldr: string;
  kpis: ReportKPI[];
  sections: ReportSection[];
}

const MAX_ROWS = 500;

/**
 * 기간/스코프 기반으로 KPIs 와 sections 를 생성.
 * AI 호출은 sections 본문에서만 사용. KPI 는 deterministic 집계.
 */
export async function buildReport(
  adapter: AIAdapter,
  prisma: ReportPrismaClient,
  input: BuildReportInput,
): Promise<BuildReportOutput> {
  const tasks = await fetchTasks(prisma, input);
  const issues = await fetchIssues(prisma, input);

  const kpis = computeKpis(tasks, issues);
  const tldr = buildTldr(input.kind, tasks, issues, input.tone ?? 'team');
  const sections = await buildSections(adapter, input, tasks, issues);

  return { tldr, kpis, sections };
}

async function fetchTasks(
  prisma: ReportPrismaClient,
  input: BuildReportInput,
): Promise<ReportTask[]> {
  return prisma.task.findMany({
    where: {
      deletedAt: null,
      updatedAt: { gte: input.periodStart, lte: input.periodEnd },
      ...(input.scopeIds && input.scopeIds.length > 0 ? { projectId: { in: input.scopeIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      projectId: true,
      updatedAt: true,
      createdAt: true,
    },
    take: MAX_ROWS,
  });
}

async function fetchIssues(
  prisma: ReportPrismaClient,
  input: BuildReportInput,
): Promise<ReportIssue[]> {
  return prisma.issue.findMany({
    where: {
      deletedAt: null,
      updatedAt: { gte: input.periodStart, lte: input.periodEnd },
      ...(input.scopeIds && input.scopeIds.length > 0 ? { projectId: { in: input.scopeIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      prio: true,
      sev: true,
      resolved: true,
      projectId: true,
      updatedAt: true,
      createdAt: true,
    },
    take: MAX_ROWS,
  });
}

export function computeKpis(tasks: ReportTask[], issues: ReportIssue[]): ReportKPI[] {
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const tasksTotal = tasks.length;
  const completionPct = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);

  const issuesResolved = issues.filter((i) => i.resolved).length;
  const issuesOpen = issues.length - issuesResolved;

  const criticalCount = issues.filter((i) => i.sev === 'critical' || i.prio === 'P0').length;

  return [
    {
      label: 'Tasks 완료율',
      value: `${completionPct}%`,
      delta: `${tasksDone}/${tasksTotal}`,
      dir: completionPct >= 70 ? 'up' : completionPct >= 40 ? 'flat' : 'down',
    },
    {
      label: '미해결 이슈',
      value: String(issuesOpen),
      delta: `해결 ${issuesResolved}`,
      dir: issuesOpen === 0 ? 'flat' : issuesOpen > issuesResolved ? 'down' : 'up',
    },
    {
      label: '크리티컬 이슈',
      value: String(criticalCount),
      delta: criticalCount === 0 ? '없음' : '주의',
      dir: criticalCount === 0 ? 'flat' : 'down',
    },
  ];
}

function buildTldr(
  kind: 'weekly' | 'monthly',
  tasks: ReportTask[],
  issues: ReportIssue[],
  tone: ReportTone,
): string {
  const period = kind === 'weekly' ? '주간' : '월간';
  const done = tasks.filter((t) => t.status === 'done').length;
  const open = issues.filter((i) => !i.resolved).length;
  const adjective = tone === 'exec' ? '핵심 지표' : tone === 'casual' ? '한 줄 요약' : '요약';
  return `[${period} ${adjective}] 완료된 태스크 ${done}건, 미해결 이슈 ${open}건.`;
}

async function buildSections(
  adapter: AIAdapter,
  input: BuildReportInput,
  tasks: ReportTask[],
  issues: ReportIssue[],
): Promise<ReportSection[]> {
  const summary = formatSummary(tasks, issues);
  const tone = input.tone ?? 'team';
  const headings =
    input.kind === 'monthly'
      ? ['Executive Summary', 'OKR 진척도', '리스크 매트릭스']
      : ['하이라이트', '지연/위험 항목', '다음 주 계획'];

  const out: ReportSection[] = [];
  for (const heading of headings) {
    const body = await generateSectionBody(adapter, heading, summary, tone, input.kind);
    out.push({ heading, body, citations: extractCitations(body) });
  }
  return out;
}

async function generateSectionBody(
  adapter: AIAdapter,
  heading: string,
  summary: string,
  tone: ReportTone,
  kind: 'weekly' | 'monthly',
): Promise<string> {
  const period = kind === 'weekly' ? '주간' : '월간';
  const prompt = [
    `다음 ${period} 데이터를 기반으로 "${heading}" 섹션 본문을 작성하세요.`,
    `톤: ${tone}.`,
    '관련 항목은 [task:ID] 또는 [issue:ID] 마커로 인용하세요.',
    '',
    summary,
  ].join('\n');
  try {
    const r = await adapter.complete([{ role: 'user', content: prompt }], { traceId: heading });
    return r.text || fallbackBody(heading, summary);
  } catch {
    return fallbackBody(heading, summary);
  }
}

function fallbackBody(heading: string, summary: string): string {
  return `${heading} (자동 폴백): ${summary}`;
}

function formatSummary(tasks: ReportTask[], issues: ReportIssue[]): string {
  const taskLines = tasks
    .slice(0, 10)
    .map((t) => `- [task:${t.id}] (${t.status}) ${t.title}`)
    .join('\n');
  const issueLines = issues
    .slice(0, 10)
    .map((i) => `- [issue:${i.id}] (${i.status}/${i.prio}) ${i.title}`)
    .join('\n');
  return `Tasks (${tasks.length}):\n${taskLines || '- 없음'}\n\nIssues (${issues.length}):\n${issueLines || '- 없음'}`;
}
