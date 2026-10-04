import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, requestRide, type FareQuote } from "../api/rides";
import { GraphQLRequestError } from "../api/graphql";
import { sessionStore, useSession } from "../store/session";

export function formatMoney(cents: number, currency: string): string {
  const minor = currency === "JPY" ? 1 : 100;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / minor);
}

export function RequestRide() {
  const navigate = useNavigate();
  const pickup = useSession((s) => s.pickup);
  const dropoff = useSession((s) => s.dropoff);
  const city = useSession((s) => s.session?.city ?? "sf");
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [state, setState] = useState<"idle" | "requesting" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!pickup || !dropoff) return;
    api.fare(city, pickup, dropoff).then(setQuote).catch(() => setMessage("Couldn't load prices."));
  }, [city, pickup, dropoff]);

  if (!pickup || !dropoff) return <Navigate to="/" replace />;

  return (
    <section className="card">
      <h1>Confirm your ride</h1>
      <p>
        <strong>{pickup.name}</strong> → <strong>{dropoff.name}</strong>
      </p>
      {quote ? (
        <p className="fare" data-testid="fare">
          {formatMoney(quote.amountCents, quote.currency)}
          <span className="muted"> · {quote.distanceKm.toFixed(1)} km · ~{Math.round(quote.durationMin)} min</span>
          {quote.surge > 1 && <span className="surge"> · {quote.surge}× busy</span>}
        </p>
      ) : (
        <p className="muted">Getting prices…</p>
      )}
      {state === "requesting" && <p className="muted" data-testid="finding">Finding your driver…</p>}
      {message && <p className="error">{message}</p>}
      <button
        className="primary"
        disabled={!quote || state === "requesting"}
        onClick={async () => {
          setState("requesting");
          setMessage("");
          try {
            const ride = await requestRide({ city, pickup, dropoff });
            sessionStore.getState().setActiveRide(ride);
            navigate(`/ride/${ride.id}`, { state: { prefill: ride } });
          } catch (err) {
            setState("error");
            setMessage(
              err instanceof GraphQLRequestError && err.code === "NO_DRIVERS"
                ? "No drivers nearby right now."
                : "Something went wrong. Please try again.",
            );
          }
        }}
      >
        Request MiniRide
      </button>
    </section>
  );
}
