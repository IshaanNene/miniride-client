import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flags = vi.hoisted(() => ({ v2: false }));
vi.mock("../src/flags", () => ({
  FLAGS: { notifRouterV2: "notif_router_v2" },
  flag: () => flags.v2,
}));

import { routeDeepLink } from "../src/notifications/router";
import { hydrate, resetSessionForTests, sessionStore } from "../src/store/session";

describe.each([
  ["v1", false],
  ["v2", true],
])("deep-link router %s", (_name, v2) => {
  beforeEach(() => {
    flags.v2 = v2;
    resetSessionForTests();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("a tap right after launch waits for the session instead of crashing", async () => {
    const navigate = vi.fn();
    void hydrate({ delayMs: 350 });
    const routed = routeDeepLink("/ride/abc", navigate, "push"); // ~0 ms after launch
    await vi.advanceTimersByTimeAsync(100);
    expect(navigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    await expect(routed).resolves.toBeUndefined();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0]![0]).toBe("/ride/abc");
  });

  it("routes unknown links home", async () => {
    const navigate = vi.fn();
    void hydrate({ delayMs: 0 });
    await vi.advanceTimersByTimeAsync(0);
    await routeDeepLink("javascript:alert(1)", navigate, "in_app");
    expect(navigate.mock.calls[0]![0]).toBe("/");
  });
});

describe("router v2 prefill", () => {
  beforeEach(() => {
    flags.v2 = true;
    resetSessionForTests();
  });

  it("prefills the ride screen from the active ride", async () => {
    vi.useFakeTimers();
    void hydrate({ delayMs: 10 });
    await vi.advanceTimersByTimeAsync(20);
    vi.useRealTimers();
    const ride = { id: "r1", status: "driver_assigned", city: "sf", pickup: { name: "a", lat: 0, lng: 0 }, dropoff: { name: "b", lat: 0, lng: 0 }, driver: null, distanceKm: 1 };
    sessionStore.getState().setActiveRide(ride);
    const navigate = vi.fn();
    await routeDeepLink("/ride/r1", navigate, "push");
    expect(navigate).toHaveBeenCalledWith("/ride/r1", { state: expect.objectContaining({ prefill: ride }) });
  });
});
