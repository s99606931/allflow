/**
 * Standardized React Query key factory.
 *
 * All UI components MUST use these factories to derive query keys so that
 * cache invalidation and optimistic updates remain consistent across the app.
 *
 * Convention:
 *   keys.<resource>.all                            → invalidate every query of that resource
 *   keys.<resource>.list(filters)                  → list view (filters as object)
 *   keys.<resource>.detail(id)                     → single resource detail
 *   keys.<resource>.children(parentId, child)      → nested collections
 *
 * Reference: PDCA-01 (foundation/api-contract).
 */

type Filters = Record<string, unknown> | undefined;

const root = (resource: string) => [resource] as const;
const list = (resource: string, filters?: Filters) =>
  filters && Object.keys(filters).length > 0 ? ([resource, 'list', filters] as const) : ([resource, 'list'] as const);
const detail = (resource: string, id: string) => [resource, 'detail', id] as const;
const children = (resource: string, id: string, child: string, filters?: Filters) =>
  filters && Object.keys(filters).length > 0
    ? ([resource, 'detail', id, child, filters] as const)
    : ([resource, 'detail', id, child] as const);

export const keys = {
  me: () => ['me'] as const,

  projects: {
    all: () => root('projects'),
    list: (filters?: Filters) => list('projects', filters),
    detail: (id: string) => detail('projects', id),
  },

  tasks: {
    all: () => root('tasks'),
    list: (filters?: Filters) => list('tasks', filters),
    detail: (id: string) => detail('tasks', id),
    comments: (taskId: string) => children('tasks', taskId, 'comments'),
  },

  issues: {
    all: () => root('issues'),
    list: (filters?: Filters) => list('issues', filters),
    detail: (id: string) => detail('issues', id),
    comments: (issueId: string) => children('issues', issueId, 'comments'),
  },

  approvals: {
    all: () => root('approvals'),
    list: (filters?: Filters) => list('approvals', filters),
    detail: (id: string) => detail('approvals', id),
  },

  clients: {
    all: () => root('clients'),
    list: (filters?: Filters) => list('clients', filters),
    detail: (id: string) => detail('clients', id),
  },

  events: {
    all: () => root('events'),
    list: (filters?: Filters) => list('events', filters),
  },

  resources: {
    all: () => root('resources'),
    list: (filters?: Filters) => list('resources', filters),
  },

  docs: {
    all: () => root('docs'),
    list: (filters?: Filters) => list('docs', filters),
    detail: (id: string) => detail('docs', id),
  },

  channels: {
    all: () => root('channels'),
    list: () => list('channels'),
  },

  orgUnits: {
    all: () => root('orgUnits'),
    list: () => list('orgUnits'),
  },

  notifications: {
    all: () => root('notifications'),
    list: (filters?: Filters) => list('notifications', filters),
  },

  reports: {
    all: () => root('reports'),
    list: (filters?: Filters) => list('reports', filters),
    detail: (id: string) => detail('reports', id),
  },

  gantt: {
    all: () => root('gantt'),
    data: (filters?: Filters) => list('gantt', filters),
  },

  health: {
    all: () => root('health'),
    status: () => list('health'),
  },
} as const;
