import { describe, expect, it } from "vitest";
import { decodePush, encodePush, takeLaunchPush } from "../src/notifications/push";

describe("push payloads", () => {
  it("round-trips through base64url", () => {
    const p = { deepLink: "/ride/abc", title: "Driver arriving?/+" };
    expect(decodePush(encodePush(p))).toEqual(p);
  });

  it("rejects garbage", () => {
    expect(decodePush("%%%")).toBeNull();
    expect(decodePush(encodePush({ deepLink: 5 } as never))).toBeNull();
  });

  it("removes the payload from the URL on launch", () => {
    history.replaceState(null, "", `/?push=${encodePush({ deepLink: "/notifications" })}&x=1`);
    expect(takeLaunchPush()?.deepLink).toBe("/notifications");
    expect(location.search).toBe("?x=1");
  });
});
