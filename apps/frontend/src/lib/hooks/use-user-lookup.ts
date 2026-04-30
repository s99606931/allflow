'use client';

import { useMemo } from 'react';
import type { User } from '@/lib/schemas';
import { useUsers } from '@/lib/hooks/use-data';

export function useUserMap(): Map<string, User> {
  const { data: users = [] } = useUsers();
  return useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
}
