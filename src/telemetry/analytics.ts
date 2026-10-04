// Product analytics: a bounded in-memory buffer flushed to the gateway in batches.
import { config } from "../config";
import { analyticsId, sessionId } from "../ids";

export interface AnalyticsEvent {
  name: string;
  ts: number;
  props?: Record<string, string | number | boolean>;
}

type Listener = (e: AnalyticsEvent) => void;

const MAX_BUFFER = 500;
const FLUSH_MS = 10_000;

class Analytics {
  private buffer: AnalyticsEvent[] = [];
  private dropped = 0;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | undefined;

  track(name: string, props?: AnalyticsEvent["props"]) {
    const e: AnalyticsEvent = { name, ts: Date.now(), props };
    if (this.buffer.length >= MAX_BUFFER) {
      this.buffer.shift();
      this.dropped += 1;
    }
    this.buffer.push(e);
    for (const l of this.listeners) l(e);
  }

  /** Observe every event (used by in-app diagnostics such as bug reports). */
  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  start(send: (body: string) => void = defaultSend) {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(send), FLUSH_MS);
    addEventListener("pagehide", () => this.flush(send));
  }

  flush(send: (body: string) => void = defaultSend) {
    if (!this.buffer.length) return;
    const events = this.buffer;
    this.buffer = [];
    const body = JSON.stringify({
      session_id: sessionId,
      analytics_id: analyticsId(),
      app_version: config.appVersion,
      dropped: this.dropped,
      events,
    });
    this.dropped = 0;
    send(body);
  }

  get pending(): number {
    return this.buffer.length;
  }
}

function defaultSend(body: string) {
  const url = `${config.gatewayUrl}/analytics`;
  if (navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
  void fetch(url, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(
    () => undefined,
  );
}

export const analytics = new Analytics();
