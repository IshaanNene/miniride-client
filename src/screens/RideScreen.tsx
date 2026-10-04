import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { api, type Ride } from "../api/rides";
import { EtaPoller, type EtaSample } from "../eta/poller";
import { sessionStore } from "../store/session";

const STATUS_TEXT: Record<string, string> = {
  driver_assigned: "Your driver is on the way",
  arriving: "Your driver is arriving",
  in_trip: "On your way",
  completed: "You've arrived",
};

export function formatEta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return "< 1 min";
  return `${Math.round(seconds / 60)} min`;
}

export function RideScreen() {
  const { id = "" } = useParams();
  const location = useLocation();
  const prefill = (location.state as { prefill?: Ride | null } | null)?.prefill ?? null;
  const [ride, setRide] = useState<Ride | null>(prefill);
  const [eta, setEta] = useState<EtaSample | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    api.ride(id).then((r) => {
      if (!alive) return;
      if (r) setRide(r);
      else setMissing(true);
    }).catch(() => undefined);
    const poller = new EtaPoller(() => api.eta(id), (s) => alive && setEta(s));
    poller.start();
    return () => {
      alive = false;
      poller.stop();
    };
  }, [id]);

  useEffect(() => {
    if (eta?.status === "completed" && sessionStore.getState().activeRide?.id === id) {
      sessionStore.getState().setActiveRide(null);
    }
  }, [eta?.status, id]);

  if (missing) return <section className="card"><p>We couldn't find that ride.</p><Link to="/">Home</Link></section>;
  const status = eta?.status ?? ride?.status ?? "driver_assigned";

  return (
    <section className="card">
      <h1 data-testid="ride-status">{STATUS_TEXT[status] ?? status}</h1>
      {ride?.driver && (
        <div className="driver" data-testid="driver">
          <strong>{ride.driver.name}</strong> · {ride.driver.vehicle} · ★ {ride.driver.rating.toFixed(2)}
        </div>
      )}
      <p className="eta">
        {status === "in_trip" ? "Arriving at destination in " : "Pickup in "}
        <strong data-testid="eta">{formatEta(eta?.etaSeconds)}</strong>
        {eta?.source === "local" && <span className="muted"> (estimated)</span>}
      </p>
      {ride && (
        <p className="muted">
          {ride.pickup.name} → {ride.dropoff.name} · {ride.distanceKm.toFixed(1)} km
        </p>
      )}
      {status === "completed" && <Link to="/" className="primary">Book another ride</Link>}
    </section>
  );
}
