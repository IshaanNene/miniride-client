import { describe, expect, it } from "vitest";
import { analytics } from "../src/telemetry/analytics";

describe("analytics", () => {
  it("bounds the buffer and reports drops", () => {
    for (let i = 0; i < 700; i++) analytics.track("eta_background_tick");
    expect(analytics.pending).toBe(500);
    let sent = "";
    analytics.flush((b) => (sent = b));
    const body = JSON.parse(sent);
    expect(body.events).toHaveLength(500);
    expect(body.dropped).toBe(200);
    expect(analytics.pending).toBe(0);
  });
});
