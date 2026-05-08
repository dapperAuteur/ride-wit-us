# Architecture

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Ecosystem default; static-first with on-demand dynamic API routes |
| Language | **TypeScript** | Strict mode; no codegen |
| Styling | **Tailwind CSS 3** + CSS variables for theme tokens | Per `public/brand/footer-recipe.md` |
| Hosting | **Vercel** (Fluid Compute) | Ecosystem default — see `vercel:bootstrap` skill |
| Database | **None** | All persistent state owned by sibling apps |
| Auth | **None** | Public site; CTAs into Academy / FlashLearn use those apps' own auth |
| Email | **Mailgun** on `mg.witus.online` | Ecosystem domain |
| Analytics | **Vercel Analytics** | Drop-in, no PII |

## What this app owns vs. what it links to

```
            ┌─────────────────────────────────────┐
            │            RideWitUS                │
            │  (this app — podcast catalog,       │
            │   episode pages, RSS feed,          │
            │   notify-me form)                   │
            └────────────────┬────────────────────┘
                             │
       ┌────────────────┬────┴──────┬─────────────────┐
       ▼                ▼           ▼                 ▼
 CentOS Academy   Wanderlearn   FlashLearnAI     Mailgun
  (classes,       (360° ride    (spaced-rep      (transactional
   lessons,        tours)        decks)           email)
   quizzes)
```

**Owned by RideWitUS:** the canonical episode list, podcast feed (planned), episode landing pages, the `/tune-in` page, the `/api/inbox-ingest` endpoint, the Mailgun client.

**Linked into siblings:**
- Each episode page has CTAs to its companion class (CentOS Academy lesson), flashcard deck (FlashLearnAI set), and ride route tour (Wanderlearn) when applicable.
- The `/tune-in` ecosystem-siblings card grid links into Academy, FlashLearn, Wanderlearn, CentOS Travel, witus.online, and AwesomeWebStore.

**Phase 4 integration (deferred):** signed-HMAC forward from `/api/inbox-ingest` to [witus-inbox](https://github.com/dapperAuteur/witus-inbox) so submissions also land in the cross-product triage queue. Pattern matches `claude/witus-inbox/examples/sender.ts`.

---

## Data flow

### Curriculum (read-only, static)

The 32-episode curriculum is a TypeScript constant in [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts). At build time, Next.js calls `generateStaticParams()` for `/episodes/[slug]` and `/seasons/[n]`, prerendering every page. Updating the curriculum = editing `episodes.ts` and redeploying.

```
lib/curriculum/episodes.ts (32 episodes)
                │
                ├── /episodes (catalog page)
                ├── /episodes/[slug] (32 SSG detail pages)
                ├── /seasons/[n] (4 SSG season pages)
                ├── / (recent-6 list)
                └── /tune-in (latest + NotifyMeForm episode list)
```

### Forms (write, server)

```
User                       Next.js                          Mailgun
 │                           │                                │
 │ POST /api/inbox-ingest    │                                │
 ├──────────────────────────►│                                │
 │ {form_type, ...}          │                                │
 │                           │ readPayload (JSON or form)     │
 │                           │ route by form_type             │
 │                           │ build emails (subscriber + BAM)│
 │                           ├───────────────────────────────►│
 │                           │ POST /v3/{domain}/messages × N │
 │                           │◄───────────────────────────────┤
 │                           │ { id }                         │
 │ { ok, mail: {count} }     │                                │
 │◄──────────────────────────┤                                │
```

Three form types currently:
- `class_notify_signup` — granular notify-me (per-season + per-episode selections); sends submitter confirmation + BAM alert.
- `host_listen_party` — community space wants to host a listen party; sends submitter confirmation (if email extractable from contact field) + BAM alert.
- `general_contact` — generic; not yet exposed in UI.

When `MAILGUN_API_KEY` is unset, `sendMail()` returns `{ ok: true, stubbed: true }` and logs the would-be message to stdout. Form UX continues without provisioning.

---

## Routing map

```
/                               canonical landing (Monon Chalk)
/about                          about
/tune-in                        notify-me + ecosystem siblings + host listen-party
/episodes                       catalog (anchors: #season-1..4)
/episodes/[slug]                32 prerendered episode pages
/seasons/[n]                    4 prerendered season pages
/api/inbox-ingest               POST endpoint (dynamic)
/manifest.webmanifest           PWA manifest

# Archive — not linked from main nav, robots:noindex,nofollow
/styleguide                     index of two non-chosen design directions
/styleguide/workshop-apron      frozen prototype
/styleguide/workshop-apron/episodes
/styleguide/workshop-apron/episodes/[slug]
/styleguide/folder-and-frame    frozen prototype
/styleguide/folder-and-frame/episodes
/styleguide/folder-and-frame/episodes/[slug]
```

---

## Theming

The body element carries `data-design="monon-chalk"`, which in [`globals.css`](./app/globals.css) sets the Monon Chalk CSS variables (`--font-display`, `--font-sans`, `--font-mono`) and the page background + halftone pattern. Inherited by every descendant element.

Each non-chosen prototype's layout wraps its subtree in its own `<div data-design="workshop-apron">` (or `folder-and-frame`) which redeclares the same vars with that prototype's values. CSS variables inherit from the nearest ancestor with a declaration, so prototype subtrees override the parent body's vars within their own scope.

To re-theme the canonical site, change the `data-design` attribute on `<body>` in `app/layout.tsx` and update the chosen direction's selector in `globals.css`. Or add a new `[data-design="..."]` block.

---

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MAILGUN_API_KEY` | Production | — | Without it, sends are stubbed to stdout |
| `MAILGUN_DOMAIN` | No | `mg.witus.online` | Ecosystem canonical |
| `MAILGUN_REGION` | No | `us` | Or `eu` |
| `MAILGUN_FROM` | No | `RideWitUS <noreply@${MAILGUN_DOMAIN}>` | |
| `BAM_NOTIFY_EMAIL` | No | `bam@awews.com` | Where form-submission alerts land |
| `INBOX_INGEST_URL` | Production | — | WitUS Inbox HMAC ingest endpoint |
| `INBOX_INGEST_SECRET` | Production | — | HMAC-SHA256 signing key for Inbox |
| `INBOX_SOURCE_SLUG` | Production | — | This app's source identity (e.g., `ridewitus`) |
| `OUTBOX_INGEST_URL` | Production | — | WitUS Outbox HMAC ingest endpoint |
| `OUTBOX_INGEST_SECRET` | Production | — | HMAC-SHA256 signing key for general posts |
| `OUTBOX_SOURCE_SLUG` | Production | — | Source identity for generic Outbox posts |
| `OUTBOX_PODCAST_RWU_SECRET` | Production | — | Separate secret for podcast publish channel (so it can be rotated independently) |
| `OUTBOX_PODCAST_RWU_SLUG` | Production | — | Source identity for podcast Outbox posts |

Per ecosystem convention, provision via `vercel env add` rather than committing `.env*` files. `.env*` is in `.gitignore`.

---

## Build + deploy

- `npm run build` produces a static-first build with one dynamic route (`/api/inbox-ingest`).
- All 38+ public pages are statically prerendered via `generateStaticParams()`.
- Deploy via Vercel (the ecosystem default). The branch policy in [CONTRIBUTING.md](./CONTRIBUTING.md) requires BAM to merge to `main` via the GitHub UI; Vercel auto-deploys main → production and branches → preview.

---

## Related

- [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts) — the canonical 32-episode source of truth
- [`public/brand/README.md`](./public/brand/README.md) — ecosystem brand spec
- [`public/brand/footer-recipe.md`](./public/brand/footer-recipe.md) — shared footer pattern
- [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) — code + copy + visual conventions
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow + branch hygiene
- BVC pattern reference: [`gemini/centenarian-os/lib/bvc/commodities.ts`](https://github.com/dapperAuteur/centenarianos)
