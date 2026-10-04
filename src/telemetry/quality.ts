// App-quality tooling: Vitals (crashes, hangs, performance) and BugDrop (in-app bug reports).
import { config } from "../config";
import { exposures } from "../flags";
import { analyticsId, sessionId } from "../ids";
import { sessionStore } from "../store/session";
import * as BugDrop from "../vendor/bugdrop";
import * as Vitals from "../vendor/vitals";
import { deviceInfo } from "../vendor/vitals/device";
import { analytics } from "./analytics";

/** UI state captured in bug reports: route, visibility and the store slices that matter. */
export function uiState(): BugDrop.UiState {
  const s = sessionStore.getState();
  return {
    route: location.pathname,
    visibility: document.visibilityState,
    hydrated: s.hydrated,
    city: s.session?.city ?? null,
    activeRideId: s.activeRide?.id ?? null,
    activeRideStatus: s.activeRide?.status ?? null,
    hasTrip: Boolean(s.pickup && s.dropoff),
  };
}

const city = () => sessionStore.getState().session?.city;

export function setupQuality() {
  if (config.vitalsUrl) {
    Vitals.init({
      endpoint: config.vitalsUrl,
      app: config.appName,
      version: config.appVersion,
      sessionId,
      analyticsId: analyticsId(),
      getFlags: exposures,
      getCity: city,
      getRoute: () => location.pathname,
      onCrash: () => analytics.flush(),
    });
  }
  if (config.bugdropUrl) {
    BugDrop.init({
      endpoint: config.bugdropUrl,
      app: config.appName,
      version: config.appVersion,
      sessionId,
      analyticsId: analyticsId(),
      getUiState: uiState,
      getFlags: exposures,
      getCity: city,
      getDevice: () => deviceInfo(),
    });
    Vitals.perf.subscribe((s) => BugDrop.recordPerf({ ...s }));
    BugDrop.mountButton();
  }
  analytics.subscribe((e) => {
    BugDrop.recordAnalytics(e);
    Vitals.breadcrumb("analytics", e.name, e.props ?? {});
  });
}

/** Called once flags are known: the session (with flag exposures) is Vitals' crash-rate denominator. */
export function reportSessionStart() {
  if (config.vitalsUrl) Vitals.startSession();
}
