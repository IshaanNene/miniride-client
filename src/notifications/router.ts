// Deep-link routing for notifications (in-app and push).
//
// v1 (default): wait until the session is restored, then navigate.
// v2 (flag notif_router_v2): navigates immediately — the ride screen loads its own data, so there is
// no need to wait for the session restore — and resolves ride links against the active ride so the
// screen can open with the driver card prefilled, tagging the navigation with the rider id.
import { FLAGS, flag } from "../flags";
import { sessionStore, whenHydrated } from "../store/session";
import { analytics } from "../telemetry/analytics";

export type Navigate = (to: string, opts?: { state?: unknown }) => void;

const RIDE_LINK = /^\/ride\/([\w-]+)$/;
const NOTIFICATION_LINK = /^\/notifications\/([\w-]+)$/;

export function isSupportedLink(link: string): boolean {
  return RIDE_LINK.test(link) || NOTIFICATION_LINK.test(link) || link === "/notifications" || link === "/";
}

async function routeV1(link: string, navigate: Navigate) {
  await whenHydrated();
  navigate(isSupportedLink(link) ? link : "/");
}

async function routeV2(link: string, navigate: Navigate) {
  await whenHydrated();
  const state = sessionStore.getState();
  const riderId = state.session!.riderId;
  const rideMatch = RIDE_LINK.exec(link);
  if (rideMatch) {
    const prefill = state.activeRide?.id === rideMatch[1] ? state.activeRide : null;
    navigate(link, { state: { prefill, riderId } });
    return;
  }
  navigate(isSupportedLink(link) ? link : "/", { state: { riderId } });
}

export async function routeDeepLink(link: string, navigate: Navigate, source: "push" | "in_app") {
  const v2 = flag(FLAGS.notifRouterV2);
  analytics.track("deep_link_open", { source, router: v2 ? "v2" : "v1" });
  if (v2) await routeV2(link, navigate);
  else await routeV1(link, navigate);
}
