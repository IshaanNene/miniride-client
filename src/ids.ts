// Stable per-install analytics id and per-launch session id.
const ANALYTICS_KEY = "miniride.analytics_id";

function uuid(): string {
  return crypto.randomUUID();
}

export function analyticsId(storage: Storage = localStorage): string {
  let id = storage.getItem(ANALYTICS_KEY);
  if (!id) {
    id = uuid();
    storage.setItem(ANALYTICS_KEY, id);
  }
  return id;
}

export const sessionId: string = uuid();

export function newIdempotencyKey(): string {
  return uuid();
}
