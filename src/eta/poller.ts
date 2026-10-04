// ETA updates while a ride is active.
//
// Visible: poll the gateway every `visibleIntervalMs`.
// Hidden (app backgrounded): stop network polling; refresh the ETA locally by dead reckoning at
// a slow cadence so the notification shade stays roughly right without burning battery.
// Becoming visible again triggers an immediate network refresh.
import { analytics } from "../telemetry/analytics";

export interface EtaSample {
  etaSeconds: number | null;
  status: string;
  source: "network" | "local";
  at: number;
}

export interface EtaPollerOptions {
  visibleIntervalMs?: number;
  backgroundIntervalMs?: number;
  doc?: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
  now?: () => number;
}

export class EtaPoller {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = true;
  private last: EtaSample | null = null;
  private readonly visibleMs: number;
  private readonly backgroundMs: number;
  private readonly doc: NonNullable<EtaPollerOptions["doc"]>;
  private readonly now: () => number;
  /** Number of scheduled ticks; exposed for diagnostics and tests. */
  ticks = 0;

  constructor(
    private readonly fetchEta: () => Promise<{ etaSeconds: number | null; status: string }>,
    private readonly onEta: (s: EtaSample) => void,
    opts: EtaPollerOptions = {},
  ) {
    this.visibleMs = opts.visibleIntervalMs ?? 5_000;
    this.backgroundMs = opts.backgroundIntervalMs ?? 30_000;
    this.doc = opts.doc ?? document;
    this.now = opts.now ?? Date.now;
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.doc.addEventListener("visibilitychange", this.onVisibility);
    void this.tick();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.doc.removeEventListener("visibilitychange", this.onVisibility);
  }

  private onVisibility = () => {
    if (this.stopped) return;
    clearTimeout(this.timer);
    analytics.track("app_visibility", { state: this.doc.visibilityState });
    void this.tick();
  };

  private schedule(delayMs: number) {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private async tick() {
    if (this.stopped) return;
    this.ticks += 1;
    if (this.doc.visibilityState === "hidden") {
      this.refreshLocally();
      this.schedule(this.backgroundMs);
      return;
    }
    try {
      const r = await this.fetchEta();
      this.emit({ etaSeconds: r.etaSeconds, status: r.status, source: "network", at: this.now() });
      analytics.track("eta_refresh", { source: "network" });
      if (r.status === "completed") {
        this.stop();
        return;
      }
    } catch {
      analytics.track("eta_refresh_failed");
    }
    this.schedule(this.visibleMs);
  }

  /** Dead reckoning: count the last known ETA down by elapsed time. */
  private refreshLocally() {
    if (!this.last || this.last.etaSeconds === null) return;
    const elapsed = Math.floor((this.now() - this.last.at) / 1000);
    const eta = Math.max(0, this.last.etaSeconds - elapsed);
    this.onEta({ ...this.last, etaSeconds: eta, source: "local" });
    analytics.track("eta_background_tick");
  }

  private emit(s: EtaSample) {
    this.last = s;
    this.onEta(s);
  }
}
