# RideWitUS operations runbook

Steps that run after a deploy, how they are automated, and how to run them by hand when the
automation is broken. Post-deploy automation rule: `gemini/witus/CLAUDE.md`.

## Database migrations

**Automatic.** `.github/workflows/migrate-production.yml` runs `pnpm db:migrate:prod` (drizzle-kit
migrate) on every push to `main` that changes `db/migrations/**`, and on demand: GitHub → Actions →
**Migrate production database** → **Run workflow**. It reads one repository secret, `NEON_DIRECT_URL`,
and passes it to drizzle-kit as `DATABASE_URL_UNPOOLED`. Two runs never overlap (`concurrency`), a
missing secret fails the job with an `::error::` line naming it, and the job summary lists the
migration files and the rows in `drizzle.__drizzle_migrations`. A second run applies nothing.

**Set the secret once** (no value is pasted or printed). Use the Neon project the production Vercel
project is connected to: Vercel → ride-wit-us → Storage shows the store, and Neon Console shows its
project id. (As of 2026-10-16 that move was in progress, user task 15: `neon-ride-wit-us`,
`lingering-sky-69736268`, was replacing `neon-aureolin-school`, `summer-flower-60320520`. Check which
one Vercel uses before setting the secret.)

```bash
neon connection-string --project-id <production project id> \
  | gh secret set NEON_DIRECT_URL --repo dapperAuteur/ride-wit-us
```

`neon connection-string` prints the direct (unpooled) string by default; add `--database-name neondb
--role-name neondb_owner` if the project has more than one.

**Manual fallback** (from the repo, Neon CLI signed in; nothing written to a file):

```bash
cd ~/Code_NOiCloud/ai-builds/gemini/ride-wit-us
git checkout main && git pull
export DATABASE_URL_UNPOOLED="$(neon connection-string --project-id <production project id>)"
pnpm db:migrate:prod
unset DATABASE_URL_UNPOOLED
```

`DATABASE_URL_UNPOOLED` wins over `.env.local` (`lib/db/config.ts`), so the export decides which
database is migrated. Expected output: drizzle-kit lists the migrations it applied (none when the
database is current) and exits 0.

**Check by query** (read-only), the newest migration applied:

```bash
psql "$(neon connection-string --project-id <production project id>)" -X -A -t \
  -c "select id, created_at from drizzle.__drizzle_migrations order by id"
```

The `created_at` of the last row equals the last entry's `when` in `db/migrations/meta/_journal.json`.

| Migration | Adds |
|---|---|
| 0000 to 0002 | Users, settings, vehicles, trips, journeys, lodging, places, vendor refs, waitlist |
| 0003 | `envelope_balances`, `calendar_activities`, `finance_matches` (CentenarianOS event projections) |
| 0004 | `outbound_events` (the outbox for events sent to CentenarianOS) |

## CentenarianOS event receivers

`POST /api/events/envelope-balance`, `/api/events/calendar-activity`, `/api/events/finance-match`
(contract E5 to E7, centenarian-os `docs/integrations/ridewitus-contract.md`). Each checks its own
secret: `ENVELOPE_BALANCE_EVENTS_SECRET`, `CALENDAR_ACTIVITY_EVENTS_SECRET`,
`FINANCE_MATCH_EVENTS_SECRET`, the same value set under the same name on CentenarianOS. Unset = 503
`not_configured`, and CentenarianOS keeps its rows pending, so setting the secret later delivers them.

Hand check after a deploy, with the secret in a shell variable that is never echoed:

```bash
BODY='{"events":[]}'
TS=$(date +%s)
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$ENVELOPE_BALANCE_EVENTS_SECRET" | sed 's/^.* //')
curl -s -X POST https://ride.witus.online/api/events/envelope-balance \
  -H 'Content-Type: application/json' -H 'X-Witus-Source: centenarianos' \
  -H "X-Witus-Timestamp: $TS" -H "X-Witus-Signature: sha256=$SIG" -d "$BODY"
# expect {"accepted":0,"rejected":[]}; the same request with one byte of BODY changed, or a TS
# 301 seconds old, answers 401 {"ok":false,"error":"Unauthorized","code":"unauthorized"}
```

## Outbox to CentenarianOS

Trip writes queue `trip.summary` and `cost.recorded` in `outbound_events` and send them right after
the response. `vercel.json` also runs `GET /api/cron/outbox-drain` daily at 06:30 UTC (a once-a-day
schedule works on every Vercel plan; a shorter interval needs the plan checked first, CentenarianOS
plan 70 §5.2). Vercel sends `Authorization: Bearer $CRON_SECRET`; without `CRON_SECRET` the route
answers 503.

Run a drain by hand (the secret from a shell variable, never echoed):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://ride.witus.online/api/cron/outbox-drain
# {"ok":true,"data":{"receivers":[{"receiver":"centos.mobility_activity","sent":1,...}]}}
```

See what is waiting (read-only):

```bash
psql "$(neon connection-string --project-id <production project id>)" -X -c \
  "select receiver, status, last_reason, count(*) from outbound_events group by 1, 2, 3 order by 1, 2"
```

`pending` + `unknown_subject` = the person has not signed in to CentenarianOS with WitUS yet (waits,
never fails). `failed` = CentenarianOS refused the row (`invalid_event:<field>`,
`unsupported_schema_version`) or the backoff ran out; fix the cause, then set those rows back to
`pending` with `next_attempt_at = now()` and run a drain.
