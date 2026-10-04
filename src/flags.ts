// Feature flags: OpenFeature with the Unleash frontend API (gradual rollouts stick to sessionId).
import { InMemoryProvider, OpenFeature } from "@openfeature/web-sdk";
import { UnleashWebProvider } from "@openfeature/unleash-web-provider";
import { config } from "./config";
import { sessionId } from "./ids";

export const FLAGS = {
  notifRouterV2: "notif_router_v2",
} as const;

const DEFAULTS: Record<string, boolean> = { [FLAGS.notifRouterV2]: false };

function overridesFromUrl(): Record<string, boolean> {
  if (!config.allowFlagOverrides) return {};
  const raw = new URLSearchParams(location.search).get("flags");
  if (!raw) return {};
  return Object.fromEntries(raw.split(",").filter(Boolean).map((f) => [f, true]));
}

let overrides: Record<string, boolean> = {};

export async function setupFlags(): Promise<void> {
  overrides = overridesFromUrl();
  if (config.unleashUrl && config.unleashClientKey) {
    await OpenFeature.setContext({ targetingKey: sessionId, sessionId });
    await OpenFeature.setProviderAndWait(
      new UnleashWebProvider({
        url: config.unleashUrl,
        clientKey: config.unleashClientKey,
        appName: config.appName,
        refreshInterval: 15,
        context: { sessionId },
      }),
    ).catch(() => undefined);
    return;
  }
  const flagConfig = Object.fromEntries(
    Object.entries(DEFAULTS).map(([k, v]) => [
      k,
      { variants: { on: true, off: false }, defaultVariant: v ? "on" : "off", disabled: false },
    ]),
  );
  await OpenFeature.setProviderAndWait(new InMemoryProvider(flagConfig));
}

export function flag(name: string): boolean {
  if (name in overrides) return overrides[name] ?? false;
  return OpenFeature.getClient().getBooleanValue(name, DEFAULTS[name] ?? false);
}

/** Flags evaluated for this session, attached to telemetry and bug reports. */
export function exposures(): Record<string, boolean> {
  return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, flag(k)]));
}
