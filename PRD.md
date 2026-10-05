# RideWitUS — Product Requirements Document

**Mobility system of record, and how it works with CentenarianOS for budgets and health**

| | |
|---|---|
| Status | Draft for owner review |
| Date | 2026-10-05 |
| Owner | BAM (B4C LLC) |
| Scope | RideWitUS mobility module (trips, vehicles, fuel, maintenance, components, cost) and its integration with CentenarianOS |
| Related | CentenarianOS decomposition plan 49 (Stage 4), plan 60 (budgets, forecast, savings), plan 61 (depreciation); WitUS decision record `witus/plans/user-tasks/44` |

> **How to read this document.** Every section separates **Exists today** (verified in code on 2026-10-05,
> with file paths) from **Proposed** (not built). Figures that were not verified are labeled **Assumption**.
> Nothing in the Proposed sections is built.

---

## Contents

1. [Summary](#1-summary)
2. [Purpose and one job](#2-purpose-and-one-job)
3. [What exists today](#3-what-exists-today)
4. [Users and jobs to be done](#4-users-and-jobs-to-be-done)
5. [Features](#5-features)
6. [Integration with CentenarianOS](#6-integration-with-centenarianos)
7. [Health and fitness impact](#7-health-and-fitness-impact)
8. [Budgeting](#8-budgeting)
9. [Data ownership and the Stage 4 migration](#9-data-ownership-and-the-stage-4-migration)
10. [Non-goals](#10-non-goals)
11. [Success metrics](#11-success-metrics)
12. [Phased roadmap](#12-phased-roadmap)
13. [Open questions for the owner](#13-open-questions-for-the-owner)
14. [Risks](#14-risks)
15. [References](#references)

---

## 1. Summary

RideWitUS becomes the WitUS ecosystem's **system of record for how a person moves**: trips and rides, the
vehicles they use (car, bike, e-bike, scooter, motorcycle, shoes), fuel, maintenance, wearing components,
and the true cost of each mile. CentenarianOS stays the **cross-domain correlation engine and personal
finance home**. It does not track trips itself after the migration. It receives signed summaries from
RideWitUS and keeps local copies (projections) so its correlations, weekly review, budgets, and expense
forecast keep working offline.

This reverses RideWitUS's original "no database" design. The owner made that call on 2026-08-27
(WitUS decision 1: "RideWitUS grows a Neon DB and takes travel/vehicle/fuel/mileage/maintenance from both
apps"). The podcast curriculum that RideWitUS serves today stays; the mobility module is added next to it.

---

## 2. Purpose and one job

The WitUS rule is one app, one job. The jobs split like this:

| App | One job | Owns | Does not own |
|---|---|---|---|
| **RideWitUS** | Know how you move and what it costs | Trips, rides, routes, vehicles, fuel logs, maintenance, components and wear, service intervals, depreciation schedules per vehicle, cost per mile, trip budgets | Bank transactions, budgets, savings goals, health metrics, correlations |
| **CentenarianOS** | Connect your life's data so patterns show up | Correlations, weekly review, retrospective, health metrics and wearables, personal finance (accounts, transactions, budgets, forecast, savings envelopes) | Raw trip, fuel, and maintenance records (after Stage 4) |
| **Work.WitUS** | Run contract work | Jobs, invoices, job costing | Mileage records (it reads business mileage back from RideWitUS over an API, per decision 1) |

The rule that follows: **RideWitUS computes mobility facts; CentenarianOS decides what they mean for money
and health.** RideWitUS can say "the car's brake pads are due around 2026-12-10, about $180." CentenarianOS
decides that this lands in December's forecast and draws on the car's maintenance envelope.

---

## 3. What exists today

### 3.1 RideWitUS (this repo)

Verified in code on 2026-10-05:

- **A podcast curriculum site.** 32-episode bike-mechanic curriculum catalog in
  [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts); one script written
  (`content/scripts/S01-E01-…`). Static pages for episodes, seasons, about, tune-in.
- **No database.** No trip, vehicle, or fuel code. The earlier activity tracker (Prisma, JWT, Stripe) was
  deleted on `feat/curriculum-podcast`.
- **"Sign in with WitUS" (OIDC) is built and dark until provisioned**: [`lib/auth/`](./lib/auth/),
  `app/api/auth/witus/*`. The session cookie holds `{sub, email, name}` from the WitUS IdP; there is no
  user table. It was added on 2026-09-02 specifically for the incoming travel module. Provisioning is
  operator task `plans/user-tasks/05` (local).
- **A signed HMAC sender** ([`lib/witus-sender.ts`](./lib/witus-sender.ts)) for WitUS Inbox and Outbox,
  using the same wire format CentenarianOS verifies.
- Stack: Next.js 16, React 19, TypeScript, Tailwind 3, Vitest, Vercel, Better Stack (Sentry protocol).

### 3.2 CentenarianOS travel module (moves here in Stage 4)

Verified in `gemini/centenarian-os` on 2026-10-05 (read-only):

| Area | What it does | Where |
|---|---|---|
| Vehicles | Types `car, bike, ebike, motorcycle, scooter, shoes`; nickname, make, model, year; ownership `owned / rental / borrowed`; a default trip mode per vehicle | migrations 052, 053, 059, 067 |
| Trips | Modes `bike, car, bus, train, plane, walk, run, ferry, rideshare, other`; distance (miles), duration, purpose, `travel` vs `fitness` category, tax category, calories (entered or imported, not computed), CO2, cost, linked finance transaction, round trips, multi-stop routes, OSRM route distance, status `planned / in_progress / completed / cancelled`, budget amount, itinerary details (carrier, booking, lodging), sharing | migrations 052, 053, 064, 065, 116, 121–124, 160 |
| Fuel | Fuel logs with odometer, gallons, cost per gallon, grade, MPG (display and calculated), OCR from receipt photo, CSV import/export, linked finance transaction | migration 052; `app/api/travel/fuel/*` |
| FIFO fuel cost | Allocates each car trip's fuel cost from purchased gallons, first in first out, for owned fuel-burning vehicles | migration 158; `lib/travel/fifo.ts` |
| Maintenance | Service records with fixed service types, odometer at service, cost, vendor, hand-typed next-due miles/date, linked transaction | migration 052; `app/api/travel/maintenance/*` |
| Components | Component wear (tires, chain, brake pads, shoes, other) with installed miles and expected life miles; no cost | migration 059; `app/api/travel/components/*` |
| Templates and routes | Trip templates, multi-stop routes, template stops, Google Maps import, route calculation | migrations 060, 065, 144; `app/api/travel/{templates,routes,maps-import,route-calc}` |
| Import | Garmin activity CSV import (dedup by date + title), trips/vehicles CSV import/export | `app/api/travel/import/garmin`, `…/export`, `…/import` |
| Summary | Monthly miles by mode, fuel spend, average MPG, CO2 saved by bike, "bike savings" = bike travel miles × car fuel cost per mile (fuel only) | `app/api/travel/summary/route.ts` |
| CO2 factors | kg CO2 per mile: car and rideshare 0.170, bus 0.089, train 0.041, ferry 0.120, plane 0.255, human-powered 0. **The source of these figures is not recorded in the code.** | `lib/travel/constants.ts` |

**Who reads travel data inside CentenarianOS today** (these are the consumers the integration must keep
fed): `app/api/ai/weekly-review` (bike miles, commute days, bike calories, car miles, fuel),
`app/api/ai/life-retrospective` (trips, fuel), `lib/gemini/data-fetchers.ts` (AI coach travel context),
`lib/profiles/getPublicProfile.ts` (public travel stats), and `activity_links` (links trips and routes to
tasks and transactions). **The correlation engine (`app/api/ai/correlations`,
`lib/analytics/correlation-engine.ts`) does not read travel today**; adding active transport to it is new
value this integration creates.

**Known gaps** (from CentenarianOS plan 60): no service intervals, no odometer for bikes, naive "next
service" alerts, cost per mile counts fuel only, components have no replacement cost.

### 3.3 Work.WitUS

Carries its own travel and mileage module (`contractor-os/app/api/travel`) on the shared Supabase database.
Per decision 1 it moves to RideWitUS too, with Work.WitUS reading business mileage back for job costing.
This PRD covers that only at the contract level (§6.6); a Work.WitUS-specific plan is needed.

---

## 4. Users and jobs to be done

| User | Job to be done | What they need from RideWitUS |
|---|---|---|
| **The owner (BAM)** | "Tell me what getting around actually costs, warn me before the car or bike needs money, and show me whether riding is helping my health." | Fast logging, true cost per mile, dated and costed maintenance forecast, trip budgets, active-transport totals flowing into CentenarianOS |
| **Commuter** | "Is biking to work worth it versus driving?" | Bike-vs-car cost comparison using true car cost per mile, commute quick-log, CO2 avoided |
| **Cyclist** | "Keep my bike safe and know when parts are worn." | Component wear by miles, service intervals per bike, ride history, Garmin import |
| **Multi-vehicle household or gig driver** | "Track each vehicle's cost and business miles." | Per-vehicle cost, tax category per trip, mileage export for Work.WitUS job costing |
| **Traveler** | "Plan a trip, set a budget, see what it really cost, in any currency." | Planned trips with budgets, costs in the currency paid, actuals vs budget |

The FreeWheelin' curriculum audience (bike mechanics, YEET apprentices) is served by the podcast surface,
not this module. A later link is possible (a mechanic logging a bike's service history), but it is not in
scope.

---

## 5. Features

Status key: **E** = exists in CentenarianOS and is ported; **E+** = exists and is extended; **N** = new.

### 5.1 Trip and ride logging

- **E** Manual trip entry with mode, vehicle, distance, duration, purpose, category, cost, notes; round
  trips; multi-stop routes; templates and one-tap commute logging; planned trips with status.
- **E** Garmin activity CSV import (port `app/api/travel/import/garmin` with its dedup key).
- **E** Google Maps import and route distance (OSRM) for planned routes.
- **N** Mode list adds **e-bike** and **scooter** as trip modes (today they exist as vehicle types only,
  so an e-bike ride is logged as `bike`, which overstates effort; see §7).
- **N, later** Garmin Connect or Strava API sync, and GPX/FIT file upload. **Nothing for Strava exists in
  CentenarianOS today.** Each needs a vendor developer account (an operator task) and its own terms review.
- **N, later** In-app GPS recording. Deferred: phone GPS recording is a large mobile-reliability project
  and Garmin/Strava already do it well.
- **Calendar tokens.** CentenarianOS's Google Calendar sync parses `#trip 115mi` into a trip
  (`lib/capture/parse-tokens.ts`, plan 59 Part 4). After Stage 4 that parsed trip must be **created in
  RideWitUS** (CentenarianOS calls a RideWitUS write API), not in CentenarianOS. See open question 7.

### 5.2 Vehicles and components

- **E** Vehicles of type car, bike, e-bike, motorcycle, scooter, shoes; ownership owned/rental/borrowed;
  default trip mode.
- **E+** Components with installed miles and expected life, **plus replacement cost** and support for bikes
  and shoes without an odometer: their mileage is the sum of trips logged on them.
- **N** **Service intervals with built-in defaults per vehicle type, editable per vehicle** (owner decision,
  plan 60, 2026-10-04). Each interval is miles and/or months. Next due = last service of that type +
  interval, compared with the projected odometer. The default table is seed data the owner reviews before
  launch; **the default values themselves are not yet chosen and are an assumption until reviewed.**
  Example rows to seed: car oil change, tire rotation, brake pads; bike chain, brake pads, tires, tune-up;
  shoes replacement by miles.
- **N** Odometer for bikes and shoes derived from trips; optional manual odometer correction.

### 5.3 Fuel logs and efficiency

- **E** Fuel logs, receipt OCR, CSV import/export, MPG calculated and displayed, FIFO fuel cost per trip.
- **N** Charging logs for e-bikes and electric cars (kWh, cost), so electricity counts as fuel. Assumption:
  the owner wants this; it is not in any CentenarianOS plan.
- **N** Fuel forecast per vehicle: projected miles × (1 ÷ recent MPG) × recent price per gallon (plan 60
  Phase C formula).

### 5.4 Maintenance history and next due

- **E** Service records with cost, vendor, odometer, linked finance transaction.
- **E+** Real "due soon" and "overdue" alerts from the latest record per service type, by miles or date.
- **N** Each upcoming service becomes a **dated, costed forecast item**: cost = average of that service's past
  costs on this vehicle, else the user's estimate, else blank (never a guessed default presented as fact).

### 5.5 True cost per mile

- **N** Per vehicle and per mode: **(fuel + maintenance + depreciation) ÷ miles**, over a chosen window,
  replacing today's fuel-only figure.
- **N** **Depreciation** (owner said yes, plan 61 §3): per vehicle, optional purchase price and date,
  expected life (years and/or miles), salvage value, straight-line by default. Monthly depreciation and
  current book value are shown and sent to CentenarianOS. Labeled as an estimate, not a tax figure.
- **N** Rentals and borrowed vehicles excluded from ownership costs (keeps today's rule).

### 5.6 Active-transport health metrics

- **E** Distance and duration by mode; calories when entered or imported from Garmin; CO2 per trip.
- **N** Active minutes per trip (moving time for human-powered modes).
- **N** Calorie **estimate** when the user or device gave none, clearly labeled as an estimate (§7).
- **N** CO2 avoided: human-powered trip miles × the car factor the user's own car would have emitted.

### 5.7 Multi-currency trip costs

- **N** Every cost (trip, fuel, maintenance, component) stores **amount + ISO 4217 currency + date**.
- **N** A home-currency amount for totals, using the rate on the date paid. Rate source is an open question.
- The brief for this PRD says CentenarianOS is adding multi-currency cash accounts for travel. **As of
  2026-10-05 no currency column or plan for it exists in CentenarianOS code or `plans/`.** RideWitUS should
  send the original currency and amount and let CentenarianOS convert, so the two apps never disagree on a
  rate. See open question 5.

---

## 6. Integration with CentenarianOS

This is the core of the PRD. Everything here is **Proposed** unless marked otherwise.

### 6.1 Principles

1. **Push, not pull.** RideWitUS sends signed events; CentenarianOS stores local projections and reads only
   those. This is the pattern already live for Work.WitUS income (`app/api/events/income`, migration 196)
   and work schedules (`app/api/events/work-schedule`, migration 197), chosen because CentenarianOS is
   offline-first: its dashboards must render when a sibling app is down.
2. **Summaries, not raw records.** CentenarianOS gets what it needs for correlations, budgets, and
   forecasts. It does not get receipts, routes, itinerary details, or GPS.
3. **Separate projections for separate meanings.** Like income vs work schedule, activity (health) and
   money (cost and forecast) go to separate tables, so a change to one never corrupts the other.
4. **Idempotent and replayable.** Every event has a stable `event_id`; receivers upsert on
   `(user_id, event_id)`; redelivery is a no-op; a retired fact is sent with `is_active: false`, never deleted.
5. **Minimal in the other direction.** CentenarianOS sends back only what RideWitUS cannot know and needs to
   show (§6.5).

### 6.2 Wire format (exists today, reused unchanged)

```
POST <receiver URL>
Content-Type: application/json
X-Witus-Source:    ride-witus
X-Witus-Timestamp: <unix seconds>
X-Witus-Signature: sha256=<hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))>
```

Receivers verify with `lib/events/verify-signature.ts` (CentenarianOS): 300-second replay window,
constant-time comparison, flat 401 on failure, 503 when the secret is unset. Bodies are a single event or
`{ "events": [...] }` with at most 500 events. Responses report `accepted` and `rejected` counts with
per-row reasons. RideWitUS already has the sender half in `lib/witus-sender.ts`.

The source slug `ride-witus` matches the `slug` in `gemini/witus/lib/products.ts`; confirm before shipping.

### 6.3 Identity mapping

- RideWitUS has no shared database with CentenarianOS, so it cannot know a CentenarianOS `user_id`. It
  knows the WitUS IdP subject (`sub`) from sign-in.
- **Every event carries `witus_sub`.** CentenarianOS resolves it through its existing `witus_identities`
  table (`sub` → `user_id`, created on first "Sign in with WitUS" to CentenarianOS, linking by email).
- If no mapping exists, CentenarianOS rejects that row with reason `unknown_subject` and RideWitUS keeps it
  queued. The user fixes it by signing in to CentenarianOS with WitUS once; the next retry succeeds.
- RideWitUS's own `users` table is keyed by `witus_sub` (it needs a table once it stores data). For the
  Stage 4 migration, each CentenarianOS `user_id` is translated to `witus_sub` through the same table;
  users without a mapping are listed for manual handling, not dropped.

### 6.4 RideWitUS → CentenarianOS events

Two proposed receivers in CentenarianOS, one per meaning, each with its own secret so either can be
rotated or revoked alone:

| Receiver (proposed) | Secret env var (proposed) | Projection table (proposed, additive) |
|---|---|---|
| `POST /api/events/mobility-activity` | `MOBILITY_ACTIVITY_EVENTS_SECRET` | `mobility_activity_events` |
| `POST /api/events/mobility-cost` | `MOBILITY_COST_EVENTS_SECRET` | `mobility_cost_events`, `mobility_vehicle_snapshots` |

Common fields on every event:

| Field | Type | Notes |
|---|---|---|
| `event_id` | string | Stable and deterministic, for example `trip:<uuid>`, `maint:<vehicle>:<service_type>`, `vehicle:<uuid>:<YYYY-MM>` |
| `event_type` | string | One of the types below |
| `schema_version` | integer | Starts at 1; receivers reject unknown majors with a named reason |
| `witus_sub` | string | Identity (§6.3) |
| `occurred_at` | ISO timestamp | When the fact changed in RideWitUS (last write wins on equal `event_id`) |
| `is_active` | boolean | Absent = true; `false` retires the row (deleted trip, completed or cancelled forecast item) |

#### A. `trip.summary` (activity receiver)

**When:** a trip is created, edited, completed, or deleted in RideWitUS (deleted → `is_active: false`).
**Why:** feeds weekly review, retrospective, the AI coach, the public profile, and new active-transport
correlations.

| Field | Type | Notes |
|---|---|---|
| `trip_id` | string | RideWitUS id |
| `date` | YYYY-MM-DD | Local date of the trip |
| `mode` | enum | `bike, ebike, scooter, walk, run, car, motorcycle, bus, train, plane, ferry, rideshare, other` |
| `vehicle_kind` | enum or null | `car, bike, ebike, motorcycle, scooter, shoes` |
| `purpose` | enum or null | `commute, leisure, work, errand, exercise, other` |
| `category` | enum | `travel` or `fitness` (existing CentenarianOS distinction) |
| `distance_miles` | number or null | Miles, matching CentenarianOS today |
| `duration_min` | integer or null | Total time |
| `active_minutes` | integer or null | Human-powered moving time; null for motorized modes |
| `calories_kcal` | integer or null | |
| `calories_source` | enum or null | `device`, `manual`, `estimate` (§7) |
| `co2_kg` | number or null | Emitted |
| `co2_avoided_kg` | number or null | Human-powered only |
| `is_human_powered` | boolean | Lets CentenarianOS filter without knowing the mode list |
| `status` | enum | Only `completed` trips count toward health totals |

#### B. `trip.plan` (cost receiver)

**When:** a planned trip is created or its dates or budget change; retired when the trip completes or is
cancelled. **Why:** plan 60 Phase B lists planned trips' budgets in the expense forecast; Phase D lets a
planned trip create a savings envelope.

Fields: `trip_id`, `label`, `start_date`, `end_date`, `budget_amount`, `currency`, `tax_category`,
`destination_label` (free text the user typed; no coordinates).

#### C. `forecast.item` (cost receiver)

**When:** recomputed after any fuel, maintenance, component, or trip write for that vehicle, and nightly.
**Why:** plan 60 Phase C (travel-driven predictions) and Phase B (expense forecast). The owner's 2026-10-05
note in plan 61: Phase C should read travel from RideWitUS, not grow CentenarianOS's module.

| Field | Type | Notes |
|---|---|---|
| `kind` | enum | `fuel`, `maintenance`, `component`, `registration_or_insurance` (later) |
| `vehicle_id` | string | RideWitUS id |
| `vehicle_label` | string | Nickname, for display |
| `label` | string | For example "Brake pads (Civic)" |
| `expected_date` | YYYY-MM-DD | Fuel: one item per vehicle per month |
| `expected_amount` | decimal string | Never a fabricated default; omitted when unknown |
| `currency` | ISO 4217 | |
| `basis` | enum | `history_average`, `user_estimate`, `interval_default`, `projection` |
| `due_by_miles` | number or null | For maintenance and components |
| `confidence` | enum | `low`, `medium`, `high` (date confidence from mileage projection) |

#### D. `vehicle.snapshot` (cost receiver)

**When:** monthly (first of month for the prior and current month) and on any change to a vehicle's
purchase or depreciation inputs. **Why:** projected monthly miles and depreciation per vehicle for the
forecast, and true cost per mile for budgets and the bike-vs-car comparison.

Fields: `vehicle_id`, `vehicle_label`, `vehicle_kind`, `ownership`, `month` (YYYY-MM),
`miles_actual`, `miles_projected`, `cost_fuel`, `cost_maintenance`, `cost_depreciation`,
`cost_per_mile`, `book_value`, `currency`.

#### E. `cost.recorded` (cost receiver)

**When:** a fuel log, maintenance record, component purchase, or trip cost is saved or changed. **Why:** so
CentenarianOS can suggest a match to a bank or card transaction it imported (CentenarianOS owns
transactions; RideWitUS never writes them). This replaces today's direct `transaction_id` foreign keys on
`fuel_logs`, `vehicle_maintenance`, and `trips`, which cannot survive the database split.

Fields: `source_type` (`fuel`, `maintenance`, `component`, `trip`), `source_id`, `date`, `amount`,
`currency`, `vendor`, `vehicle_label`, `category_hint` (`auto_fuel`, `auto_maintenance`, `bike`, `transit`,
`travel`).

### 6.5 CentenarianOS → RideWitUS events (minimal)

| Event | When | Fields | Why |
|---|---|---|---|
| `cost.matched` | The user confirms, changes, or removes a match between a `cost.recorded` item and a finance transaction | `source_type`, `source_id`, `matched` (bool), `transaction_amount`, `transaction_currency`, `transaction_date`, `deep_link` (CentenarianOS URL of the transaction) | RideWitUS shows "paid, matched to your card on Oct 3" and can correct a cost typed in the wrong currency. It stores the reference, not the transaction |

Receiver (proposed): `POST /api/events/finance-match` on RideWitUS, secret `FINANCE_MATCH_EVENTS_SECRET`.

**Deliberately not sent:** budgets, account balances, savings envelopes. A vehicle or bike purchase envelope
lives in CentenarianOS; RideWitUS links to it with a deep link at most. This keeps "each app one job" and
keeps financial data out of RideWitUS. See open question 6.

### 6.6 Work.WitUS (contract only)

Decision 1 says Work.WitUS reads business mileage back from RideWitUS for job costing. Proposed: a
read-only, server-to-server API on RideWitUS (`GET /api/v1/mileage?witus_sub=&from=&to=&tax_category=business`),
HMAC-authenticated with the same header scheme. A pull fits here because job costing is computed on demand
and Work.WitUS is not offline-first. Details belong in a Work.WitUS plan.

### 6.7 Delivery, retries, and resync

- **Outbox table in RideWitUS** (`outbound_events`): every write that changes an emitted fact inserts an
  event row in the same database transaction, so a fact is never saved without its event.
- **Drain:** a Vercel cron every few minutes sends pending rows in batches of up to 500, per receiver.
- **Retries:** exponential backoff (for example 1 min, 5, 30, 2 h, 12 h), then `failed` with an alert to
  Better Stack. `unknown_subject` rows wait without alerting and are retried when the user's identity maps.
- **At least once:** receivers upsert on `(user_id, event_id)`; redelivery is harmless.
- **Ordering:** `occurred_at` decides; a receiver ignores an event older than the stored row for the same
  `event_id`.
- **Resync script:** `scripts/resync-centos.mjs --user <witus_sub> --since <date> [--dry]` re-emits current
  state for a user (all active facts plus `is_active: false` for retired ones). Same idea as CentenarianOS's
  `scripts/backfill-income-events.mjs`, whose deterministic `event_id` scheme lets a backfill and the live
  emitter update the same rows.
- **CentenarianOS fallback during cutover:** like Phase 2 income, CentenarianOS's readers use the projection
  when it has rows for a user and the legacy tables otherwise, so deploy order does not matter.

### 6.8 What CentenarianOS does with the projections

| CentenarianOS surface | Reads (after integration) |
|---|---|
| Weekly review, retrospective, AI coach | `mobility_activity_events` |
| Correlation engine (new input) | Daily active-transport minutes and miles by mode, from `mobility_activity_events` |
| Budgets (plan 60 Phase A) | Unchanged: actual spending still comes from transactions; `cost.recorded` only helps categorize and match |
| Expense forecast (plan 60 Phase B/C) | `mobility_cost_events` (`trip.plan`, `forecast.item`), `mobility_vehicle_snapshots` |
| Savings envelopes (plan 60 Phase D) | `trip.plan` can seed a trip envelope; a vehicle's forecast items can seed a maintenance envelope |
| Public profile travel stats | `mobility_activity_events` |

---

## 7. Health and fitness impact

### 7.1 What counts

- **Active transport** = completed trips in modes `bike`, `ebike`, `walk`, `run`, and kick `scooter` when the
  user marks it unpowered. Motorized modes never count toward activity.
- **E-bike counts, at a lower intensity.** Today an e-bike ride is logged as `bike`, which overstates
  effort. The new `ebike` mode with an assist level fixes this.
- **Active minutes** = moving time for counted modes. Shown against the U.S. guideline of at least 150
  minutes a week of moderate-intensity activity (U.S. Department of Health and Human Services [HHS], 2018).
  Whether each mode counts as moderate or vigorous depends on pace and is estimated (below).

### 7.2 Calories

Order of preference, recorded in `calories_source`:

1. **Device** (Garmin import or a future API): use as given.
2. **Manual**: use as given.
3. **Estimate**: kcal ≈ MET × body mass (kg) × hours, the standard Compendium method (Ainsworth et al.,
   2011; Herrmann et al., 2024). Body mass comes from CentenarianOS health metrics, which RideWitUS does not
   own. Options: the user enters it in RideWitUS, or CentenarianOS computes the estimate on receipt
   (recommended, since it already holds weight; see open question 8).

**Assumption, verify before shipping:** MET values reported for the 2024 Adult Compendium include leisure
bicycling about 5.8, bicycling 12–13.9 mph moderate effort 8.0, and electrically assisted bicycling between
about 4.0 (high assist) and 6.8 (no assist) (Herrmann et al., 2024). These were read from a secondary
summary, not the Compendium tables, and must be checked against the Compendium website before they are
coded. Walking and running values depend on speed and must be taken from the same tables.

Estimates are always labeled "estimate" in both apps and never mixed silently with device values in a
correlation.

### 7.3 CO2

Today's per-mile factors (§3.2) have no recorded source. Before they appear in shareable reports, replace
them with sourced factors and cite them, or label them as unsourced estimates. Assumption until then.

### 7.4 Data needed

Per trip: mode, assist level (e-bike), date, duration, moving time, distance, calories and their source.
From CentenarianOS (if it computes estimates): body mass on or near the trip date.

---

## 8. Budgeting

All money decisions happen in CentenarianOS; RideWitUS supplies the facts.

| Need | RideWitUS supplies | CentenarianOS does |
|---|---|---|
| Travel category budgets | `cost.recorded` with a `category_hint` | Budgets from transaction history (plan 60 Phase A); suggests categories for matched costs |
| Cost per mile by mode | `vehicle.snapshot.cost_per_mile`; per-mode totals | Shows cost of getting around per month alongside other spending |
| Bike vs car savings | Bike travel miles (activity) × the car's **true** cost per mile (snapshot) | Shows "riding saved about $X this month", replacing today's fuel-only figure |
| Trip budgets vs actuals | `trip.plan` budget; trip costs in `cost.recorded` | Forecasts the budget, then compares with matched transactions |
| Maintenance sinking funds | Dated, costed `forecast.item`s per vehicle | A maintenance envelope per vehicle (plan 60 Phase D: virtual envelopes in one savings account, owner decision 2026-10-04), with a suggested monthly contribution = upcoming costs ÷ months until due |
| Vehicle or bike purchase | Optional: depreciation end date and expected replacement cost | A savings envelope for the replacement |
| Depreciation | Monthly depreciation per vehicle | Optional line in the forecast; not a cash outflow, shown separately |

---

## 9. Data ownership and the Stage 4 migration

### 9.1 What moves to RideWitUS

From CentenarianOS (shared Supabase) to RideWitUS (Neon, per decision 1): `vehicles`, `trips`,
`fuel_logs`, `vehicle_maintenance`, `component_wear`, `fuel_allocations`, `travel_settings`,
`trip_templates`, `trip_template_stops`, `trip_routes`, `trip_shares`. Also Work.WitUS's travel and mileage
data (separate plan).

**Needs a decision:** `contact_locations` (migration 064) belongs to contacts but serves trip origins and
destinations. Recommended: stays in CentenarianOS; RideWitUS keeps its own saved places.

### 9.2 What CentenarianOS keeps

- Projections only: `mobility_activity_events`, `mobility_cost_events`, `mobility_vehicle_snapshots`.
- `financial_transactions` (it always owned them). The `transaction_id` links on moved tables become
  `cost.recorded` + `cost.matched` pairs.
- `activity_links` rows pointing at trips or routes become deep links to RideWitUS (or are retired);
  needs a check of how many exist.
- Travel UI becomes a summary widget plus deep links to `https://ride.witus.online` (the domain confirmed
  in decision 4).

### 9.3 Migration phases

1. **Build** the RideWitUS module and database (no data moved). CentenarianOS travel unchanged.
2. **Integrate**: CentenarianOS receivers and projections ship with the legacy fallback (§6.7). RideWitUS
   emits for its own users.
3. **Copy**: export CentenarianOS travel tables per user, translate `user_id` → `witus_sub`, import into
   RideWitUS keeping ids, then run the resync script so projections fill. Verify counts and totals per user.
4. **Cut over**: CentenarianOS travel pages become read-only with "Moved to RideWitUS" links; writes go to
   RideWitUS; calendar `#trip` tokens call the RideWitUS API.
5. **Deprecate**: CentenarianOS travel tables marked deprecated (additive-only rule). Dropped only in
   decomposition Stage 6, after the owner confirms.

**Verification (from plan 49 §7):** log a trip and a fuel fill in RideWitUS; confirm the summary lands in
CentenarianOS and appears in a correlation and in the weekly review; confirm the forecast shows the next
service.

---

## 10. Non-goals

- RideWitUS does **not** hold bank transactions, account balances, budgets, or savings envelopes.
- RideWitUS does **not** run correlations or own health metrics.
- No rideshare marketplace or driver/rider dispatch (see open question 1 about the registry description).
- No in-app turn-by-turn navigation and, in the MVP, no live GPS recording.
- No tax advice: depreciation and mileage figures are estimates for the user's records.
- No changes to the podcast curriculum surface as part of this work.
- No automatic bank linking (CentenarianOS removed Teller; plan 59).

---

## 11. Success metrics

| Metric | Target (proposed) |
|---|---|
| Owner logs trips in RideWitUS instead of CentenarianOS | 100% of new trips after cutover |
| Event delivery | 99% of events accepted by CentenarianOS within 15 minutes; zero events lost (outbox rows never stuck in `failed` for more than a day without an alert) |
| Projection accuracy | After resync, per-user trip count and total miles in CentenarianOS match RideWitUS exactly |
| Migration completeness | 100% of CentenarianOS travel rows copied or explicitly listed as unmapped |
| Forecast usefulness | Every active owned vehicle has at least one dated maintenance forecast item within 30 days of setup |
| Cost-match rate | At least 80% of fuel and maintenance costs matched to a transaction within one statement cycle |
| Health signal | Active-transport minutes appear as a correlation input and in the weekly review |
| CentenarianOS intact | Correlations, retrospective, and weekly review still render after each phase (plan 49 rule) |

---

## 12. Phased roadmap

| Phase | Scope | Exit |
|---|---|---|
| **0. Foundations** | Owner approves this PRD; resolve identity wording (open question 1); provision WitUS SSO (task 05); provision Neon; add Drizzle and a `users` table keyed by `witus_sub`; update this repo's CLAUDE.md and ARCHITECTURE.md, which still say "no database" and "isn't a ride tracker" | Signed-in user can reach an empty mobility dashboard |
| **1. MVP (standalone)** | Vehicles, manual trips, fuel logs, maintenance, components, service intervals with defaults, true cost per mile with depreciation, active-transport stats, multi-currency costs, Garmin CSV import, CSV export | Owner can run his own mobility from RideWitUS for a month |
| **2. Integration** | RideWitUS outbox and emitters; CentenarianOS receivers and projections with legacy fallback; CentenarianOS weekly review, retrospective, AI coach, and correlations read projections; plan 60 Phase C/B read forecast items; `cost.matched` back-channel; resync script | A RideWitUS trip and service forecast show up in CentenarianOS |
| **3. Stage 4 migration** | Copy CentenarianOS travel data; cut over UI and calendar tokens; deprecate tables; Work.WitUS mileage move and read-back API | CentenarianOS travel = summary widget; no writes to old tables |
| **4. Later** | Garmin or Strava API sync, GPX/FIT upload, e-car charging detail, insurance and registration forecasts, Stage 6 table drops | As prioritized |

---

## 13. Open questions for the owner

1. **Identity wording.** `gemini/witus/lib/products.ts` describes RideWitUS as "Rideshare and community
   transport … driver and rider tools", and its `signInHref` is `/login` while this app's page is
   `/signin`. This PRD assumes RideWitUS is the mobility record plus the podcast curriculum, not a rideshare
   app. Confirm, and the registry entry should be corrected.
2. **One product or two surfaces?** Should the mobility module and the podcast curriculum share one
   navigation, or should mobility live behind sign-in under its own section (for example `/app`)?
3. **Trip planning scope.** CentenarianOS trips also hold flights, lodging, booking numbers, packing notes,
   and sharing. Do these move to RideWitUS too, or should RideWitUS own only ground mobility and leave
   itineraries elsewhere?
4. **Units.** Keep miles (as CentenarianOS does) or store meters and display by user preference?
5. **Multi-currency.** Which app owns exchange rates and which rate source? Recommendation: RideWitUS stores
   the original amount and currency; CentenarianOS converts. Is the multi-currency cash-account work in
   CentenarianOS planned anywhere yet? No plan was found.
6. **Back-channel.** Is `cost.matched` enough, or do you want RideWitUS to show a vehicle's savings-envelope
   progress (which would mean CentenarianOS sends balances)?
7. **Calendar tokens after cutover.** Should `#trip` calendar entries be created in RideWitUS (CentenarianOS
   calls its API) or should RideWitUS read the calendar itself?
8. **Calorie estimates.** Should CentenarianOS compute them on receipt (it has your weight), or should you
   enter weight in RideWitUS?
9. **Default service intervals.** Who supplies the default table: you, a cited manufacturer-neutral source,
   or both? (Defaults must not be presented as manufacturer schedules.)
10. **Depreciation inputs.** Do you want depreciation for bikes and shoes too, or only for cars and
    e-bikes?
11. **Other users.** Is this for you alone at first, or open to any WitUS account (the sign-in today has no
    allow-list)?
12. **Strava/Garmin API.** Worth the vendor setup in Phase 4, or is CSV import enough?

---

## 14. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Identity not mapped (user never signed in to CentenarianOS with WitUS) | Events rejected; CentenarianOS shows no travel | `unknown_subject` queue, a visible "connect CentenarianOS" prompt in RideWitUS, migration report of unmapped users |
| Projection drift | CentenarianOS totals differ from RideWitUS | Deterministic `event_id`s, `occurred_at` ordering, resync script, a nightly count check |
| Losing the transaction links | Fuel and maintenance costs no longer tie to bank rows | `cost.recorded` + `cost.matched`; migration carries existing links over as matches |
| Scope creep into finance | RideWitUS grows budgets and duplicates CentenarianOS | Non-goals §10; budgets and envelopes stay in CentenarianOS |
| Unsourced figures (CO2 factors, MET values, default intervals) | Wrong numbers in shareable reports | Label as estimates; verify and cite before shipping (§7) |
| Shared-database coupling during migration | Breaking CentenarianOS or Work.WitUS reads | Additive-only; legacy fallback; drops only in Stage 6 |
| Database reversal of a static site | Build failures on unprovisioned deploys; health check semantics change | Keep public pages static and DB-free; mobility routes fail closed; extend `/api/health` with a DB presence flag only |
| Two apps' travel at once (Work.WitUS) | Double-counted business miles | Migrate Work.WitUS mileage in its own phase with a dedup report |
| Privacy | Location data in errors or events | Events carry no coordinates; existing `lib/sentry-scrub.ts` already redacts lat/lng and addresses |

---

## References

Ainsworth, B. E., Haskell, W. L., Herrmann, S. D., Meckes, N., Bassett, D. R., Jr., Tudor-Locke, C.,
Greer, J. L., Vezina, J., Whitt-Glover, M. C., & Leon, A. S. (2011). 2011 Compendium of Physical
Activities: A second update of codes and MET values. *Medicine & Science in Sports & Exercise, 43*(8),
1575–1581. https://doi.org/10.1249/MSS.0b013e31821ece12

Herrmann, S. D., Willis, E. A., Ainsworth, B. E., Barreira, T. V., Hastert, M., Kracht, C. L., Schuna,
J. M., Jr., Cai, Z., Quan, M., Tudor-Locke, C., Whitt-Glover, M. C., & Jacobs, D. R., Jr. (2024). 2024
Adult Compendium of Physical Activities: A third update of the energy costs of human activities. *Journal
of Sport and Health Science, 13*(1), 6–12. https://doi.org/10.1016/j.jshs.2023.10.010

U.S. Department of Health and Human Services. (2018). *Physical activity guidelines for Americans* (2nd
ed.). https://health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines
