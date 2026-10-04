import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EtaPoller, type EtaSample } from "../src/eta/poller";

function fakeDoc(initial: DocumentVisibilityState = "visible") {
  const listeners = new Set<() => void>();
  return {
    visibilityState: initial,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    set(state: DocumentVisibilityState) {
      this.visibilityState = state;
      for (const l of listeners) l();
    },
  };
}

describe("EtaPoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("polls the network every 5 s while visible", async () => {
    const fetchEta = vi.fn().mockResolvedValue({ etaSeconds: 300, status: "driver_assigned" });
    const doc = fakeDoc();
    const poller = new EtaPoller(fetchEta, () => undefined, { doc: doc as unknown as Document });
    poller.start();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchEta).toHaveBeenCalledTimes(4); // t=0, 5, 10, 15
    poller.stop();
  });

  it("stops network polling and backs off while hidden", async () => {
    const fetchEta = vi.fn().mockResolvedValue({ etaSeconds: 300, status: "driver_assigned" });
    const samples: EtaSample[] = [];
    const doc = fakeDoc();
    const poller = new EtaPoller(fetchEta, (s) => samples.push(s), { doc: doc as unknown as Document });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    doc.set("hidden");
    const ticksAtHide = poller.ticks;
    await vi.advanceTimersByTimeAsync(17 * 60 * 1000); // backgrounded for 17 minutes
    expect(fetchEta).toHaveBeenCalledTimes(1);
    // 30 s cadence → ~34 local refreshes in 17 min; a zero-delay loop would be millions.
    expect(poller.ticks - ticksAtHide).toBeLessThanOrEqual(40);
    expect(samples.at(-1)?.source).toBe("local");
    poller.stop();
  });

  it("never schedules a zero-delay timer while hidden", async () => {
    const fetchEta = vi.fn().mockResolvedValue({ etaSeconds: 120, status: "driver_assigned" });
    const doc = fakeDoc();
    const spy = vi.spyOn(globalThis, "setTimeout");
    const poller = new EtaPoller(fetchEta, () => undefined, { doc: doc as unknown as Document });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    doc.set("hidden");
    await vi.advanceTimersByTimeAsync(120_000);
    const delays = spy.mock.calls.map((c) => c[1] ?? 0);
    expect(delays.filter((d) => d < 1000)).toEqual([]);
    poller.stop();
    spy.mockRestore();
  });

  it("refreshes from the network as soon as the app is visible again", async () => {
    const fetchEta = vi.fn().mockResolvedValue({ etaSeconds: 200, status: "arriving" });
    const doc = fakeDoc();
    const poller = new EtaPoller(fetchEta, () => undefined, { doc: doc as unknown as Document });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    doc.set("hidden");
    await vi.advanceTimersByTimeAsync(60_000);
    doc.set("visible");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchEta).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("stops after the trip completes", async () => {
    const fetchEta = vi.fn().mockResolvedValue({ etaSeconds: 0, status: "completed" });
    const poller = new EtaPoller(fetchEta, () => undefined, { doc: fakeDoc() as unknown as Document });
    poller.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchEta).toHaveBeenCalledTimes(1);
  });
});
