import type { PrismaClient } from '@prisma/client';
import { semanticSearch } from '../search/search.service.js';
import type { AIToolDef } from './ai-adapter.js';
import type { McpClientManager } from './mcp-client-registry.js';
import type { WebSearchAdapter } from './web-search-adapter.js';

const RAG_TOP_K = 5;
const RAG_TOP_K_MAX = 20;
const WEB_TOP_K = 5;
const WEB_TOP_K_MAX = 10;
const KEYWORD_TOP_K = 5;

export interface ToolExecCtx {
  prisma: PrismaClient;
  webSearch?: WebSearchAdapter;
  /** 호출자(인증된 사용자) — 권한 스코프 적용 가능. */
  userId?: string;
}

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>, ctx: ToolExecCtx): Promise<string>;
}

function strArg(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function numArg(args: Record<string, unknown>, key: string, fallback: number): number {
  const v = args[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export const BUILTIN_TOOLS: AiTool[] = [
  {
    name: 'search_tasks',
    description: '워크스페이스에서 태스크를 키워드로 검색합니다',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '검색어' } },
      required: ['query'],
    },
    async execute(args, { prisma }) {
      const tasks = await prisma.task.findMany({
        where: {
          OR: [{ title: { contains: strArg(args, 'query'), mode: 'insensitive' } }],
          deletedAt: null,
        },
        take: KEYWORD_TOP_K,
        select: { id: true, title: true, status: true },
      });
      return JSON.stringify(tasks);
    },
  },
  {
    name: 'search_issues',
    description: '워크스페이스 이슈를 키워드로 검색합니다',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '검색어' } },
      required: ['query'],
    },
    async execute(args, { prisma }) {
      const issues = await prisma.issue.findMany({
        where: {
          OR: [{ title: { contains: strArg(args, 'query'), mode: 'insensitive' } }],
          deletedAt: null,
        },
        take: KEYWORD_TOP_K,
        select: { id: true, title: true, status: true },
      });
      return JSON.stringify(issues);
    },
  },
  {
    name: 'rag_search',
    description:
      '워크스페이스 지식(태스크/이슈)을 의미 기반(임베딩)으로 검색합니다. ' +
      '키워드가 정확히 일치하지 않아도 의미가 가까운 결과를 반환합니다. ' +
      'OPENAI_API_KEY 미설정 시 호출 실패를 반환합니다.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '의미 기반 질의' },
        limit: {
          type: 'integer',
          description: `상위 N개 (1~${RAG_TOP_K_MAX})`,
          minimum: 1,
          maximum: RAG_TOP_K_MAX,
        },
        targets: {
          type: 'array',
          description: '검색 대상 (생략 시 둘 다)',
          items: { type: 'string', enum: ['tasks', 'issues'] },
        },
      },
      required: ['query'],
    },
    async execute(args, { prisma }) {
      const query = strArg(args, 'query');
      if (!query) return JSON.stringify({ error: 'query 가 비어있습니다' });
      const limit = Math.max(1, Math.min(numArg(args, 'limit', RAG_TOP_K), RAG_TOP_K_MAX));
      const rawTargets = Array.isArray(args.targets) ? (args.targets as unknown[]) : undefined;
      const targets = rawTargets
        ? (rawTargets.filter((t) => t === 'tasks' || t === 'issues') as Array<'tasks' | 'issues'>)
        : undefined;
      try {
        const hits = await semanticSearch(prisma, {
          query,
          limit,
          ...(targets && targets.length > 0 ? { targets } : {}),
        });
        return JSON.stringify(hits);
      } catch (err) {
        return JSON.stringify({ error: `rag_search 실패: ${(err as Error).message}` });
      }
    },
  },
  {
    name: 'web_search',
    description:
      '공개 웹을 검색합니다. 답변에 외부 출처가 필요하거나 ' +
      '워크스페이스 내부에 정보가 없을 때 사용하세요. 결과는 title/url/snippet 배열입니다.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색 질의' },
        limit: {
          type: 'integer',
          description: `상위 N개 (1~${WEB_TOP_K_MAX})`,
          minimum: 1,
          maximum: WEB_TOP_K_MAX,
        },
      },
      required: ['query'],
    },
    async execute(args, { webSearch }) {
      if (!webSearch) {
        return JSON.stringify({
          error: '웹 검색 어댑터가 설정되어 있지 않습니다 (WEB_SEARCH_PROVIDER 미설정).',
        });
      }
      const query = strArg(args, 'query');
      if (!query) return JSON.stringify({ error: 'query 가 비어있습니다' });
      const limit = Math.max(1, Math.min(numArg(args, 'limit', WEB_TOP_K), WEB_TOP_K_MAX));
      try {
        const results = await webSearch.search(query, limit);
        return JSON.stringify(results);
      } catch (err) {
        return JSON.stringify({ error: `web_search 실패: ${(err as Error).message}` });
      }
    },
  },
];

/** OpenAI tool-calling spec 으로 직렬화. 어댑터가 모델에 그대로 전달한다. */
export function toolsToOpenAISpec(tools: AiTool[]): AIToolDef[] {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export class ToolDispatcher {
  private readonly tools: Map<string, AiTool>;
  private readonly mcp?: McpClientManager;

  constructor(tools: AiTool[], mcp?: McpClientManager) {
    this.tools = new Map(tools.map((t) => [t.name, t]));
    this.mcp = mcp;
  }

  list(): AiTool[] {
    return Array.from(this.tools.values());
  }

  /** 빌트인 + 활성화된 MCP 서버 tools 를 OpenAI tool-call 스펙으로 직렬화. */
  async listAsOpenAISpec(): Promise<AIToolDef[]> {
    const builtins = toolsToOpenAISpec(this.list());
    if (!this.mcp) return builtins;
    try {
      const mcpTools = await this.mcp.listTools();
      const mcpDefs: AIToolDef[] = mcpTools.map((t) => ({
        type: 'function',
        function: {
          name: `${t.serverName}.${t.name}`,
          description: `[MCP:${t.serverName}] ${t.description}`,
          parameters: t.inputSchema,
        },
      }));
      return [...builtins, ...mcpDefs];
    } catch {
      return builtins;
    }
  }

  async dispatch(name: string, args: Record<string, unknown>, ctx: ToolExecCtx): Promise<string> {
    const tool = this.tools.get(name);
    if (tool) return tool.execute(args, ctx);

    if (this.mcp) {
      const [serverName, ...rest] = name.split('.');
      if (rest.length > 0 && serverName) {
        const toolName = rest.join('.');
        return this.mcp.callTool(serverName, toolName, args);
      }
    }

    return JSON.stringify({ error: `알 수 없는 도구: ${name}` });
  }
}
