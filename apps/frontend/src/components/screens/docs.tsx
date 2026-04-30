'use client';

import { useState } from 'react';
import { Avatar, Button, IconButton } from '@/components/ui/primitives';
import { userById } from '@/lib/fixtures';
import { FileText, Plus, Search, Sparkles, Star, ChevronRight, Hash, Clock } from 'lucide-react';
import { DocCreateDialog } from '@/components/dialogs/doc-create-dialog';
import { useDocs } from '@/lib/hooks/use-data';

export function DocsPage() {
  const { data: docs = [], isLoading, error } = useDocs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = selectedId ?? docs[0]?.id ?? null;
  const [createOpen, setCreateOpen] = useState(false);

  const activeDoc = docs.find(d => d.id === active) ?? null;

  return (
    <div className="grid grid-cols-[280px_1fr_280px] h-[calc(100vh-56px)] border-t border-border">
      {/* Tree */}
      <div className="bg-bg-1 border-r border-border overflow-y-auto scroll">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3" />
            <input placeholder="문서 검색..." className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-2 border border-border text-[12px] focus:outline-none focus:border-accent" />
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
              {docs.map(d => {
                const u = userById(d.ownerId);
                return (
                  <button key={d.id} onClick={() => setSelectedId(d.id)}
                    className={`w-full flex items-center gap-2 px-2 h-8 rounded text-[12.5px] transition-colors ${active === d.id ? 'bg-accent-soft text-accent-strong font-semibold' : 'text-fg-1 hover:bg-hover'}`}>
                    <FileText size={12} className="shrink-0" />
                    <span className="flex-1 text-left truncate">{d.title}</span>
                    {u && <Avatar user={u} size={14} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="overflow-y-auto scroll">
        <div className="max-w-[760px] mx-auto px-10 py-8">
          {!activeDoc && (
            <div className="py-24 text-center text-[13px] text-fg-3">
              {isLoading ? '문서를 불러오는 중...' : '왼쪽에서 문서를 선택하거나 새 문서를 생성하세요.'}
            </div>
          )}
          {activeDoc && (() => {
            const owner = userById(activeDoc.ownerId);
            return (
              <>
                <div className="text-[11px] text-fg-3 flex items-center gap-1.5">
                  문서 <ChevronRight size={11} /> {activeDoc.title}
                  <span className="ml-2"><Clock size={10} className="inline" /> {new Date(activeDoc.updatedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-start gap-2 mt-4">
                  <h1 className="text-[32px] font-bold tracking-tight text-fg flex-1">{activeDoc.title}</h1>
                  <IconButton size="sm"><Star size={14} /></IconButton>
                  <Button variant="secondary" size="sm"><Sparkles size={12} /> AI 요약</Button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[12px] text-fg-2">
                  {owner && <Avatar user={owner} size={20} />}
                  <span>{owner?.name ?? activeDoc.ownerId}</span>
                </div>
                {activeDoc.preview && (
                  <div className="prose mt-8 text-[14px] text-fg-1 leading-[1.75] whitespace-pre-wrap">
                    {activeDoc.preview}
                  </div>
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
