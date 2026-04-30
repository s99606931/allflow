'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeEventSchema, type RealtimeEvent } from './schemas';

type EventType = RealtimeEvent['type'];
type Listener<T extends EventType = EventType> = (
  payload: Extract<RealtimeEvent, { type: T }>['payload'],
) => void;

interface RealtimeClient {
  connect: () => void;
  disconnect: () => void;
  send: (msg: unknown) => void;
  subscribe: <T extends EventType>(type: T, fn: Listener<T>) => () => void;
  status: () => 'idle' | 'connecting' | 'open' | 'closed';
  onStatus: (fn: (s: ReturnType<RealtimeClient['status']>) => void) => () => void;
}

const MODE = (process.env.NEXT_PUBLIC_REALTIME_MODE ?? 'mock') as 'ws' | 'sse' | 'mock';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
// Default to the in-app SSE stub when no explicit URL is set so `MODE=sse` works
// out of the box; override via NEXT_PUBLIC_SSE_URL when pointing at a real broker.
const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL ?? '/api/v1/sse';

function createClient(): RealtimeClient {
  const listeners = new Map<EventType, Set<Listener>>();
  const statusListeners = new Set<(s: ReturnType<RealtimeClient['status']>) => void>();
  let ws: WebSocket | null = null;
  let es: EventSource | null = null;
  let mockTimer: ReturnType<typeof setInterval> | null = null;
  let _status: ReturnType<RealtimeClient['status']> = 'idle';
  let retryDelay = 1000;
  let manualDisconnect = false;

  const setStatus = (s: typeof _status) => {
    _status = s;
    statusListeners.forEach(fn => fn(s));
  };

  const dispatch = (raw: unknown) => {
    const parsed = RealtimeEventSchema.safeParse(raw);
    if (!parsed.success) return;
    const ev = parsed.data;
    listeners.get(ev.type)?.forEach(fn => (fn as Listener)(ev.payload));
  };

  const connectWS = () => {
    if (!WS_URL) return;
    setStatus('connecting');
    ws = new WebSocket(WS_URL);
    ws.onopen = () => { retryDelay = 1000; setStatus('open'); };
    ws.onmessage = e => { try { dispatch(JSON.parse(e.data)); } catch {} };
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      setStatus('closed');
      if (manualDisconnect) return;
      retryDelay = Math.min(retryDelay * 2, 30_000);
      setTimeout(connectWS, retryDelay);
    };
  };

  const connectSSE = () => {
    if (!SSE_URL) return;
    setStatus('connecting');
    es = new EventSource(SSE_URL, { withCredentials: true });
    es.onopen = () => setStatus('open');
    es.onmessage = e => { try { dispatch(JSON.parse(e.data)); } catch {} };
    es.onerror = () => {
      setStatus('closed');
      es?.close();
      if (!manualDisconnect) setTimeout(connectSSE, 3000);
    };
  };

  const connectMock = () => {
    setStatus('open');
    const samples: RealtimeEvent[] = [
      { type: 'notification', payload: { id: 'n-' + Date.now(), kind: 'mention', title: '@김민수 - 디자인 검토 요청', time: new Date().toISOString(), read: false } },
      { type: 'activity', payload: { who: '이서연', what: 'PRJ-204', target: 'CJ ENM 영상 분석', verb: '상태 변경', time: new Date().toISOString(), proj: 'PRJ-204', kind: 'status' } },
      { type: 'presence', payload: { userId: 'u-park', online: true, lastSeen: new Date().toISOString() } },
      { type: 'chat', payload: { channelId: 'general', messageId: 'm-' + Date.now(), authorId: 'u-kim', text: '회의록 업로드했습니다', time: new Date().toISOString() } },
    ];
    let i = 0;
    mockTimer = setInterval(() => dispatch(samples[i++ % samples.length]), 5000);
  };

  return {
    connect() {
      manualDisconnect = false;
      if (MODE === 'ws') connectWS();
      else if (MODE === 'sse') connectSSE();
      else connectMock();
    },
    disconnect() {
      manualDisconnect = true;
      ws?.close(); ws = null;
      es?.close(); es = null;
      if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
      setStatus('closed');
    },
    send(msg) {
      if (MODE !== 'ws' || ws?.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify(msg));
    },
    subscribe(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn as unknown as Listener);
      return () => listeners.get(type)?.delete(fn as unknown as Listener);
    },
    status: () => _status,
    onStatus(fn) {
      statusListeners.add(fn);
      return () => { statusListeners.delete(fn); };
    },
  };
}

let _client: RealtimeClient | null = null;
export const realtime = (): RealtimeClient => {
  if (typeof window === 'undefined') {
    return { connect: () => {}, disconnect: () => {}, send: () => {}, subscribe: () => () => {}, status: () => 'idle' as const, onStatus: () => () => {} };
  }
  if (!_client) _client = createClient();
  return _client;
};

export function useRealtime() {
  const client = useMemo(() => realtime(), []);
  const [status, setStatus] = useState(client.status());
  useEffect(() => {
    client.connect();
    const off = client.onStatus(setStatus);
    return () => { off(); client.disconnect(); };
  }, [client]);
  return { status, subscribe: client.subscribe, send: client.send };
}

export function useRealtimeEvents<T extends EventType>(type: T, handler: Listener<T>) {
  const { subscribe } = useRealtime();
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; }, [handler]);
  useEffect(() => subscribe(type, p => ref.current(p)), [subscribe, type]);
}
