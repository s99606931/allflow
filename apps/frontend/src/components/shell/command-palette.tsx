'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEAM, PROJECTS, TASKS, ISSUES, NAV } from '@/lib/fixtures';
import { Avatar } from '@/components/ui/primitives';
import {
  Search, ArrowRight, Sparkles, X, Hash, FolderKanban, CheckSquare,
  AlertCircle, User as UserIcon, FileText,
} from 'lucide-react';

interface Hit {
  kind: 'page' | 'project' | 'task' | 'issue' | 'user' | 'doc' | 'action';
  id: string;
  title: string;
  sub?: string;
  href?: string;
  hint?: string;
  color?: string;
  icon?: string;
}

const RECENT_KEY = 'allflow-cmdk-recent';

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); }
  catch { return []; }
}
function pushRecent(id: string) {
  const cur = loadRecent().filter(x => x !== id);
  cur.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 8)));
}

const ACTIONS: Hit[] = [
  { kind: 'action', id: 'new-task',     title: '새 태스크 만들기',  hint: 'N',         icon: 'CheckSquare' },
  { kind: 'action', id: 'new-project',  title: '새 프로젝트',       hint: '⇧ ⌘ P',     icon: 'FolderKanban' },
  { kind: 'action', id: 'new-issue',    title: '새 이슈 등록',      hint: '⇧ ⌘ I',     icon: 'AlertCircle' },
  { kind: 'action', id: 'new-leave',    title: '휴가 신청',         hint: '⇧ ⌘ L',     icon: 'Sparkles' },
  { kind: 'action', id: 'new-meeting',  title: '회의실 예약',       hint: '⇧ ⌘ R',     icon: 'Sparkles' },
  { kind: 'action', id: 'theme-toggle', title: '다크 모드 토글',    hint: '⇧ ⌘ D',     icon: 'Sparkles' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // External trigger (topbar/sidebar 검색 버튼)
  useEffect(() => {
    const onTrigger = () => setOpen(true);
    window.addEventListener('allflow:cmdk', onTrigger);
    return () => window.removeEventListener('allflow:cmdk', onTrigger);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setQ('');
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const hits = useMemo(() => buildHits(q), [q]);

  // Group ordering
  const groups = useMemo(() => groupHits(hits), [hits]);
  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveIdx(0); }, [q]);

  const go = (h: Hit) => {
    pushRecent(h.id);
    setOpen(false);
    if (h.href) router.push(h.href);
    if (h.kind === 'action') {
      window.dispatchEvent(new CustomEvent('allflow:action', { detail: h.id }));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')  { e.preventDefault(); if (flat[activeIdx]) go(flat[activeIdx]!); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-start pt-[12vh] px-4 bg-[oklch(0_0_0/0.5)] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-[640px] rounded-xl bg-bg-elev border border-border shadow-pop overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search size={16} className="text-fg-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="페이지 · 프로젝트 · 태스크 · 이슈 · 사람 · 명령 검색..."
            className="flex-1 bg-transparent text-[13.5px] text-fg placeholder:text-fg-3 outline-none"
            aria-label="검색"
          />
          <button onClick={() => setOpen(false)} className="text-fg-3 hover:text-fg-1" aria-label="닫기">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto scroll p-1">
          {flat.length === 0 ? (
            <div className="p-8 text-center text-fg-3 text-[12.5px]">
              <Sparkles size={20} className="mx-auto mb-2 opacity-50" />
              일치하는 결과가 없습니다.
            </div>
          ) : (
            groups.map(g => (
              <div key={g.label} className="mb-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-3">{g.label}</div>
                {g.items.map(h => {
                  const idx = flat.indexOf(h);
                  return (
                    <button
                      key={`${h.kind}-${h.id}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => go(h)}
                      className={`w-full flex items-center gap-3 px-3 h-10 rounded-md text-left text-[12.5px] transition-colors ${idx === activeIdx ? 'bg-accent-soft text-fg' : 'text-fg-1 hover:bg-hover'}`}
                    >
                      <KindIcon hit={h} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{h.title}</div>
                        {h.sub && <div className="text-[10.5px] text-fg-3 truncate">{h.sub}</div>}
                      </div>
                      {h.hint && <kbd className="text-[10px] mono px-1.5 py-0.5 rounded bg-bg-1 border border-border text-fg-2">{h.hint}</kbd>}
                      <ArrowRight size={11} className="text-fg-3" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 h-9 border-t border-border bg-bg-1 text-[10.5px] text-fg-3">
          <span className="flex items-center gap-1"><kbd className="mono px-1 py-0.5 rounded bg-bg-2 border border-border">↑</kbd><kbd className="mono px-1 py-0.5 rounded bg-bg-2 border border-border">↓</kbd>이동</span>
          <span className="flex items-center gap-1"><kbd className="mono px-1 py-0.5 rounded bg-bg-2 border border-border">Enter</kbd>선택</span>
          <span className="flex items-center gap-1"><kbd className="mono px-1 py-0.5 rounded bg-bg-2 border border-border">Esc</kbd>닫기</span>
          <div className="flex-1" />
          <span className="flex items-center gap-1"><Sparkles size={10} className="text-accent" /> AI 자연어 검색 가능</span>
        </div>
      </div>
    </div>
  );
}

function KindIcon({ hit }: { hit: Hit }) {
  const map = {
    page: Hash, project: FolderKanban, task: CheckSquare, issue: AlertCircle,
    user: UserIcon, doc: FileText, action: Sparkles,
  } as const;
  const Icon = map[hit.kind] ?? Hash;

  if (hit.kind === 'user') {
    const u = TEAM.find(t => t.id === hit.id);
    if (u) return <Avatar user={u} size={22} />;
  }
  if (hit.kind === 'project' && hit.color) {
    return <div className="w-6 h-6 rounded grid place-items-center text-white shrink-0" style={{ background: hit.color }}><Icon size={11} /></div>;
  }
  return (
    <div className="w-6 h-6 rounded grid place-items-center bg-bg-1 border border-border text-fg-2 shrink-0">
      <Icon size={12} />
    </div>
  );
}

/* Build + group ------------------------------------------------------ */

function buildHits(q: string): Hit[] {
  const query = q.trim().toLowerCase();
  const hits: Hit[] = [];

  // Pages
  for (const sect of NAV) {
    for (const it of sect.items) {
      hits.push({ kind: 'page', id: it.id, title: it.label, sub: sect.sect, href: it.href, hint: undefined });
    }
  }
  // /settings, /approvals, /hr, /resources 추가 페이지 — NAV 외
  hits.push(
    { kind: 'page', id: 'approvals', title: '결재함',           sub: '워크스페이스', href: '/approvals' },
    { kind: 'page', id: 'hr',        title: '인사 / HR',        sub: '관리',         href: '/hr' },
    { kind: 'page', id: 'resources', title: '회의실 / 리소스',  sub: '관리',         href: '/resources' },
    { kind: 'page', id: 'settings',  title: '개인 설정',        sub: '관리',         href: '/settings' },
  );

  // Projects
  for (const p of PROJECTS) {
    hits.push({ kind: 'project', id: p.id, title: p.name, sub: `${p.code} · ${p.tasks.done}/${p.tasks.total}`, href: `/projects/${p.id}`, color: p.color });
  }
  // Tasks
  for (const t of TASKS) {
    hits.push({ kind: 'task', id: t.id, title: t.title, sub: `${t.id} · ${t.due}`, href: `/tasks` });
  }
  // Issues
  for (const i of ISSUES.slice(0, 8)) {
    hits.push({ kind: 'issue', id: i.id, title: i.title, sub: `${i.id} · ${i.prio} · ${i.proj}`, href: `/issues` });
  }
  // Users
  for (const u of TEAM) {
    hits.push({ kind: 'user', id: u.id, title: u.name, sub: `${u.role} · ${u.dept}`, href: `/users` });
  }
  // Actions (always present)
  for (const a of ACTIONS) hits.push(a);

  if (!query) {
    // 빈 쿼리: recent → 페이지 → 액션
    const recent = loadRecent();
    const recentHits = recent.map(id => hits.find(h => h.id === id)).filter(Boolean) as Hit[];
    const pages = hits.filter(h => h.kind === 'page' && !recent.includes(h.id));
    const actions = hits.filter(h => h.kind === 'action');
    return [...recentHits, ...pages, ...actions];
  }

  return hits.filter(h => {
    const hay = `${h.title} ${h.sub ?? ''}`.toLowerCase();
    return hay.includes(query);
  });
}

function groupHits(hits: Hit[]) {
  const labelMap: Record<Hit['kind'], string> = {
    page: '페이지', project: '프로젝트', task: '태스크', issue: '이슈',
    user: '구성원', doc: '문서', action: '명령',
  };
  const order: Hit['kind'][] = ['page', 'project', 'task', 'issue', 'user', 'doc', 'action'];
  const groups = order
    .map(k => ({ kind: k, label: labelMap[k], items: hits.filter(h => h.kind === k).slice(0, 6) }))
    .filter(g => g.items.length > 0);
  return groups;
}
