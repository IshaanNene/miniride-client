# miniride-client

The rider app for **MiniRide**, a small ride-hailing demo used as the debugging target of
[DebugAssist](https://github.com/IshaanNene/DebugAssist). Some commits in this repository's history
deliberately introduce bugs so that DebugAssist can find and fix them — do not use this code for anything real.

React 19 + TypeScript PWA (Vite). Flow: **search → price → request → driver assigned → trip**, plus a
notification center with deep links and simulated push notifications (`/?push=<base64url payload>`).

- **ETA updates** (`src/eta/poller.ts`): network polling every 5 s while visible; while backgrounded,
  local dead-reckoning every 30 s and no network.
- **Deep links** (`src/notifications/router.ts`): routing waits for the persisted session to be restored;
  router v2 sits behind the `notif_router_v2` flag (Unleash gradual rollout, `sessionId` stickiness).
- **Ride requests** (`src/api/rides.ts`): one idempotency key per request, reused across timeout retries.
- **Telemetry**: OpenTelemetry fetch spans propagate W3C trace context to the gateway; product analytics
  are batched to the gateway's `/analytics` endpoint.

```bash
pnpm install
pnpm test            # vitest unit tests
pnpm dev             # http://localhost:5173 (expects the gateway on :4000)
pnpm e2e             # Playwright against a running stack (E2E_BASE_URL, default http://localhost:8080)
```

`.DebugAssist/pipeline.yaml` tells DebugAssist how to build, test and validate this app.
