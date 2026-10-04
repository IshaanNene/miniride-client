import { newIdempotencyKey } from "../ids";
import { analytics } from "../telemetry/analytics";
import { gql, RequestTimeoutError, type GqlOptions } from "./graphql";

export interface Place {
  id?: string | null;
  name: string;
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  rating: number;
}

export interface Ride {
  id: string;
  status: string;
  city: string;
  pickup: Place;
  dropoff: Place;
  driver: Driver | null;
  distanceKm: number;
}

export interface FareQuote {
  currency: string;
  amountCents: number;
  surge: number;
  distanceKm: number;
  durationMin: number;
}

const RIDE_FIELDS = `id status city distanceKm pickup { name lat lng } dropoff { name lat lng } driver { id name vehicle rating }`;
const strip = (p: Place) => ({ name: p.name, lat: p.lat, lng: p.lng });

export const api = {
  places: (city: string) =>
    gql<{ places: Place[] }>("Places", `query Places($city: String!) { places(city: $city) { id name lat lng } }`, { city }).then(
      (d) => d.places,
    ),
  fare: (city: string, pickup: Place, dropoff: Place) =>
    gql<{ fareEstimate: FareQuote }>(
      "FareEstimate",
      `query FareEstimate($city: String!, $p: PlaceInput!, $d: PlaceInput!) { fareEstimate(city: $city, pickup: $p, dropoff: $d) { currency amountCents surge distanceKm durationMin } }`,
      { city, p: strip(pickup), d: strip(dropoff) },
    ).then((d) => d.fareEstimate),
  ride: (id: string) =>
    gql<{ ride: Ride | null }>("Ride", `query Ride($id: ID!) { ride(id: $id) { ${RIDE_FIELDS} } }`, { id }).then((d) => d.ride),
  eta: (rideId: string) =>
    gql<{ eta: { rideId: string; status: string; etaSeconds: number | null } }>(
      "Eta",
      `query Eta($rideId: ID!) { eta(rideId: $rideId) { rideId status etaSeconds } }`,
      { rideId },
    ).then((d) => d.eta),
};

export interface RequestRideOptions extends GqlOptions {
  /** Per-attempt timeout. Matching can take seconds on slow networks. */
  timeoutMs?: number;
  retries?: number;
}

/**
 * Request a ride, retrying on timeout. One idempotency key per user action, reused on every
 * retry, so a slow network can never create duplicate rides.
 */
export async function requestRide(
  input: { city: string; pickup: Place; dropoff: Place },
  { timeoutMs = 15_000, retries = 2, fetchImpl }: RequestRideOptions = {},
): Promise<Ride> {
  const idempotencyKey = newIdempotencyKey();
  for (let attempt = 0; ; attempt++) {
    try {
      analytics.track("ride_request_attempt", { attempt });
      const d = await gql<{ requestRide: Ride }>(
        "RequestRide",
        `mutation RequestRide($input: RideInput!) { requestRide(input: $input) { ${RIDE_FIELDS} } }`,
        { input: { city: input.city, pickup: strip(input.pickup), dropoff: strip(input.dropoff), idempotencyKey } },
        { timeoutMs, fetchImpl },
      );
      analytics.track("ride_requested", { attempts: attempt + 1 });
      return d.requestRide;
    } catch (err) {
      if (!(err instanceof RequestTimeoutError) || attempt >= retries) throw err;
      analytics.track("ride_request_timeout", { attempt, timeout_ms: timeoutMs });
    }
  }
}
