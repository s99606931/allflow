/**
 * Domain types — single source of truth in `schemas.ts` (Zod).
 * This file just re-exports inferred types for ergonomic imports.
 */
export type {
  StatusKey,
  User,
  Project,
  ProjectCreate,
  ProjectPatch,
  Task,
  TaskCreate,
  TaskPatch,
  Issue,
  IssueSev,
  IssuePrio,
  IssueStatus,
  Report,
  ExtractedAction,
  Notification,
  RealtimeEvent,
} from './schemas';

export interface Activity {
  who: string;
  what: string;
  target: string;
  verb: string;
  time: string;
  proj: string;
  kind: 'attach' | 'status' | 'ai' | 'doc' | 'comment' | 'sync';
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
  href: string;
}

export interface NavSection {
  sect: string;
  items: NavItem[];
}
