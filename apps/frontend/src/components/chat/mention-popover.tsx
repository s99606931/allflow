/**
 * MentionPopover — picks a teammate from the roster fixture.
 *
 * Pure presentational; the parent owns open-state and decides what to do
 * with the chosen user (insert into composer text, set assignee, etc.).
 */
'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/primitives';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onSelect: (user: User) => void;
  onClose: () => void;
  users?: User[];
  className?: string;
}

export function MentionPopover({ open, onSelect, onClose, users = [], className }: Props) {
  const [query, setQuery] = useState('');
  const matches = useMemo(
    () =>
      users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.id.includes(query.toLowerCase())).slice(0, 6),
    [query, users],
  );

  if (!open) return null;

  return (
    <div
      role="listbox"
      aria-label="멘션 대상"
      className={cn(
        'absolute z-30 w-[260px] rounded-md border border-border bg-bg-elev shadow-pop',
        className,
      )}
    >
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
        placeholder="이름 검색..."
        className="h-8 w-full rounded-t-md border-b border-border bg-transparent px-2.5 text-[12.5px] focus:outline-none"
      />
      <ul className="max-h-[240px] overflow-y-auto p-1">
        {matches.map(user => (
          <li key={user.id}>
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onSelect(user)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] hover:bg-hover"
            >
              <Avatar user={user} size={20} />
              <span className="flex-1 text-fg-1">{user.name}</span>
              <span className="text-[10.5px] text-fg-3">{user.dept}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="p-2 text-center text-[11.5px] text-fg-3">검색 결과 없음</li>
        )}
      </ul>
    </div>
  );
}
