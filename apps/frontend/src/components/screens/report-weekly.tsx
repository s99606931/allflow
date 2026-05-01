'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui/primitives';
import { Calendar, Download, RefreshCw, Send, Sparkles } from 'lucide-react';
import { ReportRecipientsEditor } from '@/components/dialogs/report-recipients-editor';
import { useAiMutations, useProjects } from '@/lib/hooks/use-data';
import type { Report } from '@/lib/schemas';

const ReportDownloadButton = dynamic(
  () => import('@/lib/pdf-reports').then(m => m.ReportDownloadButton),
  { ssr: false, loading: () => <Button variant="secondary" size="sm" disabled><Download size={13} /> PDF 준비 중...</Button> },
);

/** Compute Mon-Sun window of the most recently completed week (yyyy-mm-dd). */
function computeLastWeek(): { start: string; end: string } {
  const now = new Date();
  const dow = now.getDay();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((dow + 6) % 7) - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  return {
    start: lastMonday.toISOString().slice(0, 10),
    end: lastSunday.toISOString().slice(0, 10),
  };
}

export function ReportWeeklyPage() {
  const [sendOpen, setSendOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [reportType, setReportType] = useState<'주간' | '격주' | '월간'>('주간');
  const period = useMemo(() => computeLastWeek(), []);
  const { weeklyReport } = useAiMutations();
  const { data: projects = [] } = useProjects();
  const [scope, setScope] = useState<Set<string>>(new Set());

  const onGenerate = async () => {
    const r = await weeklyReport.mutateAsync({
      periodStart: period.start,
      periodEnd: period.end,
      scopeIds: Array.from(scope),
      tone: 'exec',
    });
    setReport(r);
  };

  return (
    <div className="p-6 grid grid-cols-12 gap-5 max-w-[1440px] mx-auto">
      <div className="col-span-4 space-y-4">
        <Card>
          <CardHeader><CardTitle>보고 설정</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">유형</div>
              <div className="flex gap-1 p-0.5 rounded-md bg-bg-2 border border-border">
                {(['주간', '격주', '월간'] as const).map(c => (
                  <button key={c} onClick={() => setReportType(c)} className={`flex-1 h-7 rounded text-[12px] font-medium transition-colors ${reportType === c ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-2 hover:text-fg-1'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">기간</div>
              <div className="flex items-center gap-2 text-[12px] text-fg-1 px-3 py-2 rounded-md border border-border bg-bg-1">
                <Calendar size={12} /><span className="mono">{period.start} — {period.end}</span>
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1.5">대상 범위</div>
              {projects.length === 0 && <div className="text-[12px] text-fg-3 py-1">프로젝트가 없습니다.</div>}
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-[12.5px] text-fg-1 py-1">
                  <input
                    type="checkbox"
                    checked={scope.has(p.id)}
                    onChange={e => setScope(prev => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(p.id); else next.delete(p.id);
                      return next;
                    })}
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={onGenerate}
              disabled={weeklyReport.isPending}
            >
              <Sparkles size={13} /> {weeklyReport.isPending ? 'AI 생성 중...' : '보고서 생성'}
            </Button>
          </CardBody>
        </Card>
      </div>

      <div className="col-span-8 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-fg flex-1">미리보기</h2>
          <Button variant="secondary" size="sm" onClick={onGenerate} disabled={weeklyReport.isPending}>
            <RefreshCw size={13} /> AI 다시 생성
          </Button>
          {report && (
            <>
              <ReportDownloadButton
                report={report}
                fileName={`weekly-report-${report.periodStart}.pdf`}
                className="inline-flex items-center justify-center font-medium rounded-md transition-colors h-7 px-2.5 text-[12.5px] gap-1.5 bg-bg-elev border border-border text-fg-1 hover:bg-hover hover:border-border-strong"
              >
                <Download size={13} /> PDF
              </ReportDownloadButton>
              <Button variant="primary" size="sm" onClick={() => setSendOpen(true)}><Send size={13} /> 발송</Button>
              <ReportRecipientsEditor
                open={sendOpen}
                onOpenChange={setSendOpen}
                reportId={report.id}
                defaultRecipients={['exec@allflow.io']}
              />
            </>
          )}
        </div>

        {!report && (
          <Card>
            <CardBody className="text-center py-16 text-[13px] text-fg-3">
              {weeklyReport.isPending ? 'AI가 주간 보고서를 작성하고 있습니다...' : '왼쪽에서 범위와 옵션을 선택하고 &lsquo;보고서 생성&rsquo;을 클릭하세요.'}
            </CardBody>
          </Card>
        )}

        {report && (
          <Card>
            <CardBody className="space-y-6 !p-8">
              <div>
                <div className="text-[11px] text-fg-3 uppercase tracking-wider font-semibold">주간 보고</div>
                <h1 className="text-[24px] font-bold text-fg mt-1 tracking-tight">{report.periodStart} ~ {report.periodEnd}</h1>
              </div>

              {report.tldr && (
                <div className="rounded-lg bg-accent-soft border border-accent/20 p-4">
                  <div className="flex items-center gap-2 mb-2"><Sparkles size={13} className="text-accent-strong" /><span className="text-[12px] font-semibold text-accent-strong">TL;DR</span></div>
                  <p className="text-[13px] text-fg-1 leading-relaxed">{report.tldr}</p>
                </div>
              )}

              {report.kpis && report.kpis.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-bold text-fg mb-3">KPI</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {report.kpis.map(m => (
                      <div key={m.label} className="rounded-md border border-border p-3">
                        <div className="text-[10.5px] text-fg-3">{m.label}</div>
                        <div className="text-[20px] font-bold mono mt-0.5">{m.value}</div>
                        {m.delta && <div className={`text-[10.5px] mono ${m.dir === 'up' ? 'text-success' : m.dir === 'down' ? 'text-danger' : 'text-fg-3'}`}>{m.delta}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.sections.map(s => (
                <div key={s.heading}>
                  <h3 className="text-[14px] font-bold text-fg mb-2">{s.heading}</h3>
                  <p className="text-[13px] text-fg-1 leading-[1.7] whitespace-pre-wrap">{s.body}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
