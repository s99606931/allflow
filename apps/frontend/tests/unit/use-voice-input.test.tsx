/**
 * TEST-F12 — useVoiceInput unit tests.
 * window.SpeechRecognition을 Fake 구현으로 교체하여 검증.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVoiceInput } from '@/lib/hooks/use-voice-input';

type SpeechResultHandler = (e: { results: { length: number; [i: number]: { [j: number]: { transcript: string } } } }) => void;

class FakeSpeechRecognition {
  static last: FakeSpeechRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: SpeechResultHandler | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;

  constructor() {
    FakeSpeechRecognition.last = this;
  }

  start() { this.started = true; }
  stop() { this.stopped = true; this.onend?.(); }

  triggerResult(transcript: string) {
    this.onresult?.({
      results: {
        length: 1,
        0: { 0: { transcript } },
      },
    });
  }
}

beforeEach(() => {
  FakeSpeechRecognition.last = null;
  vi.stubGlobal('SpeechRecognition', FakeSpeechRecognition);
  Object.defineProperty(window, 'SpeechRecognition', {
    value: FakeSpeechRecognition,
    writable: true,
    configurable: true,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useVoiceInput (TEST-F12)', () => {
  it('supported=true after mount when SpeechRecognition exists', async () => {
    const { result } = renderHook(() => useVoiceInput(vi.fn()));

    await act(async () => { /* flush useEffect */ });

    expect(result.current.supported).toBe(true);
  });

  it('start: sets listening=true and creates recognition instance', () => {
    const { result } = renderHook(() => useVoiceInput(vi.fn()));

    act(() => {
      result.current.start();
    });

    expect(result.current.listening).toBe(true);
    expect(FakeSpeechRecognition.last).not.toBeNull();
    expect(FakeSpeechRecognition.last!.started).toBe(true);
    expect(FakeSpeechRecognition.last!.lang).toBe('ko-KR');
  });

  it('onresult: transcript is passed to callback', () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput(onTranscript));

    act(() => { result.current.start(); });

    act(() => {
      FakeSpeechRecognition.last!.triggerResult('안녕하세요');
    });

    expect(onTranscript).toHaveBeenCalledWith('안녕하세요');
  });

  it('stop: sets listening=false', () => {
    const { result } = renderHook(() => useVoiceInput(vi.fn()));

    act(() => { result.current.start(); });
    expect(result.current.listening).toBe(true);

    act(() => { result.current.stop(); });
    expect(result.current.listening).toBe(false);
  });

  it('onend: sets listening=false', () => {
    const { result } = renderHook(() => useVoiceInput(vi.fn()));

    act(() => { result.current.start(); });

    act(() => {
      FakeSpeechRecognition.last!.onend?.();
    });

    expect(result.current.listening).toBe(false);
  });

  it('onerror: sets listening=false', () => {
    const { result } = renderHook(() => useVoiceInput(vi.fn()));

    act(() => { result.current.start(); });

    act(() => {
      FakeSpeechRecognition.last!.onerror?.();
    });

    expect(result.current.listening).toBe(false);
  });
});
