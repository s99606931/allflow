'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardBody, Button } from '@/components/ui/primitives';
import { Download, Send, Sparkles, ExternalLink } from 'lucide-react';
import { ReportRecipientsEditor } from '@/components/dialogs/report-recipients-editor';
import { useAiMutations, useReports } from '@/lib/hooks/use-data';
import type { Report } from '@/lib/schemas';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';
import { BusinessFlowStepper } from '@/components/ai/business-flow-stepper';
import { BUSINESS_FLOWS } from '@/lib/business-flows';
import { useRouter } from 'next/navigation';

const ReportDownloadButton = dynamic(
  () => import('@/lib/pdf-reports').then(m => m.ReportDownloadButton),
  { ssr: false, loading: () => <Button variant="secondary" size="sm" disabled><Download size={13} /> PDF 준비 중...</Button> },
);

function lastMonth(): { year: number; month: number; label: string } {
  const now = new Date();
  const m = now.getMonth(); // 0-based; "last" = current month-1, with year rollover
  const y = m === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const realMonth = m === 0 ? 12 : m;
  return { year: y, month: realMonth, label: `${y}년 ${realMonth}월` };
}

export function ReportMonthlyPage() {
  const [sendOpen, setSendOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const { monthlyReport } = useAiMutations();
  const { data: history = [] } = useReports();
  const period = lastMonth();
  const router = useRouter();
  const monthlyFlowStep =
    report && history.some(r => r.id === report.id) ? 'share' :
    report ? 'review' :
    'collect';

  const onGenerate = async () => {
    const r = await monthlyReport.mutateAsync({ year: period.year, month: period.month });
    setReport(r);
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <BusinessFlowStepper
        flow={BUSINESS_FLOWS.report}
        currentStepId={monthlyFlowStep}
        systemContext={`월간 보고 ${period.label} ${report ? '(생성됨)' : '(미생성)'}`}
        onStepSelect={(step) => router.push(step.screen)}
        enableServerSync
      />
      {(() => {
        const firstKpi = report?.kpis?.[0];
        const secondKpi = report?.kpis?.[1];
        const downKpis = report?.kpis?.filter(k => k.dir === 'down') ?? [];
        const sectionCount = report?.sections?.length ?? 0;

        const systemContext = report
          ? `월간 보고 — ${period.label} | 보고서 생성됨 | 섹션 ${sectionCount}개${firstKpi ? ` | ${firstKpi.label}: ${firstKpi.value}${firstKpi.delta ? ` (${firstKpi.delta})` : ''}` : ''}${secondKpi ? ` | ${secondKpi.label}: ${secondKpi.value}${secondKpi.delta ? ` (${secondKpi.delta})` : ''}` : ''}`
          : `월간 보고 — ${period.label} | 보고서 미생성 | ${period.year}년 ${period.month}월`;

        const downHint = downKpis.length > 0
          ? `KPI 하락 원인 분석해줘 — ${downKpis.map(k => k.label).join(', ')} 하락 중`
          : null;

        const hints: string[] = report
          ? [
              `${period.label} 보고서 핵심 인사이트 요약해줘`,
              downHint ?? (firstKpi ? `${firstKpi.label} KPI 달성률 분석해줘` : 'KPI 달성률 분석해줘'),
              '개선 포인트 제안해줘',
            ]
          : [
              `${period.label} AI 보고서 생성 도와줘`,
              '이번 달 핵심 성과 찾아줘',
              '개선 포인트 제안해줘',
            ];

        return (
          <AiGuideWidget
            systemContext={systemContext}
            hints={hints}
            quickActions={[
              ...(!report ? [{ label: 'AI 보고서 생성', onClick: onGenerate }] : []),
              ...(report ? [{ label: '이메일 발송', onClick: () => setSendOpen(true) }] : []),
            ]}
          />
        );
      })()}
      <div className="flex items-center gap-2">
        <h2 className="text-[16px] font-bold text-fg flex-1" suppressHydrationWarning>월간 보고 — {period.label}</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onGenerate}
          disabled={monthlyReport.isPending}
        >
          <Sparkles size={13} /> {monthlyReport.isPending ? '생성 중…' : 'AI 생성'}
        </Button>
        {report && (
          <>
            <ReportDownloadButton
              report={report}
              fileName={`monthly-report-${report.periodStart.slice(0, 7)}.pdf`}
              className="inline-flex items-center justify-center font-medium rounded-md transition-colors h-7 px-2.5 text-[12.5px] gap-1.5 bg-bg-elev border border-border text-fg-1 hover:bg-hover hover:border-border-strong"
            >
              <Download size={13} /> PDF
            </ReportDownloadButton>
            <Button variant="secondary" size="sm" onClick={() => setSendOpen(true)}><Send size={13} /> 임원진 발송</Button>
            <ReportRecipientsEditor
              open={sendOpen}
              onOpenChange={setSendOpen}
              reportId={report.id}
              defaultRecipients={['exec@allflow.io', 'board@allflow.io']}
            />
          </>
        )}
      </div>

      {!report && (
        <Card>
          <CardBody className="text-center py-16 space-y-2">
            {monthlyReport.isPending ? (
              <div className="text-[13px] text-fg-3">AI가 월간 보고서를 생성하고 있습니다...</div>
            ) : (
              <>
                <div className="text-[13px] font-semibold text-fg">월간 보고서가 없습니다</div>
                <div className="text-[12px] text-fg-3 max-w-sm mx-auto">
                  &lsquo;AI 생성&rsquo;을 클릭하면 {period.label} 데이터를 바탕으로 KPI·팀 성과·이슈 통계가 포함된 임원진 보고서를 생성합니다.
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {report && (
        <Card>
          <CardBody className="!p-10 space-y-8">
            <div>
              <div className="text-[11px] text-fg-3 uppercase tracking-wider font-semibold">EXECUTIVE SUMMARY · 임원진 발송용</div>
              <h1 className="text-[28px] font-bold text-fg mt-1 tracking-tight">{period.label} 월간 보고</h1>
              {report.tldr && <p className="text-[14px] text-fg-1 mt-3 leading-relaxed">{report.tldr}</p>}
            </div>

            {report.kpis && report.kpis.length > 0 && (
              <div>
                <h3 className="text-[16px] font-bold text-fg mb-3">핵심 메트릭</h3>
                <div className="grid grid-cols-3 gap-3">
                  {report.kpis.map(k => {
                    const href = /태스크|task/i.test(k.label) ? '/tasks'
                      : /이슈|issue/i.test(k.label) ? '/issues'
                      : /프로젝트|project/i.test(k.label) ? '/projects'
                      : /멤버|사용자|user/i.test(k.label) ? '/users'
                      : null;
                    const inner = (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-fg-2">{k.label}</div>
                          {href && <ExternalLink size={10} className="text-fg-3 opacity-0 group-hover/kpi:opacity-100 transition-opacity" />}
                        </div>
                        <div className="text-[28px] font-bold mono mt-1 text-fg">{k.value}</div>
                        {k.delta && <div className={`text-[12px] mono mt-0.5 ${k.dir === 'up' ? 'text-success' : k.dir === 'down' ? 'text-danger' : 'text-fg-3'}`}>{k.delta}</div>}
                      </>
                    );
                    return href ? (
                      <Link key={k.label} href={href} className="group/kpi block rounded-lg border border-border p-4 hover:border-accent/50 hover:bg-accent-soft/20 transition-colors">
                        {inner}
                      </Link>
                    ) : (
                      <div key={k.label} className="rounded-lg border border-border p-4">
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {report.sections.map(s => (
              <div key={s.heading}>
                <h3 className="text-[16px] font-bold text-fg mb-3">{s.heading}</h3>
                <p className="text-[14px] text-fg-1 leading-[1.8] whitespace-pre-wrap">{s.body}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {history.filter(r => r.kind === 'monthly').length > 0 && (
        <Card>
          <CardBody className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-fg-3 font-semibold mb-2">이전 월간 보고서</div>
            <div className="flex flex-wrap gap-2">
              {history.filter(r => r.kind === 'monthly').slice(0, 6).map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReport(r as unknown as Report)}
                  className="px-3 py-1.5 rounded-md border border-border bg-bg-1 hover:bg-hover transition-colors text-[12px] text-fg-1 mono"
                >
                  {r.periodStart.slice(0, 7)}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
