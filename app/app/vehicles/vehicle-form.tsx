"use client";

import {
  CheckboxField,
  DistanceField,
  FormFooter,
  MoneyFields,
  SelectField,
  TextField,
  UnitsHiddenInput,
  useMobilityForm,
} from "@/components/mobility/form-kit";
import type { FormState } from "@/lib/mobility/form-state";
import {
  TRIP_MODES,
  TRIP_MODE_LABELS,
  VEHICLE_ENERGY,
  VEHICLE_ENERGY_LABELS,
  VEHICLE_KINDS,
  VEHICLE_KIND_LABELS,
  VEHICLE_OWNERSHIP,
  VEHICLE_OWNERSHIP_LABELS,
} from "@/lib/mobility/options";

export interface VehicleFormValues {
  kind: string;
  nickname: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  ownership: string;
  energy: string | null;
  defaultTripMode: string | null;
  odometerOffsetM: number | null;
  purchasePrice: string | null;
  purchaseCurrency: string | null;
  purchaseDate: string | null;
  expectedLifeYears: number | null;
  expectedLifeM: number | null;
  salvageValue: string | null;
  isActive: boolean;
}

const opts = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }));

export function VehicleForm({
  action,
  initial,
  homeCurrency,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: VehicleFormValues | null;
  homeCurrency: string | null;
  submitLabel: string;
}) {
  const { state, pending, onSubmit, formRef, errors } = useMobilityForm(action);
  const v = initial;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6 max-w-2xl">
      <UnitsHiddenInput />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="kind"
          label="Kind"
          options={opts(VEHICLE_KINDS, VEHICLE_KIND_LABELS)}
          defaultValue={v?.kind ?? "bike"}
          error={errors.kind}
        />
        <TextField
          name="nickname"
          label="Name"
          hint="What you call it, for example Blue Brompton or Trail shoes."
          maxLength={80}
          defaultValue={v?.nickname}
          error={errors.nickname}
        />
        <TextField name="make" label="Make" optional maxLength={80} defaultValue={v?.make} error={errors.make} />
        <TextField name="model" label="Model" optional maxLength={80} defaultValue={v?.model} error={errors.model} />
        <TextField
          name="year"
          label="Year"
          optional
          inputMode="numeric"
          maxLength={4}
          defaultValue={v?.year}
          error={errors.year}
        />
        <TextField name="color" label="Color" optional maxLength={40} defaultValue={v?.color} error={errors.color} />
        <SelectField
          name="ownership"
          label="Ownership"
          hint="Rented and borrowed vehicles carry no ownership costs."
          options={opts(VEHICLE_OWNERSHIP, VEHICLE_OWNERSHIP_LABELS)}
          defaultValue={v?.ownership ?? "owned"}
          error={errors.ownership}
        />
        <SelectField
          name="energy"
          label="Fuel or power"
          optional
          emptyLabel="Not set"
          options={opts(VEHICLE_ENERGY, VEHICLE_ENERGY_LABELS)}
          defaultValue={v?.energy}
          error={errors.energy}
        />
        <SelectField
          name="defaultTripMode"
          label="Usual trip mode"
          hint="Pre-fills the mode when you pick this vehicle for a trip."
          optional
          emptyLabel="Not set"
          options={opts(TRIP_MODES, TRIP_MODE_LABELS)}
          defaultValue={v?.defaultTripMode}
          error={errors.defaultTripMode}
        />
      </div>

      <DistanceField
        name="odometer"
        label="Starting odometer"
        hint="A car's reading when you started logging, or distance already on a bike or shoes before RideWitUS."
        defaultMeters={v?.odometerOffsetM}
        error={errors.odometer}
      />

      <fieldset className="space-y-4 border-t-4 border-dashed border-[#221E1B] pt-6">
        <legend className="font-display text-2xl text-[#221E1B]">Cost and expected life</legend>
        <p className="text-sm text-[#221E1B]/80">
          Optional. Used later for cost per distance and depreciation, which is an estimate, not a tax figure.
        </p>
        <MoneyFields
          amountName="purchasePrice"
          currencyName="purchaseCurrency"
          label="Purchase price"
          defaultAmount={v?.purchasePrice}
          defaultCurrency={v?.purchaseCurrency ?? homeCurrency}
          errors={errors}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="purchaseDate"
            label="Purchase date"
            type="date"
            optional
            defaultValue={v?.purchaseDate}
            error={errors.purchaseDate}
          />
          <TextField
            name="salvageValue"
            label="Value at end of life"
            hint="Same currency as the price."
            optional
            inputMode="decimal"
            maxLength={16}
            defaultValue={v?.salvageValue}
            error={errors.salvageValue}
          />
          <TextField
            name="expectedLifeYears"
            label="Expected life (years)"
            optional
            inputMode="decimal"
            maxLength={6}
            defaultValue={v?.expectedLifeYears}
            error={errors.expectedLifeYears}
          />
          <DistanceField
            name="expectedLife"
            label="Expected life"
            defaultMeters={v?.expectedLifeM}
            error={errors.expectedLife}
          />
        </div>
      </fieldset>

      <CheckboxField
        name="isActive"
        label="In use"
        hint="Clear this to retire it. Retired vehicles keep their trips and drop out of the trip form."
        defaultChecked={v?.isActive ?? true}
      />

      <FormFooter pending={pending} state={state} submitLabel={submitLabel} />
    </form>
  );
}
