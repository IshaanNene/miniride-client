// Simulated push notifications. A real push opens the app with the notification payload; here
// the payload arrives as `?push=<base64url JSON>` on launch (the simulator and tests use this).
export interface PushPayload {
  notificationId?: string;
  title?: string;
  deepLink: string;
}

export function encodePush(p: PushPayload): string {
  return btoa(JSON.stringify(p)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePush(raw: string | null): PushPayload | null {
  if (!raw) return null;
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json) as PushPayload;
    return typeof p.deepLink === "string" ? p : null;
  } catch {
    return null;
  }
}

/** Reads and removes the launch push payload from the URL. */
export function takeLaunchPush(loc: Location = location, hist: History = history): PushPayload | null {
  const params = new URLSearchParams(loc.search);
  const payload = decodePush(params.get("push"));
  if (params.has("push")) {
    params.delete("push");
    const qs = params.toString();
    hist.replaceState(null, "", loc.pathname + (qs ? `?${qs}` : ""));
  }
  return payload;
}
