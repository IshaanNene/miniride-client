import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, type Place } from "../api/rides";
import { sessionStore, useSession } from "../store/session";
import { analytics } from "../telemetry/analytics";

const CITIES: Record<string, string> = { sf: "San Francisco", nyc: "New York", blr: "Bengaluru", tokyo: "Tokyo" };

export function Search() {
  const navigate = useNavigate();
  const city = useSession((s) => s.session?.city ?? "sf");
  const [places, setPlaces] = useState<Place[]>([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .places(city)
      .then((p) => {
        if (!alive) return;
        setPlaces(p);
        setPickup(p[0]?.id ?? "");
        setDropoff(p[1]?.id ?? "");
      })
      .catch(() => alive && setError("Something went wrong. Please try again."));
    return () => {
      alive = false;
    };
  }, [city]);

  const byId = (id: string) => places.find((p) => p.id === id) ?? null;

  return (
    <section className="card">
      <h1>Where to?</h1>
      <label>
        City
        <select
          value={city}
          onChange={(e) => {
            sessionStore.getState().setCity(e.target.value);
            analytics.track("city_changed", { city: e.target.value });
          }}
        >
          {Object.entries(CITIES).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        Pickup
        <select data-testid="pickup" value={pickup} onChange={(e) => setPickup(e.target.value)}>
          {places.map((p) => <option key={p.id} value={p.id ?? ""}>{p.name}</option>)}
        </select>
      </label>
      <label>
        Destination
        <select data-testid="dropoff" value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
          {places.map((p) => <option key={p.id} value={p.id ?? ""}>{p.name}</option>)}
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button
        className="primary"
        disabled={!pickup || !dropoff || pickup === dropoff}
        onClick={() => {
          sessionStore.getState().setTrip(byId(pickup), byId(dropoff));
          analytics.track("search_submitted", { city });
          navigate("/request");
        }}
      >
        See prices
      </button>
    </section>
  );
}
