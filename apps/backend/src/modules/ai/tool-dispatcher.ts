import type { PrismaClient } from '@prisma/client';
import type { McpClientManager } from './mcp-client-registry.js';

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>, prisma: PrismaClient): Promise<string>;
}

export const BUILTIN_TOOLS: AiTool[] = [
  {
    name: 'search_tasks',
    description: '워크스페이스에서 태스크를 검색합니다',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '검색어' } },
      required: ['query'],
    },
    async execute(args, prisma) {
      const tasks = await prisma.task.findMany({
        where: {
          OR: [{ title: { contains: String(args.query), mode: 'insensitive' } }],
          deletedAt: null,
        },
        take: 5,
        select: { id: true, title: true, status: true },
      });
      return JSON.stringify(tasks);
    },
  },
  {
    name: 'search_issues',
    description: '워크스페이스 이슈를 검색합니다',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '검색어' } },
      required: ['query'],
    },
    async execute(args, prisma) {
      const issues = await prisma.issue.findMany({
        where: {
          OR: [{ title: { contains: String(args.query), mode: 'insensitive' } }],
          deletedAt: null,
        },
        take: 5,
        select: { id: true, title: true, status: true },
      });
      return JSON.stringify(issues);
    },
  },
];

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

  async dispatch(
    name: string,
    args: Record<string, unknown>,
    prisma: PrismaClient,
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (tool) return tool.execute(args, prisma);

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
