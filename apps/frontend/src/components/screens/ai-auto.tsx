'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, Progress } from '@/components/ui/primitives';
import { AiChatPanel } from '@/components/ai/ai-chat-panel';
import { useAiMutations, useDocs, useProjects, useTaskMutations } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { useVoiceInput } from '@/lib/hooks/use-voice-input';
import type { ExtractedAction } from '@/lib/schemas';
import { FileText, Mail, Mic, Sparkles, Upload, Database, Wand2, X, Check, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

type Source = 'meeting' | 'email' | 'voice' | 'notion' | 'csv';

const SOURCES: { id: Source; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'meeting', label: '회의록', icon: FileText, desc: '.md / .docx / Google Docs' },
  { id: 'email', label: '이메일', icon: Mail, desc: 'Gmail · Outlook 스레드' },
  { id: 'voice', label: '음성', icon: Mic, desc: 'mp3 · m4a · 실시간 녹음' },
  { id: 'notion', label: 'Notion DB', icon: Database, desc: '6개 연결된 DB 중 선택' },
  { id: 'csv', label: 'CSV / Excel', icon: FileText, desc: '컬럼 매핑 자동 추론' },
];

type AiItem = ExtractedAction & { id: number; proj: string; source?: string };

export function AIAutoPage() {
  const projectsQuery = useProjects();
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const firstProjectId = projects[0]?.id ?? '';

  const [source, setSource] = useState<Source>('meeting');
  const [text, setText] = useState('');
  const [items, setItems] = useState<AiItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [defaultProjOverride, setDefaultProjOverride] = useState<string | null>(null);
  const defaultProj = defaultProjOverride ?? firstProjectId;

  const userMap = useUserMap();
  const onTranscript = useCallback((t: string) => setText(prev => prev ? `${prev}\n${t}` : t), []);
  const voice = useVoiceInput(onTranscript);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: docs = [] } = useDocs();
  const [recentOpen, setRecentOpen] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setText(ev.target?.result as string ?? '');
    reader.readAsText(file);
    e.target.value = '';
  }

  const ai = useAiMutations();
  const tasks = useTaskMutations();
  const extracting = ai.extractActions.isPending;
  const extracted = items.length > 0;
  const canExtract = text.trim().length > 0 && Boolean(defaultProj);

  async function runExtract() {
    if (!canExtract) return;
    const result = await ai.extractActions.mutateAsync({ source, content: text, threshold: 0.7 });
    const next: AiItem[] = result.map((r, idx) => ({
      ...r,
      id: idx + 1,
      proj: defaultProj,
      source: r.sourceQuote ? r.sourceQuote.slice(0, 16) : undefined,
    }));
    setItems(next);
    setSelected(next.map(i => i.id));
  }

  function toggleSel(id: number) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function removeItem(id: number) {
    setItems(items.filter(i => i.id !== id));
    setSelected(selected.filter(x => x !== id));
  }

  async function registerSelected() {
    const picks = items.filter(i => selected.includes(i.id));
    for (const p of picks) {
      await tasks.create.mutateAsync({
        title: p.title,
        projectId: p.proj,
        assigneeId: p.assignee || 'me',
        due: p.due,
        priority: p.priority ?? 'med',
      });
    }
    setItems([]);
    setSelected([]);
  }

  return (
    <div className="p-6 max-w-[1440px] mx-auto grid grid-cols-12 gap-5">
      {/* LEFT — input */}
      <div className="col-span-7 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>입력 소스</CardTitle>
            <Badge tone="accent"><Sparkles size={10} /> AI</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {SOURCES.map(s => {
                const active = source === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      active ? 'border-accent bg-accent-soft' : 'border-border bg-bg-1 hover:border-border-strong'
                    }`}
                  >
                    <s.icon size={16} className={active ? 'text-accent-strong' : 'text-fg-2'} />
                    <div className={`text-[12px] font-semibold mt-1.5 ${active ? 'text-accent-strong' : 'text-fg'}`}>{s.label}</div>
                    <div className="text-[10.5px] text-fg-3 mt-0.5">{s.desc}</div>
                  </button>
                );
              })}
            </div>

            {source === 'meeting' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-medium text-fg-1">회의록 본문</div>
                  <div className="flex gap-1.5 relative">
                    <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.doc" className="hidden" onChange={handleFileUpload} />
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={12} /> 파일</Button>
                    <div className="relative">
                      <Button variant="secondary" size="sm" onClick={() => setRecentOpen(v => !v)}>최근 회의록</Button>
                      {recentOpen && docs.length > 0 && (
                        <div className="absolute right-0 top-full mt-1 z-10 w-56 rounded-lg border border-border bg-bg-elev shadow-lg py-1 max-h-48 overflow-y-auto">
                          {docs.slice(0, 10).map(d => (
                            <button
                              key={d.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-[12px] text-fg-1 hover:bg-hover truncate"
                              onClick={() => { setText(d.preview ?? d.title); setRecentOpen(false); }}
                            >{d.title}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={14}
                  placeholder="회의록을 붙여넣거나 파일을 업로드하세요."
                  className="w-full resize-none rounded-md bg-bg-1 border border-border px-3 py-2.5 text-[12.5px] mono leading-relaxed focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
                <div className="flex justify-between text-[11px] text-fg-3 mt-1">
                  <span>{text.length} 글자 · 약 {Math.ceil(text.length / 350) || 0}분 분량</span>
                  <span>한국어 자동 감지</span>
                </div>
              </div>
            )}

            {source === 'voice' && (
              <div className="rounded-lg border-2 border-dashed border-border-strong p-8 text-center">
                <FileAudio size={28} className="mx-auto text-fg-3" />
                <div className="text-[13px] font-medium text-fg mt-2">음성 파일 드롭 또는 실시간 녹음</div>
                <div className="text-[11.5px] text-fg-3 mt-1">최대 60분 · Whisper-large-v3 자동 전사</div>
                <Button
                  variant={voice.listening ? 'secondary' : 'primary'}
                  size="sm"
                  className="mt-3"
                  onClick={voice.listening ? voice.stop : voice.start}
                  disabled={!voice.supported}
                >
                  <Mic size={12} /> {voice.listening ? '녹음 중지' : '녹음 시작'}
                </Button>
              </div>
            )}

            {(source === 'email' || source === 'notion' || source === 'csv') && (
              <div className="rounded-lg border-2 border-dashed border-border-strong p-8 text-center">
                <Upload size={24} className="mx-auto text-fg-3" />
                <div className="text-[13px] font-medium text-fg mt-2">소스 연결</div>
                <div className="text-[11.5px] text-fg-3 mt-1">{SOURCES.find(s => s.id === source)?.desc}</div>
                <Button variant="primary" size="sm" className="mt-3" onClick={() => toast.info('설정 > 통합 연결에서 외부 소스를 연결하세요.')}>연결하기</Button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1">
                <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1">기본 프로젝트</div>
                <select
                  value={defaultProj}
                  onChange={e => setDefaultProjOverride(e.target.value)}
                  disabled={projectsQuery.isLoading || projects.length === 0}
                  className="w-full h-8 px-2 rounded-md bg-bg-1 border border-border text-[12.5px] focus:outline-none focus:border-accent"
                >
                  {projects.length === 0 && (
                    <option value="">{projectsQuery.isLoading ? '로딩 중...' : '프로젝트 없음'}</option>
                  )}
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1">신뢰도 임계</div>
                <select className="w-full h-8 px-2 rounded-md bg-bg-1 border border-border text-[12.5px]">
                  <option>0.7 이상 (균형)</option>
                  <option>0.85 이상 (보수)</option>
                  <option>0.5 이상 (포괄)</option>
                </select>
              </div>
              <Button variant="primary" onClick={runExtract} disabled={extracting || !canExtract} className="self-end h-9">
                {extracting ? <><Wand2 size={13} className="animate-pulse" /> 추출 중...</> : <><Sparkles size={13} /> 액션 아이템 추출</>}
              </Button>
            </div>
          </CardBody>
        </Card>

        <AiChatPanel />
      </div>

      {/* RIGHT — extracted items */}
      <div className="col-span-5 space-y-4">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>추출된 액션 아이템</CardTitle>
            {extracted && <Badge tone="success">{items.length}개 발견</Badge>}
          </CardHeader>
          <CardBody>
            {!extracted && !extracting && (
              <div className="py-12 text-center text-fg-3">
                <Sparkles size={28} className="mx-auto opacity-30" />
                <div className="text-[12.5px] mt-2">왼쪽에서 입력 후 추출 버튼을 눌러주세요</div>
              </div>
            )}
            {extracting && (
              <div className="py-12 text-center">
                <div className="w-8 h-8 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <div className="text-[12.5px] mt-3 text-fg-1">회의록 분석 중...</div>
                <div className="text-[11px] mt-1 text-fg-3">화자 분리 → 의도 분류 → 담당자/마감 추론</div>
              </div>
            )}
            {extracted && (
              <div className="space-y-2">
                {items.map(item => {
                  const u = userMap.get(item.assignee);
                  const proj = projects.find(p => p.id === item.proj);
                  const sel = selected.includes(item.id);
                  return (
                    <div key={item.id} className={`rounded-lg border p-3 transition-colors ${sel ? 'border-accent bg-accent-soft' : 'border-border bg-bg-1'}`}>
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => toggleSel(item.id)}
                          className={`w-4 h-4 rounded border-2 mt-0.5 grid place-items-center shrink-0 transition-colors ${sel ? 'bg-accent border-accent' : 'border-border-strong'}`}
                        >
                          {sel && <Check size={10} className="text-accent-fg" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-fg leading-snug">{item.title}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {proj && <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white" style={{ background: proj.color }}>{proj.code}</span>}
                            {u && <span className="inline-flex items-center gap-1"><Avatar user={u} size={16} /><span className="text-[11px] text-fg-1">{u.name}</span></span>}
                            <span className="text-[11px] mono text-fg-2">{item.due}</span>
                            {item.priority === 'high' && <Badge tone="danger">높음</Badge>}
                            {item.priority === 'med' && <Badge tone="warning">중간</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 flex items-center gap-1.5">
                              <span className="text-[10px] text-fg-3">신뢰도</span>
                              <Progress value={item.confidence * 100} className="flex-1 max-w-[80px] !h-1" tone={item.confidence >= 0.9 ? 'success' : 'warning'} />
                              <span className={`text-[10.5px] mono font-semibold ${item.confidence >= 0.9 ? 'text-success' : 'text-warning'}`}>{Math.round(item.confidence * 100)}%</span>
                            </div>
                            {item.source && <button className="text-[10.5px] text-accent-strong hover:underline">근거: {item.source}</button>}
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-fg-3 hover:text-danger" aria-label="제거">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-border flex items-center gap-2 mt-4">
                  <span className="text-[12px] text-fg-2 flex-1">{selected.length}개 선택됨</span>
                  <Button variant="secondary" size="sm" onClick={() => setItems([])}>초기화</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={tasks.create.isPending || selected.length === 0}
                    onClick={registerSelected}
                  >
                    {tasks.create.isPending ? '등록 중...' : `${selected.length}개 모두 등록`}
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
