/**
 * OpenTelemetry SDK boot hook (Step 8 — monorepo-microservices-2026-04-30 PRD §5.1 #8).
 *
 * 책임:
 *  - OTEL_ENABLED=true 일 때만 NodeSDK 초기화 (lazy dynamic import).
 *  - sdk.start() 는 Fastify 인스턴스 생성 *이전* 에 호출해야 auto-instrumentations 가
 *    require 시점 hook 을 잡을 수 있다 → server.ts boot 진입 즉시 await initOtel().
 *  - Endpoint 미지정 시 disabled 로 fallback + warn log (crash 금지).
 *  - graceful shutdown 은 server.ts shutdown 시 handle.shutdown() 호출.
 *
 * 본 cycle 은 traces only (메트릭/로그는 별도 사이클). Sampling 은 SDK 기본 (parent-based 1.0).
 *
 * Default off — OTEL_ENABLED 미설정 시 sdk-node 모듈 require 자체를 skip 한다 (cold-start 비용 0).
 */

export interface OtelInitOptions {
  OTEL_ENABLED?: boolean;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_SERVICE_NAME?: string;
  NODE_ENV?: string;
}

export interface OtelHandle {
  enabled: boolean;
  serviceName: string;
  endpoint: string | null;
  shutdown: () => Promise<void>;
}

const NOOP_SHUTDOWN = async (): Promise<void> => {};

const DEFAULT_SERVICE_NAME = 'all-flow-backend';

export async function initOtel(options: OtelInitOptions): Promise<OtelHandle> {
  const serviceName = options.OTEL_SERVICE_NAME ?? DEFAULT_SERVICE_NAME;

  if (!options.OTEL_ENABLED) {
    return { enabled: false, serviceName, endpoint: null, shutdown: NOOP_SHUTDOWN };
  }

  if (!options.OTEL_EXPORTER_OTLP_ENDPOINT) {
    process.stderr.write(
      '[otel] OTEL_ENABLED=true 이지만 OTEL_EXPORTER_OTLP_ENDPOINT 가 누락되었습니다 → disabled 로 부팅합니다.\n',
    );
    return { enabled: false, serviceName, endpoint: null, shutdown: NOOP_SHUTDOWN };
  }

  try {
    // Lazy dynamic import — disabled 경로는 sdk-node 를 require 하지 않는다.
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import(
      '@opentelemetry/auto-instrumentations-node'
    );
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

    const endpoint = options.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '');
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // fs 계측은 노이즈가 많아 비활성화
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();

    return {
      enabled: true,
      serviceName,
      endpoint,
      shutdown: async () => {
        try {
          await sdk.shutdown();
        } catch (err) {
          process.stderr.write(`[otel] shutdown error: ${(err as Error).message}\n`);
        }
      },
    };
  } catch (err) {
    process.stderr.write(`[otel] init failed: ${(err as Error).message} → disabled\n`);
    return { enabled: false, serviceName, endpoint: null, shutdown: NOOP_SHUTDOWN };
  }
}
