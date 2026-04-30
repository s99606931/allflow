'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Avatar, Badge, Button, Progress } from '@/components/ui/primitives';
import { AiChatPanel } from '@/components/ai/ai-chat-panel';
import { PROJECTS, userById } from '@/lib/fixtures';
import { useAiMutations, useTaskMutations } from '@/lib/hooks/use-data';
import type { ExtractedAction } from '@/lib/schemas';
import { FileText, Mail, Mic, Sparkles, Upload, Database, Wand2, X, Check, ChevronRight, FileAudio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Source = 'meeting' | 'email' | 'voice' | 'notion' | 'csv';

const SOURCES: { id: Source; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'meeting', label: '회의록', icon: FileText, desc: '.md / .docx / Google Docs' },
  { id: 'email', label: '이메일', icon: Mail, desc: 'Gmail · Outlook 스레드' },
  { id: 'voice', label: '음성', icon: Mic, desc: 'mp3 · m4a · 실시간 녹음' },
  { id: 'notion', label: 'Notion DB', icon: Database, desc: '6개 연결된 DB 중 선택' },
  { id: 'csv', label: 'CSV / Excel', icon: FileText, desc: '컬럼 매핑 자동 추론' },
];

const SAMPLE_TRANSCRIPT = `[2026-04-28 화 10:00 / 모바일 앱 v3.0 주간 동기화]
참석: 김지우, 박서연, 이도현, 정태훈

지우: 온보딩 인터랙션 프로토타입 진행 어떻게 되어 가나요?
서연: v2 시안은 오늘 오후 공유드릴게요. 다크모드 검수가 남았습니다.
도현: 프론트 측에서는 T-1029 (iOS 푸시 카테고리 액션)이 차단 상태예요.
태훈: APNs 인증서가 만료된 게 원인입니다. 내일까지 갱신할게요.
지우: 그럼 갱신 후 5/4 마감으로 다시 잡고, 디자인 QA는 5/2까지 마무리하시죠.
서연: 네, 5/2까지 다크모드 포함 QA 끝낼 수 있어요.
도현: 회원가입 단계 카피 검토는 누가 담당하나요?
지우: 한가영 매니저한테 5/3까지 부탁드릴게요.`;

const EXTRACTED = [
  { id: 1, title: 'APNs 푸시 인증서 갱신', assignee: 'u4', proj: 'p1', due: '내일', priority: 'high', confidence: 0.96, source: '4번째 발화' },
  { id: 2, title: '디자인 QA + 다크모드 검수 완료', assignee: 'u1', proj: 'p1', due: '5/2', priority: 'high', confidence: 0.92, source: '5-6번째 발화' },
  { id: 3, title: 'iOS 푸시 알림 카테고리 액션 (T-1029) 재오픈, 마감 5/4', assignee: 'u4', proj: 'p1', due: '5/4', priority: 'high', confidence: 0.89, source: '5번째 발화' },
  { id: 4, title: '회원가입 단계 카피 검토', assignee: 'u5', proj: 'p1', due: '5/3', priority: 'med', confidence: 0.83, source: '7-8번째 발화' },
];

type AiItem = ExtractedAction & { id: number; proj: string; source?: string };

export function AIAutoPage() {
  const [source, setSource] = useState<Source>('meeting');
  const [text, setText] = useState(SAMPLE_TRANSCRIPT);
  const [items, setItems] = useState<AiItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [defaultProj, setDefaultProj] = useState(PROJECTS[0]?.id ?? 'p1');

  const ai = useAiMutations();
  const tasks = useTaskMutations();
  const extracting = ai.extractActions.isPending;
  const extracted = items.length > 0;

  async function runExtract() {
    const result = await ai.extractActions.mutateAsync({ source, content: text, threshold: 0.7 });
    const next: AiItem[] = result.map((r, idx) => ({
      ...r, id: idx + 1, proj: defaultProj, source: r.sourceQuote ? r.sourceQuote.slice(0, 16) : undefined,
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
        proj: p.proj,
        assignee: p.assignee || 'me',
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
                  <div className="flex gap-1.5">
                    <Button variant="secondary" size="sm"><Upload size={12} /> 파일</Button>
                    <Button variant="secondary" size="sm">최근 회의록</Button>
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={14}
                  className="w-full resize-none rounded-md bg-bg-1 border border-border px-3 py-2.5 text-[12.5px] mono leading-relaxed focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
                <div className="flex justify-between text-[11px] text-fg-3 mt-1">
                  <span>{text.length} 글자 · 약 {Math.ceil(text.length / 350)}분 분량</span>
                  <span>한국어 자동 감지</span>
                </div>
              </div>
            )}

            {source === 'voice' && (
              <div className="rounded-lg border-2 border-dashed border-border-strong p-8 text-center">
                <FileAudio size={28} className="mx-auto text-fg-3" />
                <div className="text-[13px] font-medium text-fg mt-2">음성 파일 드롭 또는 실시간 녹음</div>
                <div className="text-[11.5px] text-fg-3 mt-1">최대 60분 · Whisper-large-v3 자동 전사</div>
                <Button variant="primary" size="sm" className="mt-3"><Mic size={12} /> 녹음 시작</Button>
              </div>
            )}

            {(source === 'email' || source === 'notion' || source === 'csv') && (
              <div className="rounded-lg border-2 border-dashed border-border-strong p-8 text-center">
                <Upload size={24} className="mx-auto text-fg-3" />
                <div className="text-[13px] font-medium text-fg mt-2">소스 연결</div>
                <div className="text-[11.5px] text-fg-3 mt-1">{SOURCES.find(s => s.id === source)?.desc}</div>
                <Button variant="primary" size="sm" className="mt-3">연결하기</Button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1">
                <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-1">기본 프로젝트</div>
                <select
                  value={defaultProj}
                  onChange={e => setDefaultProj(e.target.value)}
                  className="w-full h-8 px-2 rounded-md bg-bg-1 border border-border text-[12.5px] focus:outline-none focus:border-accent"
                >
                  {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              <Button variant="primary" onClick={runExtract} disabled={extracting} className="self-end h-9">
                {extracting ? <><Wand2 size={13} className="animate-pulse" /> 추출 중...</> : <><Sparkles size={13} /> 액션 아이템 추출</>}
              </Button>
            </div>
          </CardBody>
        </Card>

        <AiChatPanel />

        <Card>
          <CardHeader><CardTitle>최근 자동 등록</CardTitle></CardHeader>
          <CardBody className="!p-0">
            {[
              { date: '4/27', src: '회의록', extracted: 6, registered: 5, proj: 'p1' },
              { date: '4/26', src: '이메일 스레드', extracted: 3, registered: 3, proj: 'p3' },
              { date: '4/25', src: '음성 (45분)', extracted: 12, registered: 9, proj: 'p2' },
            ].map((r, i) => {
              const proj = PROJECTS.find(p => p.id === r.proj);
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0 text-[12.5px]">
                  <span className="mono text-fg-3 w-10">{r.date}</span>
                  <span className="text-fg-1 flex-1">{r.src}</span>
                  <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white inline-flex items-center" style={{ background: proj?.color }}>{proj?.code}</span>
                  <span className="mono text-fg-2">{r.registered}/{r.extracted} 등록</span>
                  <ChevronRight size={14} className="text-fg-3" />
                </div>
              );
            })}
          </CardBody>
        </Card>
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
                  const u = userById(item.assignee);
                  const proj = PROJECTS.find(p => p.id === item.proj);
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
                            <span className="px-1.5 h-4 rounded text-[10px] mono font-semibold text-white" style={{ background: proj?.color }}>{proj?.code}</span>
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
                            <button className="text-[10.5px] text-accent-strong hover:underline">근거: {item.source}</button>
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
