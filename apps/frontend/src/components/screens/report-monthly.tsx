'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardBody, Button } from '@/components/ui/primitives';
import { Download, Send, Sparkles } from 'lucide-react';
import { ReportRecipientsEditor } from '@/components/dialogs/report-recipients-editor';
import { useAiMutations } from '@/lib/hooks/use-data';
import type { Report } from '@/lib/schemas';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

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
  const period = lastMonth();

  const onGenerate = async () => {
    const r = await monthlyReport.mutateAsync({ year: period.year, month: period.month });
    setReport(r);
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <AiGuideWidget
        systemContext={`월간 보고 — ${period.label} KPI·팀 성과·이슈 통계 임원진 리포트`}
        hints={['이번 달 핵심 성과 찾아줘', 'KPI 달성률 분석해줘', '개선 포인트 제안해줘']}
      />
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
                  {report.kpis.map(k => (
                    <div key={k.label} className="rounded-lg border border-border p-4">
                      <div className="text-[11px] text-fg-2">{k.label}</div>
                      <div className="text-[28px] font-bold mono mt-1 text-fg">{k.value}</div>
                      {k.delta && <div className={`text-[12px] mono mt-0.5 ${k.dir === 'up' ? 'text-success' : k.dir === 'down' ? 'text-danger' : 'text-fg-3'}`}>{k.delta}</div>}
                    </div>
                  ))}
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
    </div>
  );
}
