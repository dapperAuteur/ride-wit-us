# RideWitUS

> A bike-shop curriculum, in podcast form. Part of the [WitUS ecosystem](https://witus.online).

RideWitUS is the audio-first bicycle-mechanic curriculum surface of the WitUS ecosystem. Four seasons, 32 episodes, modeled on the [BetterViceClub](https://centenarianos.com/academy) format developed at CentenarianOS Academy. The classroom, flashcards, and 360° ride tours live in sibling apps; this app is the podcast feed, episode landing pages, and the public face of the curriculum.

**Live:** _local dev only as of 2026-05-08 — production URL pending first deploy_
**Branch policy:** [`CONTRIBUTING.md`](./CONTRIBUTING.md) (small branches, BAM merges between sessions)

---

## Quick start

```sh
git clone https://github.com/dapperAuteur/ride-wit-us
cd ride-wit-us
npm install
npm run dev          # → http://localhost:3000
```

No database required. No login. The canonical episode list is a single TypeScript source of truth at [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts).

For real form submissions to send confirmation/alert email, set `MAILGUN_API_KEY` in `.env.local`. Without it, [`lib/mailgun.ts`](./lib/mailgun.ts) logs would-be sends to stdout. Other env vars documented in [ARCHITECTURE.md](./ARCHITECTURE.md#environment-variables).

`npm test` runs the Vitest suite (today: the error-report scrubber and the health endpoint).

Error monitoring goes to Better Stack over the Sentry protocol and is **off unless a DSN is set**. See [ARCHITECTURE.md § Error monitoring](./ARCHITECTURE.md#error-monitoring). Every event passes through [`lib/sentry-scrub.ts`](./lib/sentry-scrub.ts), which drops form bodies, contact details, location data, and credentials before anything is transmitted.

---

## What's in here

```
app/
  page.tsx              landing (Monon Chalk theme)
  about/                about
  tune-in/              notify-me form + ecosystem sibling links + host listen-party form
  episodes/             catalog + episode detail (32 episodes, statically generated)
  seasons/[n]/          season pages (4)
  api/health/           GET + HEAD liveness probe for uptime monitors
  api/inbox-ingest/     POST endpoint that sends Mailgun email per form_type
  styleguide/           archive of the two non-chosen design directions (not in main nav)
components/             site header/footer, design switcher, NotifyMeForm
lib/
  curriculum/           episodes + seasons + apron palette (single source of truth)
  community-events.ts   shared "Next ride / Open shop" data
  mailgun.ts            Mailgun HTTP-API client (mg.witus.online)
  products.ts           canonical sibling-product list (mirrors gemini/witus/lib/products.ts)
  site-meta.ts          SITE_URL, APP_NAME, APP_DESCRIPTION
  utils.ts              cn() helper for Tailwind class merging
public/brand/           the four ecosystem brand variants — copied from gemini/witus/public/brand/
plans/                  local-only working notes (gitignored — see CLAUDE.md)
types/episode.ts        Episode + SeasonMeta types
```

The four brand variants in `public/brand/` (`01-orbit`, `02-duality`, `03-type-dot`, `04-orbit-type`) are reference assets. The canonical chosen direction is **Monon Chalk** which uses `03-type-dot`. The brand README at [`public/brand/README.md`](./public/brand/README.md) is the source of truth for ecosystem branding.

---

## Architecture in one paragraph

RideWitUS is a thin Next.js 15 App Router app with no database. The 32-episode curriculum lives in [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts). All pages are statically prerendered. Forms POST to [`/api/inbox-ingest`](./app/api/inbox-ingest/route.ts) which sends transactional email via Mailgun on `mg.witus.online`. Classes (CentOS Academy), flashcard decks (FlashLearnAI), and 360° tours (Wanderlearn) live in sibling apps; episode pages link out to them via stable URLs. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture.

---

## Uptime monitoring: `/api/health`

Point uptime monitors (Better Stack and anything else) at **`https://<host>/api/health`, not at `/`.** The
homepage is statically prerendered and can answer `200` from a CDN cache even when the deployment
behind it is broken, so a green check on `/` proves only that the cache still has a copy of the page.

`GET /api/health` returns `200` with:

```json
{
  "ok": true,
  "service": "ride-wit-us",
  "config": { "mailgun": true, "inbox": true, "outbox": true },
  "time": "2026-07-31T11:24:20.664Z"
}
```

`HEAD /api/health` returns the same status with an empty body, for monitors that prefer it. Both send
`Cache-Control: no-store` and the route is `force-dynamic` with `revalidate = 0`, so every check runs
fresh code rather than reading a cached answer.

On failure it returns `503` with `{"ok": false, "error": "<token>"}` where the token is a fixed
literal (`curriculum_unavailable` or `health_check_failed`). It never echoes a raw error message.

### What this proves, and what it does not

**It proves:** the deployment booted, a server route handler executed, and the bundled curriculum
source of truth ([`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts)) loaded with at least one
episode. That is a real check for this app, which has **no database and no auth**: its only hard
runtime dependency is its own content module.

**It does not prove that form submissions are being delivered.** A `/tune-in` submission travels on to
Mailgun and the WitUS Inbox, and this endpoint calls **neither**. The `config` booleans report only
whether each credential set is *present* in the environment, which catches the common failure of an
env var lost in a redeploy, and say nothing about whether the remote service is reachable or accepting.

That omission is deliberate. If the health check called the Inbox, an Inbox outage would turn this
site's uptime monitor red while every page here served perfectly. Paging on someone else's incident is
how a monitor gets ignored. Delivery failures surface through error monitoring
([ARCHITECTURE.md § Error monitoring](./ARCHITECTURE.md#error-monitoring)) and through the Inbox's own
uptime check.

**It leaks nothing.** No env value appears in the response, only `!!` of it. No version, no counts, no
submission data. `app/api/health/route.test.ts` asserts a set env value cannot appear in the serialized
body.

---

## Ecosystem siblings

- [WitUS.online](https://witus.online) — umbrella brand site (this repo's parent)
- [WitUS Inbox](https://inbox.witus.online) — cross-product form intake (Phase 4 integration)
- [WitUS Outbox](https://witus.online) — cross-product publishing pipeline
- [CentenarianOS](https://centenarianos.com) — the OS this curriculum's classes live in (Academy)
- [Wanderlearn](https://wanderlearn.witus.online) — 360° ride routes
- [FlashLearnAI](https://flashlearnai.witus.online) — companion flashcard decks
- [AwesomeWebStore](https://awesomewebstore.com) — merch

---

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — tech stack, data flow, routing map, env vars
- [CONTRIBUTING.md](./CONTRIBUTING.md) — branch hygiene, commit style, dev workflow
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — community expectations
- [SECURITY.md](./SECURITY.md) — vulnerability reporting
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) — code + visual style
- [CLAUDE.md](./CLAUDE.md) — Claude Code session rules (ecosystem identity, operator-task, branch hygiene)
- [public/brand/README.md](./public/brand/README.md) — ecosystem brand spec (canonical)
- [public/brand/footer-recipe.md](./public/brand/footer-recipe.md) — the shared footer pattern

---

## License

Private — © B4C LLC, an [AwesomeWebStore.com](https://awesomewebstore.com) brand. The Rise Wellness disclaimer in the footer is canonical across the WitUS ecosystem and is byte-identical by partnership agreement; do not paraphrase.
