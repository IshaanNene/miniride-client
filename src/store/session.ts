// Rider session store. The persisted session is restored asynchronously at launch (as with
// IndexedDB), so `session` is undefined until `hydrated` becomes true.
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type { Place, Ride } from "../api/rides";

export interface RiderSession {
  riderId: string;
  displayName: string;
  city: string;
  homePlace: Place | null;
}

export interface SessionState {
  hydrated: boolean;
  session: RiderSession | undefined;
  activeRide: Ride | null;
  pickup: Place | null;
  dropoff: Place | null;
  setTrip(pickup: Place | null, dropoff: Place | null): void;
  setActiveRide(ride: Ride | null): void;
  setCity(city: string): void;
}

const STORAGE_KEY = "miniride.session";

export const sessionStore = createStore<SessionState>()((set, get) => ({
  hydrated: false,
  session: undefined,
  activeRide: null,
  pickup: null,
  dropoff: null,
  setTrip: (pickup, dropoff) => set({ pickup, dropoff }),
  setActiveRide: (activeRide) => {
    set({ activeRide });
    persist(get());
  },
  setCity: (city) => {
    const s = get().session;
    if (s) {
      set({ session: { ...s, city } });
      persist(get());
    }
  },
}));

function persist(state: SessionState) {
  if (!state.session) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ session: state.session, activeRide: state.activeRide }));
}

export interface HydrateOptions {
  /** Simulated storage latency (IndexedDB restore + migrations). */
  delayMs?: number;
  defaultCity?: string;
}

let hydration: Promise<void> | null = null;

export function hydrate({ delayMs = 350, defaultCity = "sf" }: HydrateOptions = {}): Promise<void> {
  hydration ??= new Promise<void>((resolve) => {
    setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as { session: RiderSession; activeRide: Ride | null }) : null;
      const session: RiderSession = saved?.session ?? {
        riderId: crypto.randomUUID(),
        displayName: "Rider",
        city: defaultCity,
        homePlace: null,
      };
      sessionStore.setState({ hydrated: true, session, activeRide: saved?.activeRide ?? null });
      persist(sessionStore.getState());
      resolve();
    }, delayMs);
  });
  return hydration;
}

/** Resolves once the persisted session has been restored. */
export function whenHydrated(): Promise<void> {
  if (sessionStore.getState().hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = sessionStore.subscribe((s) => {
      if (s.hydrated) {
        unsub();
        resolve();
      }
    });
  });
}

/** Test helper: reset to the pre-launch state. */
export function resetSessionForTests() {
  hydration = null;
  localStorage.removeItem(STORAGE_KEY);
  sessionStore.setState({ hydrated: false, session: undefined, activeRide: null, pickup: null, dropoff: null });
}

export function useSession<T>(selector: (s: SessionState) => T): T {
  return useStore(sessionStore, selector);
}
