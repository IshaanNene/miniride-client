// Build-time configuration (Vite env). Defaults target the local DebugAssist compose stack.
declare const __APP_VERSION__: string;

const env = import.meta.env;

export const config = {
  appName: "miniride-client",
  appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0-test",
  gatewayUrl: (env.VITE_GATEWAY_URL as string | undefined) ?? "http://localhost:4000",
  unleashUrl: (env.VITE_UNLEASH_URL as string | undefined) ?? "",
  unleashClientKey: (env.VITE_UNLEASH_CLIENT_KEY as string | undefined) ?? "",
  otlpTracesUrl: (env.VITE_OTLP_TRACES_URL as string | undefined) ?? "",
  vitalsUrl: (env.VITE_VITALS_URL as string | undefined) ?? "",
  bugdropUrl: (env.VITE_BUGDROP_URL as string | undefined) ?? "",
  // Flag overrides via ?flags=a,b are for local testing only.
  allowFlagOverrides: env.DEV || env.VITE_ALLOW_FLAG_OVERRIDES === "true",
  city: (env.VITE_DEFAULT_CITY as string | undefined) ?? "sf",
};
