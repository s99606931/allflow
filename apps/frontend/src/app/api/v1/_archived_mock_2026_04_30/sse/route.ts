import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-Sent Events stub stream — emits the same sample events that the
// client-side mock loop produces. Replace with a real broker (Redis pub/sub,
// Kafka, etc.) when a backend lands.
export function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Initial hello so EventSource transitions to OPEN promptly.
      send({ type: 'presence', payload: { userId: 'system', online: true, lastSeen: new Date().toISOString() } });

      let i = 0;
      const tick = () => {
        const samples = [
          { type: 'notification', payload: { id: 'n-' + Date.now(), kind: 'mention', title: '@김민수 - 디자인 검토 요청', time: new Date().toISOString(), read: false } },
          { type: 'activity', payload: { who: '이서연', what: 'PRJ-204', target: 'CJ ENM 영상 분석', verb: '상태 변경', time: new Date().toISOString(), proj: 'PRJ-204', kind: 'status' } },
          { type: 'presence', payload: { userId: 'u-park', online: true, lastSeen: new Date().toISOString() } },
          { type: 'chat', payload: { channelId: 'general', messageId: 'm-' + Date.now(), authorId: 'u-kim', text: '회의록 업로드했습니다', time: new Date().toISOString() } },
        ];
        send(samples[i++ % samples.length]);
      };
      const interval = setInterval(tick, 5000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
