// Browser tracing: fetch spans with W3C trace context propagated to the gateway.
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { config } from "../config";
import { sessionId } from "../ids";

export function setupTracing() {
  if (!config.otlpTracesUrl) return;
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "miniride-client",
      [ATTR_SERVICE_VERSION]: config.appVersion,
      "session.id": sessionId,
    }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: config.otlpTracesUrl }))],
  });
  provider.register();
  const gateway = new RegExp(`^${config.gatewayUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [gateway],
        ignoreUrls: [/\/analytics$/, /\/api\/frontend/, /\/v1\/traces$/],
      }),
    ],
  });
}
