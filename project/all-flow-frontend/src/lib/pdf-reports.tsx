/**
 * React-PDF — 주간/월간 보고 PDF 다운로드.
 *
 * 사용:
 *   <PDFDownloadLink document={<WeeklyReportPDF report={data} />} fileName="weekly.pdf">
 *     PDF 다운로드
 *   </PDFDownloadLink>
 */
'use client';

import {
  Document, Page, Text, View, StyleSheet, Font, PDFDownloadLink,
} from '@react-pdf/renderer';
import type { Report } from '@/lib/schemas';

/* Pretendard 폰트 등록 — CDN 경로 (CORS 허용) ----------------------------- */
Font.register({
  family: 'Pretendard',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Regular.otf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Medium.otf', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-SemiBold.otf', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Bold.otf', fontWeight: 700 },
  ],
});

const C = {
  ink: '#0F172A', muted: '#64748B', faint: '#94A3B8',
  border: '#E2E8F0', soft: '#F8FAFC',
  accent: '#3B82F6', accentSoft: '#EFF6FF',
  up: '#16A34A', down: '#DC2626', flat: '#64748B',
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 48, paddingHorizontal: 56, fontFamily: 'Pretendard', fontSize: 10, color: C.ink, lineHeight: 1.55 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' },
  brand: { fontSize: 9, color: C.muted, letterSpacing: 1.5, fontWeight: 600 },
  title: { fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 6, letterSpacing: -0.3 },
  period: { fontSize: 10, color: C.muted, marginTop: 4 },
  meta: { fontSize: 9, color: C.faint, textAlign: 'right' },
  metaB: { fontSize: 9, color: C.muted, marginTop: 2 },

  tldr: { backgroundColor: C.accentSoft, padding: 16, borderRadius: 6, marginBottom: 24 },
  tldrLabel: { fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 6 },
  tldrText: { fontSize: 11, color: C.ink, lineHeight: 1.6 },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  kpiCard: { flex: 1, padding: 12, borderWidth: 1, borderColor: C.border, borderStyle: 'solid', borderRadius: 6 },
  kpiLabel: { fontSize: 8, color: C.muted, marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: 700, color: C.ink },
  kpiDelta: { fontSize: 9, marginTop: 2 },

  section: { marginBottom: 18 },
  sectionHead: { fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.border, borderBottomStyle: 'solid' },
  sectionBody: { fontSize: 10, color: C.ink, lineHeight: 1.65 },
  citationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  citation: { fontSize: 7.5, color: C.muted, backgroundColor: C.soft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },

  footer: { position: 'absolute', bottom: 24, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: C.faint },
});

function deltaStyle(dir?: string) {
  if (dir === 'up') return { color: C.up };
  if (dir === 'down') return { color: C.down };
  return { color: C.flat };
}

function ReportPDF({ report }: { report: Report }) {
  const kindLabel = report.kind === 'weekly' ? '주간 보고' : '월간 보고';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ALL-FLOW · {kindLabel.toUpperCase()}</Text>
            <Text style={styles.title}>{kindLabel} · {report.periodStart} ~ {report.periodEnd}</Text>
            <Text style={styles.period}>오믈렛 사내 협업 시스템 자동 생성</Text>
          </View>
          <View>
            <Text style={styles.meta}>생성: {new Date(report.generatedAt).toLocaleString('ko-KR')}</Text>
            {report.author && <Text style={styles.metaB}>{report.author}</Text>}
          </View>
        </View>

        {report.tldr && (
          <View style={styles.tldr}>
            <Text style={styles.tldrLabel}>TL;DR</Text>
            <Text style={styles.tldrText}>{report.tldr}</Text>
          </View>
        )}

        {report.kpis && report.kpis.length > 0 && (
          <View style={styles.kpiRow}>
            {report.kpis.slice(0, 4).map((k, i) => (
              <View key={i} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
                {k.delta && (
                  <Text style={[styles.kpiDelta, deltaStyle(k.dir)]}>
                    {k.dir === 'up' ? '↑' : k.dir === 'down' ? '↓' : '→'} {k.delta}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {report.sections.map((s, i) => (
          <View key={i} style={styles.section} wrap={false}>
            <Text style={styles.sectionHead}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
            {s.citations && s.citations.length > 0 && (
              <View style={styles.citationRow}>
                {s.citations.map((c, j) => (
                  <Text key={j} style={styles.citation}>
                    {c.label ?? `${c.kind}:${c.id}`}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>© Omelet — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function WeeklyReportPDF({ report }: { report: Report }) {
  return <ReportPDF report={report} />;
}
export function MonthlyReportPDF({ report }: { report: Report }) {
  return <ReportPDF report={report} />;
}

/* 다운로드 버튼 컴포넌트 ------------------------------------------------- */
export function ReportDownloadButton({
  report,
  fileName,
  className,
  children,
}: {
  report: Report;
  fileName: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <PDFDownloadLink
      document={<ReportPDF report={report} />}
      fileName={fileName}
      className={className}
    >
      {({ loading }) => (loading ? 'PDF 생성 중...' : (children ?? 'PDF 다운로드'))}
    </PDFDownloadLink>
  );
}
