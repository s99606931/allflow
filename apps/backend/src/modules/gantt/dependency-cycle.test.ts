import { describe, expect, it } from 'vitest';
import { wouldCreateCycleInGraph } from './dependency-cycle.js';

describe('dependency-cycle.wouldCreateCycleInGraph', () => {
  it('자기 참조 (A → A) 는 사이클', () => {
    expect(wouldCreateCycleInGraph('A', 'A', new Map())).toBe(true);
  });

  it('빈 그래프에서 새 의존성은 사이클 아님', () => {
    expect(wouldCreateCycleInGraph('A', 'B', new Map())).toBe(false);
  });

  it('2-노드 사이클 (A→B 추가 시 B→A 가 이미 존재)', () => {
    const graph = new Map<string, ReadonlyArray<string>>([['B', ['A']]]);
    expect(wouldCreateCycleInGraph('A', 'B', graph)).toBe(true);
  });

  it('2-노드 비-사이클 (A→B 추가 시 C→D 만 존재)', () => {
    const graph = new Map<string, ReadonlyArray<string>>([['C', ['D']]]);
    expect(wouldCreateCycleInGraph('A', 'B', graph)).toBe(false);
  });

  it('3-노드 사이클 (A→B 추가 시 B→C, C→A 존재)', () => {
    const graph = new Map<string, ReadonlyArray<string>>([
      ['B', ['C']],
      ['C', ['A']],
    ]);
    expect(wouldCreateCycleInGraph('A', 'B', graph)).toBe(true);
  });

  it('3-노드 체인은 사이클 아님 (A→B→C 만 존재, A→C 추가는 OK)', () => {
    const graph = new Map<string, ReadonlyArray<string>>([
      ['A', ['B']],
      ['B', ['C']],
    ]);
    expect(wouldCreateCycleInGraph('A', 'C', graph)).toBe(false);
  });

  it('분기 그래프 사이클 (B→D, C→D 가 있어도 D→A 없으면 A→B 추가는 OK)', () => {
    const graph = new Map<string, ReadonlyArray<string>>([
      ['B', ['D']],
      ['C', ['D']],
    ]);
    expect(wouldCreateCycleInGraph('A', 'B', graph)).toBe(false);
  });

  it('깊은 사이클 (A→B 추가 시 B→C→D→E→A)', () => {
    const graph = new Map<string, ReadonlyArray<string>>([
      ['B', ['C']],
      ['C', ['D']],
      ['D', ['E']],
      ['E', ['A']],
    ]);
    expect(wouldCreateCycleInGraph('A', 'B', graph)).toBe(true);
  });
});
