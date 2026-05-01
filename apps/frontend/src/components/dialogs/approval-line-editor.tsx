/**
 * ApprovalLineEditor — inline picker for the approval chain.
 *
 * Each row represents one approver step. The chain is ordered, but step 0
 * is always the requester (locked). Adding/removing steps mutates the
 * parent-controlled `value` array via `onChange`.
 */
'use client';

import { useMemo } from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import { Avatar, IconButton } from '@/components/ui/primitives';
import { useUsers } from '@/lib/hooks/use-data';
import { useUserMap } from '@/lib/hooks/use-user-lookup';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function ApprovalLineEditor({ value, onChange }: Props) {
  const { data: users = [] } = useUsers();
  const userMap = useUserMap();
  const remaining = useMemo(() => users.filter(u => !value.includes(u.id)), [users, value]);

  const setAt = (idx: number, id: string) => {
    const copy = [...value];
    copy[idx] = id;
    onChange(copy);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const addNext = () => {
    if (remaining[0]) onChange([...value, remaining[0].id]);
  };

  return (
    <div className="rounded-md border border-border bg-bg-1 p-3">
      <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-fg-3">결재 라인</div>
      <ol className="flex flex-wrap items-center gap-2">
        {value.map((id, idx) => {
          const user = userMap.get(id);
          if (!user) return null;
          return (
            <li key={`${id}-${idx}`} className="flex items-center gap-2 rounded-md border border-border bg-bg-elev px-2 py-1">
              <span className="text-[10px] mono text-fg-3">{idx === 0 ? '신청' : `${idx}차`}</span>
              <Avatar user={user} size={20} />
              <select
                aria-label={`결재자 ${idx + 1}`}
                className="bg-transparent text-[12px] text-fg-1 focus:outline-none"
                value={id}
                onChange={e => setAt(idx, e.target.value)}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {idx > 0 && (
                <IconButton
                  size="sm"
                  type="button"
                  aria-label={`결재자 ${idx + 1} 제거`}
                  onClick={() => removeAt(idx)}
                >
                  <X size={11} />
                </IconButton>
              )}
              {idx < value.length - 1 && <ArrowRight size={12} className="text-fg-3" />}
            </li>
          );
        })}
        {remaining.length > 0 && (
          <li>
            <IconButton size="sm" type="button" aria-label="결재자 추가" onClick={addNext}>
              <Plus size={12} />
            </IconButton>
          </li>
        )}
      </ol>
    </div>
  );
}
