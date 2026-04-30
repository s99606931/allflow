/**
 * Dependency cycle detection for Task Gantt chart.
 *
 * 알고리즘: DFS visiting-set. 새 의존성 (predecessor → successor) 추가 시
 * successor 부터 출발해 predecessor 에 도달 가능하면 사이클이 형성된다.
 *
 * 자기 참조 (predecessor == successor) 도 사이클로 처리한다.
 */
import type { PrismaClient } from '@prisma/client';

export async function wouldCreateCycle(
  predecessorId: string,
  successorId: string,
  prisma: PrismaClient,
): Promise<boolean> {
  if (predecessorId === successorId) return true;

  const visited = new Set<string>();
  const stack: string[] = [successorId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const next = await prisma.taskDependency.findMany({
      where: { predecessorId: current },
      select: { successorId: true },
    });
    for (const dep of next) stack.push(dep.successorId);
  }

  return false;
}

/**
 * 메모리 기반 사이클 감지 — 단위 테스트 / 사전 그래프가 주어진 경우에만 사용.
 *
 * 그래프는 인접 리스트 형태: { predecessorId: [successorId, ...] }.
 */
export function wouldCreateCycleInGraph(
  predecessorId: string,
  successorId: string,
  graph: ReadonlyMap<string, ReadonlyArray<string>>,
): boolean {
  if (predecessorId === successorId) return true;

  const visited = new Set<string>();
  const stack: string[] = [successorId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const next = graph.get(current) ?? [];
    for (const s of next) stack.push(s);
  }

  return false;
}
