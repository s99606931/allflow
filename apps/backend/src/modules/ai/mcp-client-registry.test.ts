import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { McpClientManager } from './mcp-client-registry.js';

// biome-ignore lint/suspicious/noExplicitAny: 테스트 mock
type AnyArgs = any;

function makePrisma(connections: AnyArgs[] = []): PrismaClient {
  return {
    mcpConnection: {
      findMany: vi.fn().mockResolvedValue(connections),
      findFirst: vi.fn().mockResolvedValue(connections[0] ?? null),
    },
  } as unknown as PrismaClient;
}

describe('McpClientManager', () => {
  it('생성 성공', () => {
    const manager = new McpClientManager(makePrisma());
    expect(manager).toBeInstanceOf(McpClientManager);
  });

  it('listTools() — DB에 활성화된 연결 없을 때 빈 배열 반환', async () => {
    const manager = new McpClientManager(makePrisma([]));
    const tools = await manager.listTools();
    expect(tools).toEqual([]);
  });

  it('listTools() — 연결 실패 시 해당 연결 건너뜀 (빈 배열 반환)', async () => {
    const connections = [
      {
        id: 'c1',
        name: 'broken-server',
        transport: 'stdio',
        config: { command: 'nonexistent-cmd-xyz' },
      },
    ];
    const manager = new McpClientManager(makePrisma(connections));
    const tools = await manager.listTools();
    expect(Array.isArray(tools)).toBe(true);
    // 연결 실패 시 오류 없이 빈 배열 반환 (swallowed)
    expect(tools.length).toBe(0);
  });

  it('callTool() — 없는 서버 이름으로 호출 시 에러 메시지 반환', async () => {
    const manager = new McpClientManager(makePrisma([]));
    const result = await manager.callTool('unknown-server', 'some-tool', {});
    const parsed = JSON.parse(result) as { error: string };
    expect(parsed.error).toContain('unknown-server');
  });

  it('callTool() — 잘못된 config 의 서버는 에러 메시지 반환', async () => {
    const connections = [
      { id: 'c2', name: 'bad-config-server', transport: 'sse', config: { noUrl: true } },
    ];
    const manager = new McpClientManager(makePrisma(connections));
    const result = await manager.callTool('bad-config-server', 'tool', {});
    const parsed = JSON.parse(result) as { error: string };
    expect(typeof parsed.error).toBe('string');
  });

  it('close() — 빈 상태에서 호출해도 오류 없음', async () => {
    const manager = new McpClientManager(makePrisma([]));
    await expect(manager.close()).resolves.toBeUndefined();
  });
});
