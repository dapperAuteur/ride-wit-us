"use client";

import { FormFooter, SelectField, TextAreaField, TextField, useMobilityForm } from "@/components/mobility/form-kit";
import type { FormState } from "@/lib/mobility/form-state";
import { PLACE_KINDS, PLACE_KIND_LABELS } from "@/lib/mobility/options";

export interface PlaceFormValues {
  label: string;
  kind: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  aliases: string[];
}

export function PlaceForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: PlaceFormValues | null;
  submitLabel: string;
}) {
  const { state, pending, onSubmit, formRef, errors } = useMobilityForm(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="label" label="Name" maxLength={80} defaultValue={initial?.label} error={errors.label} />
        <SelectField
          name="kind"
          label="Kind"
          hint="Home is private: it never leaves RideWitUS."
          options={PLACE_KINDS.map((k) => ({ value: k, label: PLACE_KIND_LABELS[k] }))}
          defaultValue={initial?.kind ?? "other"}
          error={errors.kind}
        />
      </div>
      <TextField
        name="address"
        label="Address"
        optional
        maxLength={240}
        autoComplete="street-address"
        defaultValue={initial?.address}
        error={errors.address}
      />
      <TextAreaField
        name="aliases"
        label="Other names"
        hint='One per line or separated by commas. "Blue Note" and "Blue Note Jazz Club, 131 W 3rd St" can be the same place. Typing any of these in a trip picks this place.'
        defaultValue={initial?.aliases.join("\n")}
        error={errors.aliases}
        rows={4}
      />
      <fieldset>
        <legend className="font-semibold text-[#221E1B]">
          Coordinates <span className="font-normal text-[#221E1B]/80">(optional)</span>
        </legend>
        <p className="text-sm text-[#221E1B]/80">For route distances later. Leave blank if you don&apos;t have them.</p>
        <div className="mt-1 grid gap-4 grid-cols-1 sm:grid-cols-2">
          <TextField name="lat" label="Latitude" optional inputMode="decimal" maxLength={12} defaultValue={initial?.lat} error={errors.lat} />
          <TextField name="lng" label="Longitude" optional inputMode="decimal" maxLength={12} defaultValue={initial?.lng} error={errors.lng} />
        </div>
      </fieldset>
      <FormFooter pending={pending} state={state} submitLabel={submitLabel} />
    </form>
  );
}
