import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { PrismaClient } from '@prisma/client';

export interface McpTool {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface StdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface SseConfig {
  url: string;
}

type McpConfig = StdioConfig | SseConfig;

function isSseConfig(config: unknown): config is SseConfig {
  return typeof config === 'object' && config !== null && 'url' in config;
}

function isStdioConfig(config: unknown): config is StdioConfig {
  return typeof config === 'object' && config !== null && 'command' in config;
}

interface ActiveClient {
  serverName: string;
  client: Client;
  transport: SSEClientTransport | StdioClientTransport;
}

export class McpClientManager {
  private readonly prisma: PrismaClient;
  private readonly clients: Map<string, ActiveClient> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private async buildClient(
    name: string,
    transport: string,
    config: McpConfig,
  ): Promise<ActiveClient | null> {
    const client = new Client({ name: 'all-flow', version: '1.0.0' });

    if (transport === 'sse') {
      if (!isSseConfig(config)) return null;
      const t = new SSEClientTransport(new URL(config.url));
      await client.connect(t);
      return { serverName: name, client, transport: t };
    }

    if (transport === 'stdio') {
      if (!isStdioConfig(config)) return null;
      const t = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
        stderr: 'pipe',
      });
      await client.connect(t);
      return { serverName: name, client, transport: t };
    }

    return null;
  }

  private async ensureClient(
    id: string,
    name: string,
    transport: string,
    config: McpConfig,
  ): Promise<ActiveClient | null> {
    const existing = this.clients.get(id);
    if (existing) return existing;

    const active = await this.buildClient(name, transport, config);
    if (active) this.clients.set(id, active);
    return active;
  }

  async listTools(): Promise<McpTool[]> {
    const connections = await this.prisma.mcpConnection.findMany({
      where: { isEnabled: true },
      select: { id: true, name: true, transport: true, config: true },
    });

    const results: McpTool[] = [];

    for (const conn of connections) {
      try {
        const active = await this.ensureClient(
          conn.id,
          conn.name,
          conn.transport,
          conn.config as unknown as McpConfig,
        );
        if (!active) continue;

        const { tools } = await active.client.listTools();
        for (const t of tools) {
          results.push({
            serverName: conn.name,
            name: t.name,
            description: t.description ?? '',
            inputSchema: t.inputSchema as Record<string, unknown>,
          });
        }
      } catch {
        // Connection failed — skip, do not crash the aggregate
      }
    }

    return results;
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const conn = await this.prisma.mcpConnection.findFirst({
      where: { name: serverName, isEnabled: true },
      select: { id: true, name: true, transport: true, config: true },
    });

    if (!conn) {
      return JSON.stringify({ error: `MCP 서버를 찾을 수 없습니다: ${serverName}` });
    }

    try {
      const active = await this.ensureClient(
        conn.id,
        conn.name,
        conn.transport,
        conn.config as unknown as McpConfig,
      );

      if (!active) {
        return JSON.stringify({ error: `MCP 연결 설정이 잘못되었습니다: ${serverName}` });
      }

      const result = await active.client.callTool({ name: toolName, arguments: args });
      return JSON.stringify(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ error: `MCP 도구 호출 실패: ${msg}` });
    }
  }

  async close(): Promise<void> {
    const closeAll = Array.from(this.clients.values()).map(({ client }) =>
      client.close().catch(() => undefined),
    );
    await Promise.all(closeAll);
    this.clients.clear();
  }
}
