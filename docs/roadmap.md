---
app: ride
name: RideWitUS
stage: beta
url: https://ride.witus.online
updated: 2026-10-29
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

## Next
- Phase 1b: fuel logs, maintenance and components with service intervals (plan 02)
- Phase 1c: cost per mile and depreciation
- Phase 1d: CSV import, starting with Garmin exports

## Backlog
- Phase 1e: receipt and ticket image importer
- Phase 1f: vendors, with prices from CentenarianOS
- Phase 1g: public demo with a nightly reset
- Phase 2: signed events both ways with CentenarianOS, suggested trips from the calendar, Sync now
- Phase 3: move CentenarianOS travel data here (owner runs the migration)
- Later: Garmin and Strava APIs, GPX and FIT files, insurance and registration forecasts

## Blocked on
- Phase 1a hand-check (task 13)
- CentenarianOS endpoints and events for vendors, calendar and resync (plan 02, dependency D4)
- Decision on AI or local scanning for the image importer (PRD question 13)
- Database rename to match the repo (task 15, not urgent)
- Error-monitoring DSN and uptime monitor (tasks 02 and 03)
