// Minimal service worker: makes MiniRide installable; network-first, no offline caching.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
