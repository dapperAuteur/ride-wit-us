"use client";

import { FormFooter, MoneyFields, SelectField, TextAreaField, TextField, useMobilityForm } from "@/components/mobility/form-kit";
import type { FormState } from "@/lib/mobility/form-state";
import { TRIP_STATUSES, TRIP_STATUS_LABELS } from "@/lib/mobility/options";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface JourneyFormValues {
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  packingNotes: string | null;
  notes: string | null;
}

export function JourneyForm({
  action,
  initial,
  defaultDate,
  submitLabel,
}: {
  action: Action;
  initial: JourneyFormValues | null;
  defaultDate: string;
  submitLabel: string;
}) {
  const { state, pending, onSubmit, formRef, errors } = useMobilityForm(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6 max-w-2xl">
      <TextField name="name" label="Name" hint={`For example "Chicago, October" or "Mom's 70th".`} maxLength={120} defaultValue={initial?.name} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          name="status"
          label="Status"
          options={TRIP_STATUSES.map((s) => ({ value: s, label: TRIP_STATUS_LABELS[s] }))}
          defaultValue={initial?.status ?? "planned"}
          error={errors.status}
        />
        <TextField name="startDate" label="First day" type="date" defaultValue={initial?.startDate ?? defaultDate} error={errors.startDate} />
        <TextField name="endDate" label="Last day" type="date" optional defaultValue={initial?.endDate} error={errors.endDate} />
      </div>
      <TextAreaField name="packingNotes" label="Packing notes" maxLength={4000} defaultValue={initial?.packingNotes} error={errors.packingNotes} />
      <TextAreaField name="notes" label="Notes" maxLength={4000} defaultValue={initial?.notes} error={errors.notes} />
      <FormFooter pending={pending} state={state} submitLabel={submitLabel} />
    </form>
  );
}

export interface StayFormValues {
  name: string;
  placeId: string | null;
  address: string | null;
  checkInDate: string;
  checkOutDate: string;
  confirmationNumber: string | null;
  roomType: string | null;
  costAmount: string | null;
  costCurrency: string | null;
  notes: string | null;
}

export function StayForm({
  action,
  initial,
  places,
  defaultCheckIn,
  defaultCheckOut,
  homeCurrency,
  submitLabel,
}: {
  action: Action;
  initial: StayFormValues | null;
  places: readonly { id: string; label: string }[];
  defaultCheckIn: string;
  defaultCheckOut: string;
  homeCurrency: string | null;
  submitLabel: string;
}) {
  const { state, pending, onSubmit, formRef, errors } = useMobilityForm(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6 max-w-2xl">
      <TextField name="name" label="Where you're staying" hint="Hotel, rental, or a friend's place." maxLength={120} defaultValue={initial?.name} error={errors.name} />
      {places.length ? (
        <SelectField
          name="placeId"
          label="Saved place"
          optional
          emptyLabel="Not a saved place"
          options={places.map((p) => ({ value: p.id, label: p.label }))}
          defaultValue={initial?.placeId}
          error={errors.placeId}
        />
      ) : null}
      <TextField name="address" label="Address" optional maxLength={240} defaultValue={initial?.address} error={errors.address} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="checkInDate" label="Check-in" type="date" defaultValue={initial?.checkInDate ?? defaultCheckIn} error={errors.checkInDate} />
        <TextField name="checkOutDate" label="Check-out" type="date" defaultValue={initial?.checkOutDate ?? defaultCheckOut} error={errors.checkOutDate} />
        <TextField
          name="confirmationNumber"
          label="Confirmation"
          hint="Stored as typed, shown only to you."
          optional
          maxLength={40}
          defaultValue={initial?.confirmationNumber}
          error={errors.confirmationNumber}
        />
        <TextField name="roomType" label="Room" optional maxLength={80} defaultValue={initial?.roomType} error={errors.roomType} />
      </div>
      <MoneyFields
        amountName="costAmount"
        currencyName="costCurrency"
        label="Total cost"
        defaultAmount={initial?.costAmount}
        defaultCurrency={initial?.costCurrency ?? homeCurrency}
        errors={errors}
      />
      <TextAreaField name="notes" label="Notes" maxLength={2000} defaultValue={initial?.notes} error={errors.notes} />
      <FormFooter pending={pending} state={state} submitLabel={submitLabel} />
    </form>
  );
}
