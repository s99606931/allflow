'use client';

import { useEffect, useState } from 'react';
import { Avatar, Button, IconButton } from '@/components/ui/primitives';
import { FileText, Loader2, Pencil, Plus, Save, Search, Sparkles, Star, Trash2, X, ChevronRight, Hash, Clock } from 'lucide-react';
import { DocCreateDialog } from '@/components/dialogs/doc-create-dialog';
import { useDocs, useDocMutations } from '@/lib/hooks/use-data';
import { useAiStream } from '@/lib/hooks/use-ai';
import { useUserMap } from '@/lib/hooks/use-user-lookup';
import { AiGuideWidget } from '@/components/ai/ai-guide-widget';

export function DocsPage() {
  const { data: docs = [], isLoading, error } = useDocs();
  const userMap = useUserMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = selectedId ?? docs[0]?.id ?? null;
  const [docSearch, setDocSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryDocId, setSummaryDocId] = useState<string | null>(null);
  const { streaming, streamComplete } = useAiStream();
  const docMutations = useDocMutations();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const activeDoc = docs.find(d => d.id === active) ?? null;

  useEffect(() => {
    if (activeDoc) {
      setEditTitle(activeDoc.title);
      setEditContent(activeDoc.preview ?? '');
      setEditing(false);
    }
  }, [activeDoc?.id]);

  async function requestSummary() {
    if (!activeDoc || streaming) return;
    setSummaryDocId(activeDoc.id);
    setSummaries(prev => ({ ...prev, [activeDoc.id]: '' }));
    const content = activeDoc.preview ?? activeDoc.title;
    await streamComplete(
      `다음 문서를 한국어로 3~5문장으로 요약해주세요:\n\n${content}`,
      (delta) => setSummaries(prev => ({ ...prev, [activeDoc.id]: (prev[activeDoc.id] ?? '') + delta })),
      () => setSummaryDocId(null),
    );
  }

  return (
    <div className="grid grid-cols-[280px_1fr_280px] h-[calc(100vh-56px)] border-t border-border">
      {/* Tree */}
      <div className="bg-bg-1 border-r border-border overflow-y-auto scroll">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input
              value={docSearch}
              onChange={e => setDocSearch(e.target.value)}
              placeholder="문서 검색..."
              className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent"
            />
          </div>
          <Button variant="primary" size="sm" className="w-full" onClick={() => setCreateOpen(true)}><Plus size={12} /> 새 문서</Button>
          <DocCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
        <div className="p-2">
          {isLoading && <div className="px-3 py-6 text-[12px] text-fg-3">불러오는 중...</div>}
          {error && <div className="px-3 py-6 text-[12px] text-danger">문서를 불러오지 못했습니다.</div>}
          {!isLoading && !error && docs.length === 0 && (
            <div className="px-3 py-6 text-[12px] text-fg-3">등록된 문서가 없습니다.</div>
          )}
          {docs.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-fg-3 font-semibold">전체 문서</div>
              {docs.filter(d => !docSearch.trim() || d.title.toLowerCase().includes(docSearch.toLowerCase())).map(d => {
                const u = userMap.get(d.ownerId);
                return (
                  <div key={d.id} className={`group flex items-center gap-1 px-2 h-8 rounded transition-colors ${active === d.id ? 'bg-accent-soft text-accent-strong' : 'text-fg-1 hover:bg-hover'}`}>
                    <button onClick={() => setSelectedId(d.id)} className="flex items-center gap-2 flex-1 min-w-0 text-[12.5px] font-[inherit] text-left">
                      <FileText size={12} className="shrink-0" />
                      <span className="flex-1 truncate">{d.title}</span>
                      {u && <Avatar user={u} size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`"${d.title}" 문서를 삭제하시겠습니까?`)) docMutations.remove.mutate(d.id); }}
                      className="opacity-0 group-hover:opacity-100 text-fg-3 hover:text-danger shrink-0 transition-opacity"
                      aria-label="문서 삭제"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="overflow-y-auto scroll">
        <div className="max-w-[760px] mx-auto px-10 py-8">
          <AiGuideWidget
            systemContext="문서 관리 — 마크다운 문서 작성·편집·AI 요약·버전 관리 화면"
            hints={['문서 구조 개선 제안해줘', '오래된 문서 찾아줘', '이 문서 요약해줘']}
            className="mb-6"
          />
          {!activeDoc && (
            <div className="py-24 text-center text-[13px] text-fg-3">
              {isLoading ? '문서를 불러오는 중...' : '왼쪽에서 문서를 선택하거나 새 문서를 생성하세요.'}
            </div>
          )}
          {activeDoc && (() => {
            const owner = userMap.get(activeDoc.ownerId);
            return (
              <>
                <div className="text-[11px] text-fg-3 flex items-center gap-1.5">
                  문서 <ChevronRight size={11} /> {activeDoc.title}
                  <span className="ml-2"><Clock size={10} className="inline" /> {new Date(activeDoc.updatedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-start gap-2 mt-4">
                  {editing ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 text-[32px] font-bold tracking-tight text-fg bg-bg-2 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:border-accent"
                      placeholder="문서 제목"
                      maxLength={200}
                    />
                  ) : (
                    <h1 className="text-[32px] font-bold tracking-tight text-fg flex-1">{activeDoc.title}</h1>
                  )}
                  <IconButton
                    size="sm"
                    aria-label="즐겨찾기"
                    onClick={() => setStarredIds(prev => {
                      const next = new Set(prev);
                      if (next.has(activeDoc.id)) next.delete(activeDoc.id); else next.add(activeDoc.id);
                      return next;
                    })}
                  >
                    <Star size={14} className={starredIds.has(activeDoc.id) ? 'fill-warning text-warning' : ''} />
                  </IconButton>
                  {!editing && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                        <Pencil size={12} /> 편집
                      </Button>
                      <Button variant="secondary" size="sm" onClick={requestSummary} disabled={streaming}>
                        {streaming && summaryDocId === activeDoc.id ? <><Loader2 size={12} className="animate-spin" /> 요약 중...</> : <><Sparkles size={12} /> AI 요약</>}
                      </Button>
                    </>
                  )}
                  {editing && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => docMutations.update.mutate(
                          { id: activeDoc.id, patch: { title: editTitle, content: editContent } },
                          { onSuccess: () => setEditing(false) },
                        )}
                        disabled={docMutations.update.isPending || editTitle.trim().length === 0}
                      >
                        {docMutations.update.isPending ? <><Loader2 size={12} className="animate-spin" /> 저장 중...</> : <><Save size={12} /> 저장</>}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditTitle(activeDoc.title);
                          setEditContent(activeDoc.preview ?? '');
                          setEditing(false);
                        }}
                        disabled={docMutations.update.isPending}
                      >
                        <X size={12} /> 취소
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 text-[12px] text-fg-2">
                  {owner && <Avatar user={owner} size={20} />}
                  <span>{owner?.name ?? activeDoc.ownerId}</span>
                </div>
                {summaries[activeDoc.id] && !editing && (
                  <div className="mt-4 p-3 rounded-lg border border-accent/20 bg-accent-soft text-[12.5px] text-fg-1 leading-relaxed">
                    <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-accent-strong"><Sparkles size={11} /> AI 요약</div>
                    {summaries[activeDoc.id]}
                    {streaming && summaryDocId === activeDoc.id && <span className="inline-block w-1.5 h-3.5 bg-accent-strong ml-0.5 animate-pulse" />}
                  </div>
                )}
                {editing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[400px] mt-8 text-[14px] text-fg-1 leading-[1.75] bg-bg-2 border border-border rounded-md p-3 focus:outline-none focus:border-accent resize-y"
                    placeholder="문서 내용을 입력하세요"
                    maxLength={50000}
                  />
                ) : (
                  activeDoc.preview && (
                    <div className="prose mt-8 text-[14px] text-fg-1 leading-[1.75] whitespace-pre-wrap">
                      {activeDoc.preview}
                    </div>
                  )
                )}
              </>
            );
          })()}

        </div>
      </div>

      {/* Right — outline */}
      <div className="bg-bg-1 border-l border-border overflow-y-auto scroll p-4 space-y-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-fg-3 font-semibold mb-2">정보</div>
          <div className="text-[12px] text-fg-2 space-y-2">
            {activeDoc ? (
              <>
                <div className="flex items-center gap-1.5"><Hash size={11} /> {activeDoc.id}</div>
                <div className="flex items-center gap-1.5"><Clock size={11} /> {new Date(activeDoc.updatedAt).toLocaleString()}</div>
              </>
            ) : (
              <span className="text-fg-3">선택된 문서가 없습니다.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
