import type { PrismaClient } from '@prisma/client';

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
    name: 'search_docs',
    description: '워크스페이스 문서를 검색합니다',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '검색어' } },
      required: ['query'],
    },
    async execute(args, prisma) {
      const docs = await prisma.doc.findMany({
        where: {
          OR: [{ title: { contains: String(args.query), mode: 'insensitive' } }],
          deletedAt: null,
        },
        take: 5,
        select: { id: true, title: true, updatedAt: true },
      });
      return JSON.stringify(docs);
    },
  },
];

export class ToolDispatcher {
  private readonly tools: Map<string, AiTool>;

  constructor(tools: AiTool[]) {
    this.tools = new Map(tools.map((t) => [t.name, t]));
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
    if (!tool) return JSON.stringify({ error: `알 수 없는 도구: ${name}` });
    return tool.execute(args, prisma);
  }
}
