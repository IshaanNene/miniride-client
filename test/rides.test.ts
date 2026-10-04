import { describe, expect, it, vi } from "vitest";
import { requestRide } from "../src/api/rides";

const place = { name: "A", lat: 1, lng: 2 };
const ride = { id: "r1", status: "driver_assigned", city: "sf", pickup: place, dropoff: place, driver: null, distanceKm: 1 };

function timeoutError() {
  return new DOMException("signal timed out", "TimeoutError");
}

describe("requestRide", () => {
  it("reuses one idempotency key across timeout retries", async () => {
    const keys: string[] = [];
    let calls = 0;
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      keys.push(JSON.parse(String(init?.body)).variables.input.idempotencyKey);
      calls += 1;
      if (calls < 3) throw timeoutError();
      return new Response(JSON.stringify({ data: { requestRide: ride } }));
    }) as unknown as typeof fetch;
    const r = await requestRide({ city: "sf", pickup: place, dropoff: place }, { fetchImpl, retries: 2 });
    expect(r.id).toBe("r1");
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("gives matching enough time on slow networks", async () => {
    let seenTimeout = 0;
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      seenTimeout = init?.signal ? 1 : 0;
      return new Response(JSON.stringify({ data: { requestRide: ride } }));
    }) as unknown as typeof fetch;
    await requestRide({ city: "sf", pickup: place, dropoff: place }, { fetchImpl });
    expect(seenTimeout).toBe(1);
  });

  it("does not retry GraphQL errors", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ errors: [{ message: "No drivers available", extensions: { code: "NO_DRIVERS" } }] })),
    ) as unknown as typeof fetch;
    await expect(requestRide({ city: "sf", pickup: place, dropoff: place }, { fetchImpl })).rejects.toThrow("No drivers");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const fetchImpl = vi.fn(async () => {
      throw timeoutError();
    }) as unknown as typeof fetch;
    await expect(
      requestRide({ city: "sf", pickup: place, dropoff: place }, { fetchImpl, retries: 1 }),
    ).rejects.toThrow("timed out");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
