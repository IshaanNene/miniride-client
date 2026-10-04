import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "react-router";
import { createAppRouter } from "./App";
import { config } from "./config";
import { setupFlags } from "./flags";
import { routeDeepLink } from "./notifications/router";
import { takeLaunchPush } from "./notifications/push";
import { CrashScreen } from "./screens/CrashScreen";
import { hydrate, whenHydrated } from "./store/session";
import { analytics } from "./telemetry/analytics";
import { reportSessionStart, setupQuality } from "./telemetry/quality";
import { setupTracing } from "./telemetry/tracing";
import "./styles.css";

setupQuality(); // first, so crash handlers see everything
setupTracing();
analytics.start();
analytics.track("app_launch", { version: config.appVersion });

const launchPush = takeLaunchPush();
const router = createAppRouter();
const root: Root = createRoot(document.getElementById("root")!);
let crashed = false;

// An uncaught error ends the session, like a native app crash.
function crash() {
  if (crashed) return;
  crashed = true;
  analytics.track("app_crash");
  analytics.flush();
  root.render(<CrashScreen />);
}
addEventListener("error", crash);
addEventListener("unhandledrejection", crash);

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

void hydrate({ defaultCity: config.city });
const flagsReady = setupFlags();
void Promise.all([flagsReady, whenHydrated()]).then(reportSessionStart);
void flagsReady.then(() => {
  if (launchPush) void routeDeepLink(launchPush.deepLink, (to, o) => void router.navigate(to, o), "push");
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
