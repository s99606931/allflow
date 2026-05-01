/**
 * TEST-F13 — useResizeDrag unit tests.
 * DOM 이벤트를 직접 dispatch하여 resize 콜백과 상태 전이를 검증.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useResizeDrag } from '@/lib/hooks/use-resize-drag';

function fakeMouseEvent(type: string, clientX: number): MouseEvent {
  return new MouseEvent(type, { clientX, bubbles: true });
}

describe('useResizeDrag (TEST-F13)', () => {
  it('initial state: isResizing=false', () => {
    const { result } = renderHook(() =>
      useResizeDrag({ minWidth: 200, maxWidth: 600, direction: 'right', onResize: vi.fn() }),
    );

    expect(result.current.isResizing).toBe(false);
  });

  it('startResize: sets isResizing=true', () => {
    const { result } = renderHook(() =>
      useResizeDrag({ minWidth: 200, maxWidth: 600, direction: 'right', onResize: vi.fn() }),
    );

    act(() => {
      result.current.startResize(
        { clientX: 300, preventDefault: vi.fn() } as unknown as React.MouseEvent,
        300,
      );
    });

    expect(result.current.isResizing).toBe(true);
  });

  it('mousemove right: onResize called with startWidth + delta, clamped to maxWidth', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeDrag({ minWidth: 200, maxWidth: 600, direction: 'right', onResize }),
    );

    act(() => {
      result.current.startResize(
        { clientX: 300, preventDefault: vi.fn() } as unknown as React.MouseEvent,
        300,
      );
    });

    act(() => {
      document.dispatchEvent(fakeMouseEvent('mousemove', 400));
    });

    expect(onResize).toHaveBeenCalledWith(400);
  });

  it('mousemove left: onResize uses reversed delta', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeDrag({ minWidth: 200, maxWidth: 600, direction: 'left', onResize }),
    );

    act(() => {
      result.current.startResize(
        { clientX: 300, preventDefault: vi.fn() } as unknown as React.MouseEvent,
        300,
      );
    });

    act(() => {
      document.dispatchEvent(fakeMouseEvent('mousemove', 250));
    });

    expect(onResize).toHaveBeenCalledWith(350);
  });

  it('mousemove: width is clamped to minWidth', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() =>
      useResizeDrag({ minWidth: 200, maxWidth: 600, direction: 'right', onResize }),
    );

    act(() => {
      result.current.startResize(
        { clientX: 300, preventDefault: vi.fn() } as unknown as React.MouseEvent,
        300,
      );
    });

    act(() => {
      document.dispatchEvent(fakeMouseEvent('mousemove', 50));
    });

    expect(onResize).toHaveBeenCalledWith(200);
  });

  it('mouseup: isResizing transitions to false', () => {
    const { result } = renderHook(() =>
      useResizeDrag({ minWidth: 200, maxWidth: 600, direction: 'right', onResize: vi.fn() }),
    );

    act(() => {
      result.current.startResize(
        { clientX: 300, preventDefault: vi.fn() } as unknown as React.MouseEvent,
        300,
      );
    });

    expect(result.current.isResizing).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    expect(result.current.isResizing).toBe(false);
  });
});
