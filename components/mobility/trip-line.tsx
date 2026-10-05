import Link from "next/link";
import { Measurement } from "@/components/units/measurement";
import { effectiveDistanceM } from "@/lib/mobility/grouping";
import { formatAmount } from "@/lib/mobility/money";
import { TRIP_MODE_LABELS, TRIP_STATUS_LABELS, type TripMode, type TripStatus } from "@/lib/mobility/options";
import { formatDate, formatZoned } from "@/lib/mobility/zoned-time";
import { MUTED, TEXT_LINK } from "./styles";

export interface TripLineData {
  id: string;
  mode: TripMode;
  status: TripStatus;
  startDate: string;
  originLabel: string | null;
  destinationLabel: string | null;
  isRoundTrip: boolean;
  distanceM: number | null;
  durationS: number | null;
  costAmount: string | null;
  costCurrency: string | null;
  vehicleId: string | null;
  departedAt: Date | null;
  departTz: string | null;
  arrivedAt: Date | null;
  arriveTz: string | null;
  carrierName: string | null;
  flightNumber: string | null;
}

export function StatusBadge({ status }: { status: TripStatus }) {
  const tone =
    status === "completed"
      ? "border-[#3E7C3A]"
      : status === "cancelled"
        ? "border-[#221E1B]/50 line-through"
        : "border-[#5C8AA5]";
  return (
    <span className={`inline-block border-2 ${tone} px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[#221E1B]`}>
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}

export function routeText(t: Pick<TripLineData, "originLabel" | "destinationLabel" | "isRoundTrip">): string | null {
  const arrow = t.isRoundTrip ? " ⇄ " : " → ";
  if (t.originLabel && t.destinationLabel) return `${t.originLabel}${arrow}${t.destinationLabel}`;
  return t.destinationLabel ? `To ${t.destinationLabel}` : t.originLabel ? `From ${t.originLabel}` : null;
}

function minutes(s: number | null): string | null {
  if (s == null) return null;
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/** One trip or leg: what, when, where, how far, how long, what it cost. */
export function TripLine({
  trip,
  vehicleName,
  showDate = true,
}: {
  trip: TripLineData;
  vehicleName?: string | null;
  showDate?: boolean;
}) {
  const route = routeText(trip);
  const cost = formatAmount(trip.costAmount, trip.costCurrency);
  const flight = [trip.carrierName, trip.flightNumber].filter(Boolean).join(" ");
  const dist = effectiveDistanceM(trip);
  const facts = [
    vehicleName,
    minutes(trip.durationS),
    cost,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/app/trips/${trip.id}`} className={`${TEXT_LINK} font-semibold min-h-11 inline-flex items-center`}>
          {TRIP_MODE_LABELS[trip.mode]}
          {flight ? ` · ${flight}` : ""}
          {showDate ? ` · ${formatDate(trip.startDate)}` : ""}
        </Link>
        <StatusBadge status={trip.status} />
      </div>
      {route ? <p className="text-[#221E1B]">{route}</p> : null}
      {trip.departedAt ? (
        <p className={`text-sm ${MUTED}`}>
          Departs {formatZoned(trip.departedAt, trip.departTz)}
          {trip.arrivedAt ? ` · arrives ${formatZoned(trip.arrivedAt, trip.arriveTz)}` : ""}
        </p>
      ) : null}
      <p className={`text-sm ${MUTED}`}>
        {dist != null ? (
          <>
            <Measurement value={dist} dimension="distance" />
            {trip.isRoundTrip ? " round trip" : ""}
          </>
        ) : (
          "Distance not recorded"
        )}
        {facts.length ? ` · ${facts.join(" · ")}` : ""}
      </p>
    </div>
  );
}
