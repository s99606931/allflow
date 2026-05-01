/**
 * TEST-F10 — useFileAttach unit tests.
 * attach / remove / clear 상태 관리 + 파일 유효성 검사 + upload fetch 격리.
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFileAttach } from '@/lib/hooks/use-file-attach';

let mockFetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function makeFile(name: string, type: string, size = 100): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

describe('useFileAttach (TEST-F10)', () => {
  it('initial state: files array is empty', () => {
    const { result } = renderHook(() => useFileAttach());
    expect(result.current.files).toHaveLength(0);
  });

  it('attach: valid file → added with uploading=true', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ storageKey: 'sk-1' }) });

    const { result } = renderHook(() => useFileAttach());
    const file = makeFile('doc.txt', 'text/plain');

    act(() => {
      result.current.attach([file]);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]?.uploading).toBe(true);
    expect(result.current.files[0]?.file.name).toBe('doc.txt');
    // drain async upload to avoid act() warning
    await waitFor(() => expect(result.current.files[0]?.uploading).toBe(false));
  });

  it('attach: oversized file (>10MB) → ignored', () => {
    const { result } = renderHook(() => useFileAttach());
    const bigFile = makeFile('big.txt', 'text/plain', 11 * 1024 * 1024);

    act(() => {
      result.current.attach([bigFile]);
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('attach: unsupported MIME type → ignored', () => {
    const { result } = renderHook(() => useFileAttach());
    const exe = makeFile('app.exe', 'application/x-msdownload');

    act(() => {
      result.current.attach([exe]);
    });

    expect(result.current.files).toHaveLength(0);
  });

  it('attach: upload success → uploading transitions to false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storageKey: 'sk-2', base64: 'data:text/plain;base64,aGVsbG8=' }),
    });

    const { result } = renderHook(() => useFileAttach());
    const file = makeFile('readme.txt', 'text/plain');

    act(() => {
      result.current.attach([file]);
    });

    await waitFor(() => expect(result.current.files[0]?.uploading).toBe(false));
    expect(result.current.files[0]?.error).toBeUndefined();
  });

  it('attach: upload failure → uploading=false, error set', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useFileAttach());
    const file = makeFile('data.csv', 'text/csv');

    act(() => {
      result.current.attach([file]);
    });

    await waitFor(() => expect(result.current.files[0]?.uploading).toBe(false));
    expect(result.current.files[0]?.error).toBe('업로드 실패');
  });

  it('remove: removes file by id', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ storageKey: 'sk' }) });

    const { result } = renderHook(() => useFileAttach());

    act(() => {
      result.current.attach([makeFile('a.txt', 'text/plain'), makeFile('b.pdf', 'application/pdf')]);
    });

    expect(result.current.files).toHaveLength(2);
    const firstId = result.current.files[0]!.id;

    act(() => {
      result.current.remove(firstId);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]!.id).not.toBe(firstId);
  });

  it('clear: empties files array', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ storageKey: 'sk' }) });

    const { result } = renderHook(() => useFileAttach());

    act(() => {
      result.current.attach([makeFile('x.txt', 'text/plain')]);
    });

    expect(result.current.files).toHaveLength(1);
    // wait for upload to settle before clearing to avoid act() warning
    await waitFor(() => expect(result.current.files[0]?.uploading).toBe(false));

    act(() => {
      result.current.clear();
    });

    expect(result.current.files).toHaveLength(0);
  });
});
