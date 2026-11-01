"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckboxField,
  DistanceField,
  FormFooter,
  MoneyFields,
  SelectField,
  TextAreaField,
  TextField,
  UnitsHiddenInput,
  useMobilityForm,
  type Option,
} from "@/components/mobility/form-kit";
import { TimeZoneField } from "@/components/mobility/time-zone-field";
import { VendorPicker } from "@/components/mobility/vendor-picker";
import { linkVendor, searchVendors } from "../vendors/actions";
import type { FormState } from "@/lib/mobility/form-state";
import { planVendorFill, type FillPlace } from "@/lib/mobility/vendor-fill";
import type { LinkVendorResult } from "../vendors/actions";
import {
  BOOKED_MODES,
  FORM_TRIP_PURPOSES,
  HUMAN_POWERED_MODES,
  TRIP_MODES,
  TRIP_MODE_LABELS,
  TRIP_PURPOSE_LABELS,
  TRIP_STATUSES,
  TRIP_STATUS_LABELS,
  type TripMode,
  type TripPurpose,
} from "@/lib/mobility/options";

export interface TripFormValues {
  mode: string;
  status: string;
  purpose: string | null;
  category: string;
  vehicleId: string | null;
  vendorRefId: string | null;
  startDate: string;
  endDate: string | null;
  /** datetime-local values in their own zones (converted on the server page). */
  departLocal: string | null;
  departTz: string | null;
  arriveLocal: string | null;
  arriveTz: string | null;
  originPlaceId: string | null;
  originLabel: string | null;
  destinationPlaceId: string | null;
  destinationLabel: string | null;
  isRoundTrip: boolean;
  distanceM: number | null;
  durationS: number | null;
  costAmount: string | null;
  costCurrency: string | null;
  carrierName: string | null;
  flightNumber: string | null;
  confirmationNumber: string | null;
  seatAssignment: string | null;
  terminal: string | null;
  gate: string | null;
  bookingUrl: string | null;
  notes: string | null;
}

export interface VehicleChoice {
  id: string;
  nickname: string;
  defaultTripMode: string | null;
}

/** A saved place: label for the select, plus what a vendor pick matches and measures against. */
export type PlaceChoice = FillPlace;

/** The select's value for "not a saved place: type it". */
const OTHER = "__other__";

function initialChoice(placeId: string | null, label: string | null, places: readonly PlaceChoice[]): string {
  return placeId ?? (label || !places.length ? OTHER : "");
}

function PlacePicker({
  end,
  label,
  places,
  choice,
  onChoice,
  defaultLabel,
  labelKey = 0,
  errors,
}: {
  end: "origin" | "destination";
  label: string;
  places: readonly PlaceChoice[];
  /** The select's value: a place id, OTHER, or "" for not set. */
  choice: string;
  onChoice: (choice: string) => void;
  defaultLabel: string | null;
  /** Bumped when a vendor pick fills the typed text, so the field remounts with it. */
  labelKey?: number;
  errors: Record<string, string>;
}) {
  const setChoice = onChoice;
  const placeField = `${end}PlaceId`;
  const labelField = `${end}Label`;
  const options: Option[] = [...places.map((p) => ({ value: p.id, label: p.label })), { value: OTHER, label: "Somewhere else…" }];
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold text-[#221E1B]">
        {label} <span className="font-normal text-[#221E1B]/80">(optional)</span>
      </legend>
      {places.length ? (
        <SelectField
          name={`${end}Choice`}
          label="Saved place"
          optional
          emptyLabel="Not set"
          options={options}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          error={errors[placeField]}
        />
      ) : null}
      <input type="hidden" name={placeField} value={choice && choice !== OTHER ? choice : ""} />
      {choice === OTHER ? (
        <TextField
          key={labelKey}
          name={labelField}
          label={places.length ? "Where" : "Name or address"}
          hint="If this matches one of your saved places or its other names, the trip links to it."
          optional
          maxLength={160}
          defaultValue={defaultLabel}
          error={errors[labelField]}
        />
      ) : null}
    </fieldset>
  );
}

export function TripForm({
  action,
  initial,
  vehicles,
  places,
  journeyId,
  defaultTimeZone,
  defaultDate,
  homeCurrency,
  submitLabel,
  vendor = null,
  vendorsEnabled = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: TripFormValues | null;
  vehicles: readonly VehicleChoice[];
  places: readonly PlaceChoice[];
  journeyId: string | null;
  defaultTimeZone: string | null;
  /** Today in the user's zone for a new trip, blank for a new leg; computed on the server. */
  defaultDate: string;
  homeCurrency: string | null;
  submitLabel: string;
  /** The trip's linked CentenarianOS vendor, with its label read on the server. */
  vendor?: { refId: string; label: string } | null;
  /** CENTOS_API_URL and RIDE_VENDOR_API_SECRET are set, so the picker can search. */
  vendorsEnabled?: boolean;
}) {
  const { state, pending, onSubmit, formRef, errors } = useMobilityForm(action);
  const v = initial;
  const [mode, setMode] = useState<string>(v?.mode ?? "bike");
  const [vehicleId, setVehicleId] = useState<string>(v?.vehicleId ?? "");
  const [originChoice, setOriginChoice] = useState(() => initialChoice(v?.originPlaceId ?? null, v?.originLabel ?? null, places));
  const [destinationChoice, setDestinationChoice] = useState(() =>
    initialChoice(v?.destinationPlaceId ?? null, v?.destinationLabel ?? null, places)
  );
  // A vendor pick fills empty fields by remounting them with a new default (lib/mobility/vendor-fill.ts).
  const [destinationText, setDestinationText] = useState({ text: v?.destinationLabel ?? null, key: 0 });
  const [distanceFill, setDistanceFill] = useState<{ meters: number | null; from: string; to: string; key: number } | null>(
    null
  );
  const [fillNote, setFillNote] = useState<string | null>(null);
  // What the last vendor pick put in "To" and "Distance". Picking a different vendor may replace
  // those values (they were never the rider's), but not anything the rider changed since.
  const filledDestination = useRef<string | null>(null);
  const filledDistanceText = useRef<string | null>(null);

  useEffect(() => {
    // The distance field formats the estimate in the rider's units; remember the text it shows.
    const value = distanceFill && formRef.current ? new FormData(formRef.current).get("distance") : null;
    filledDistanceText.current = typeof value === "string" && value ? value : null;
  }, [distanceFill, formRef]);

  /** Fill what is still empty from the vendor just picked; never replace what the rider entered. */
  const onVendorLinked = (linked: Extract<LinkVendorResult, { ok: true }>) => {
    const current = formRef.current ? new FormData(formRef.current) : null;
    const text = (name: string) => {
      const value = current?.get(name);
      return typeof value === "string" ? value : "";
    };
    let destinationPlaceId = destinationChoice && destinationChoice !== OTHER ? destinationChoice : null;
    let destinationLabel = destinationChoice === OTHER ? text("destinationLabel") : "";
    if (filledDestination.current && (destinationPlaceId ?? destinationLabel) === filledDestination.current) {
      destinationPlaceId = null;
      destinationLabel = "";
    }
    let distanceText = text("distance");
    const distanceWasOurs = !!filledDistanceText.current && distanceText === filledDistanceText.current;
    if (distanceWasOurs) distanceText = "";

    const plan = planVendorFill({
      fill: linked.fill,
      places,
      originPlaceId: originChoice && originChoice !== OTHER ? originChoice : null,
      destination: { placeId: destinationPlaceId, label: destinationLabel },
      distanceText,
    });
    if (plan.destination && "placeId" in plan.destination) {
      filledDestination.current = plan.destination.placeId;
      setDestinationChoice(plan.destination.placeId);
    }
    if (plan.destination && "label" in plan.destination) {
      const label = plan.destination.label;
      filledDestination.current = label;
      setDestinationChoice(OTHER);
      setDestinationText((d) => ({ text: label, key: d.key + 1 }));
    }
    if (plan.estimate) {
      const estimate = plan.estimate;
      setDistanceFill((d) => ({ ...estimate, key: (d?.key ?? 0) + 1 }));
    } else if (distanceWasOurs) {
      // The last vendor's estimate does not fit this one: clear it rather than leave it wrong.
      setDistanceFill((d) => ({ meters: null, from: "", to: "", key: (d?.key ?? 0) + 1 }));
    }
    const parts: string[] = [];
    if (plan.filled.length) {
      parts.push(
        `Filled from ${linked.label}: ${plan.filled
          .map((f) => (f === "Distance" ? "Distance (a straight-line estimate)" : f))
          .join(", ")}. Check them above before saving.`
      );
    }
    if (plan.kept.length) parts.push(`Kept what you entered for ${plan.kept.join(" and ")}.`);
    if (!plan.estimate && !plan.kept.includes("Distance")) {
      parts.push("Distance needs both ends as saved places with coordinates, so enter it yourself.");
    }
    setFillNote(parts.join(" ") || null);
  };

  const hasBooking = !!(v?.carrierName || v?.confirmationNumber || v?.flightNumber || v?.seatAssignment || v?.bookingUrl);
  const showBooking = BOOKED_MODES.has(mode as TripMode) || hasBooking;
  const humanPowered = HUMAN_POWERED_MODES.has(mode as TripMode);
  const purposes: TripPurpose[] = [...FORM_TRIP_PURPOSES];
  if (v?.purpose && !purposes.includes(v.purpose as TripPurpose)) purposes.push(v.purpose as TripPurpose);

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-8 max-w-2xl">
      <UnitsHiddenInput />
      {journeyId ? <input type="hidden" name="journeyId" value={journeyId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="mode"
          label="Mode"
          options={TRIP_MODES.map((m) => ({ value: m, label: TRIP_MODE_LABELS[m] }))}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          error={errors.mode}
        />
        <SelectField
          name="status"
          label="Status"
          hint="Planned trips don't count toward totals until they're done."
          options={TRIP_STATUSES.map((s) => ({ value: s, label: TRIP_STATUS_LABELS[s] }))}
          defaultValue={v?.status ?? "completed"}
          error={errors.status}
        />
        <TextField
          name="startDate"
          label="Date"
          type="date"
          hint="Leave blank to use the departure date below."
          optional
          defaultValue={v?.startDate ?? defaultDate}
          error={errors.startDate}
        />
        <TextField
          name="endDate"
          label="End date"
          type="date"
          hint="For a trip over more than one day."
          optional
          defaultValue={v?.endDate}
          error={errors.endDate}
        />
        <SelectField
          name="vehicleId"
          label="Vehicle"
          optional
          emptyLabel="No vehicle"
          options={vehicles.map((x) => ({ value: x.id, label: x.nickname }))}
          value={vehicleId}
          onChange={(e) => {
            setVehicleId(e.target.value);
            const picked = vehicles.find((x) => x.id === e.target.value);
            if (picked?.defaultTripMode) setMode(picked.defaultTripMode);
          }}
          error={errors.vehicleId}
          hint={vehicles.length ? undefined : "Add vehicles on the Vehicles page."}
        />
        <SelectField
          name="purpose"
          label="Purpose"
          optional
          emptyLabel="Not set"
          options={purposes.map((p) => ({ value: p, label: TRIP_PURPOSE_LABELS[p] }))}
          defaultValue={v?.purpose}
          error={errors.purpose}
        />
        {humanPowered ? (
          <SelectField
            name="category"
            label="Counts as"
            options={[
              { value: "travel", label: "Getting somewhere" },
              { value: "fitness", label: "Workout" },
            ]}
            defaultValue={v?.category ?? "travel"}
            error={errors.category}
          />
        ) : null}
      </div>

      <section aria-labelledby="where-heading" className="space-y-4 border-t-4 border-dashed border-[#221E1B] pt-6">
        <h2 id="where-heading" className="font-display text-2xl text-[#221E1B]">
          Where and how far
        </h2>
        <PlacePicker
          end="origin"
          label="From"
          places={places}
          choice={originChoice}
          onChoice={setOriginChoice}
          defaultLabel={v?.originLabel ?? null}
          errors={errors}
        />
        <PlacePicker
          end="destination"
          label="To"
          places={places}
          choice={destinationChoice}
          onChoice={setDestinationChoice}
          defaultLabel={destinationText.text}
          labelKey={destinationText.key}
          errors={errors}
        />
        <CheckboxField
          name="isRoundTrip"
          label="Round trip"
          hint="Enter the one-way distance. Totals count it twice."
          defaultChecked={v?.isRoundTrip}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <DistanceField
            key={distanceFill?.key ?? 0}
            name="distance"
            label="Distance"
            defaultMeters={distanceFill ? distanceFill.meters : v?.distanceM}
            hint={
              distanceFill?.meters != null
                ? `Estimate, edit if needed: a straight line from ${distanceFill.from} to ${distanceFill.to}. The road is longer.`
                : undefined
            }
            error={errors.distance}
          />
          <TextField
            name="durationMin"
            label="Duration (minutes)"
            optional
            inputMode="decimal"
            maxLength={8}
            defaultValue={v?.durationS != null ? Math.round(v.durationS / 6) / 10 : null}
            error={errors.durationMin}
          />
        </div>
      </section>

      <section aria-labelledby="times-heading" className="space-y-4 border-t-4 border-dashed border-[#221E1B] pt-6">
        <h2 id="times-heading" className="font-display text-2xl text-[#221E1B]">
          Times
        </h2>
        <p className="text-sm text-[#221E1B]/80">
          Optional. Enter each time as the local clock showed it, with that place&apos;s time zone. A flight from Chicago to New
          York departs in America/Chicago and arrives in America/New_York.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="departLocal" label="Departs" type="datetime-local" optional defaultValue={v?.departLocal} error={errors.departLocal} />
          <TimeZoneField name="departTz" label="Departure time zone" defaultValue={v?.departTz ?? defaultTimeZone} error={errors.departTz} />
          <TextField name="arriveLocal" label="Arrives" type="datetime-local" optional defaultValue={v?.arriveLocal} error={errors.arriveLocal} />
          <TimeZoneField
            name="arriveTz"
            label="Arrival time zone"
            hint="Leave blank if it's the same as departure."
            defaultValue={v?.arriveTz}
            error={errors.arriveTz}
          />
        </div>
      </section>

      {showBooking ? (
        <section aria-labelledby="booking-heading" className="space-y-4 border-t-4 border-dashed border-[#221E1B] pt-6">
          <h2 id="booking-heading" className="font-display text-2xl text-[#221E1B]">
            Booking
          </h2>
          <p className="text-sm text-[#221E1B]/80">
            Optional. A confirmation code is stored as you type it and shown only to you; enter just the last few characters if
            you prefer.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="carrierName" label="Carrier" optional maxLength={80} defaultValue={v?.carrierName} error={errors.carrierName} />
            {mode === "plane" ? (
              <TextField
                name="flightNumber"
                label="Flight number"
                hint="For example AA 1234."
                optional
                maxLength={12}
                defaultValue={v?.flightNumber}
                error={errors.flightNumber}
                inputClassName="uppercase"
              />
            ) : null}
            <TextField
              name="confirmationNumber"
              label="Confirmation"
              optional
              maxLength={40}
              defaultValue={v?.confirmationNumber}
              error={errors.confirmationNumber}
            />
            <TextField name="seatAssignment" label="Seat" optional maxLength={20} defaultValue={v?.seatAssignment} error={errors.seatAssignment} />
            <TextField name="terminal" label="Terminal" optional maxLength={20} defaultValue={v?.terminal} error={errors.terminal} />
            <TextField name="gate" label="Gate" optional maxLength={20} defaultValue={v?.gate} error={errors.gate} />
          </div>
          <TextField
            name="bookingUrl"
            label="Booking link"
            type="url"
            inputMode="url"
            optional
            maxLength={500}
            defaultValue={v?.bookingUrl}
            error={errors.bookingUrl}
          />
        </section>
      ) : null}

      <section aria-labelledby="cost-heading" className="space-y-4 border-t-4 border-dashed border-[#221E1B] pt-6">
        <h2 id="cost-heading" className="font-display text-2xl text-[#221E1B]">
          Cost and notes
        </h2>
        <MoneyFields
          amountName="costAmount"
          currencyName="costCurrency"
          label="Cost"
          defaultAmount={v?.costAmount}
          defaultCurrency={v?.costCurrency ?? homeCurrency}
          errors={errors}
        />
        {vendorsEnabled || vendor ? (
          <VendorPicker
            name="vendorRefId"
            label="Vendor"
            initial={vendor}
            search={searchVendors}
            link={linkVendor}
            onLinked={onVendorLinked}
            error={errors.vendorRefId}
          />
        ) : null}
        {fillNote ? (
          <p role="status" className="text-sm text-[#221E1B]">
            {fillNote}
          </p>
        ) : null}
        <TextAreaField name="notes" label="Notes" maxLength={2000} defaultValue={v?.notes} error={errors.notes} />
      </section>

      <FormFooter pending={pending} state={state} submitLabel={submitLabel} />
    </form>
  );
}
