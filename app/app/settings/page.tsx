import { MobilityGate } from "@/components/mobility/mobility-gate";
import { Efficiency, Measurement } from "@/components/units/measurement";
import { UnitsProvider } from "@/components/units/units-provider";
import { UnitsToggle } from "@/components/units/units-toggle";
import { getMobilityContext } from "@/lib/mobility/context";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

// Sample canonical values for the preview: a 10-mile ride, a 12-gallon fill over 330 miles,
// 60 mph, 80 kg, 32 psi. Stored as meters, liters, m/s, kg, kPa like everything else.
const SAMPLE = {
  rideMeters: 16093.44,
  fillLiters: 45.42494,
  fillMeters: 531083.52,
  speedMs: 26.8224,
  weightKg: 80,
  pressureKpa: 220.632,
};

export default async function MobilitySettingsPage() {
  const ctx = await getMobilityContext();
  if (ctx.state !== "ok") return <MobilityGate state={ctx.state} />;

  const rows = [
    { label: "A ride", value: <Measurement value={SAMPLE.rideMeters} dimension="distance" /> },
    { label: "A fill-up", value: <Measurement value={SAMPLE.fillLiters} dimension="volume" /> },
    { label: "Fuel efficiency", value: <Efficiency meters={SAMPLE.fillMeters} liters={SAMPLE.fillLiters} /> },
    { label: "Speed", value: <Measurement value={SAMPLE.speedMs} dimension="speed" /> },
    { label: "Body weight", value: <Measurement value={SAMPLE.weightKg} dimension="weight" /> },
    { label: "Tire pressure", value: <Measurement value={SAMPLE.pressureKpa} dimension="pressure" /> },
  ];

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="settings-heading">
        <h1 id="settings-heading" className="font-display text-4xl sm:text-5xl tracking-tight text-[#221E1B]">
          Settings
        </h1>
        <div className="mt-8">
          <SettingsForm initial={ctx.settings} />
        </div>
      </section>

      <UnitsProvider defaultSystem={ctx.settings.unitSystem}>
        <aside aria-labelledby="preview-heading" className="border-2 border-[#221E1B] bg-[#fff8e8] p-5 self-start">
          <h2 id="preview-heading" className="font-display text-2xl text-[#221E1B]">
            How numbers look
          </h2>
          <p className="mt-1 text-sm text-[#221E1B]/80">Your saved default. Save the form to change it.</p>
          <div className="mt-4">
            <UnitsToggle />
          </div>
          <dl className="mt-4 divide-y divide-[#221E1B]/20">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-sm text-[#221E1B]/80">{r.label}</dt>
                <dd className="font-semibold text-[#221E1B]">{r.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </UnitsProvider>
    </div>
  );
}
