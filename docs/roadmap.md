---
app: ride
name: RideWitUS
stage: beta
url: https://ride.witus.online
updated: 2026-11-01
---

## Live now
- Bike-mechanic curriculum in podcast form: 4 seasons, 32 episode pages
- Tune-in page with notify-me signup
- Sign in with WitUS as the only sign-in
- Mobility app (owner trial): vehicles, trips, multi-leg journeys with flights and lodging, saved places
- Units, currency and time-zone settings
- Public waitlist with a confirmation email
- Forms and signups forwarded to WitUS Inbox; episode posts drafted in WitUS Outbox
- Health check covering the database, sign-in, email, Inbox and Outbox

## In progress
- Owner hand-check of Phase 1a and a week of logged trips (plan 02)
- Signed calls with CentenarianOS (CentenarianOS plan 70, wave 1): request signing and checking, tested against the shared vectors
- Phase 1f: vendors picked from CentenarianOS, a vendor page with your trips and CentenarianOS prices, and a Vendor field on trips (built; works once the CentenarianOS URL and vendor secret are set, task 17)

## Next
- Phase 1b: fuel logs, maintenance and components with service intervals (plan 02)
- Phase 1c: cost per mile and depreciation
- Phase 1d: CSV import, starting with Garmin exports

## Backlog
- Phase 1e: receipt and ticket image importer
- Phase 1g: public demo with a nightly reset
- Phase 2: signed events both ways with CentenarianOS, suggested trips from the calendar, Sync now
- Phase 3: move CentenarianOS travel data here (owner runs the migration)
- Later: Garmin and Strava APIs, GPX and FIT files, insurance and registration forecasts

## Blocked on
- Phase 1a hand-check (task 13)
- CentenarianOS URL and vendor secret on this app, for vendors (task 17)
- CentenarianOS mobility receivers and cost.matched, for Phase 2 (CentenarianOS plan 70, branches C-3 and C-6)
- Decision on AI or local scanning for the image importer (PRD question 13)
- Database rename to match the repo (task 15, not urgent)
- Error-monitoring DSN and uptime monitor (tasks 02 and 03)
