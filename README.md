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

`npm test` runs the Vitest suite (today: the error-report scrubber).

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
