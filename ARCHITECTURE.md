# Architecture

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Ecosystem default; static-first with on-demand dynamic API routes |
| Language | **TypeScript** | Strict mode; no codegen |
| Styling | **Tailwind CSS 3** + CSS variables for theme tokens | Per `public/brand/footer-recipe.md` |
| Hosting | **Vercel** (Fluid Compute) | Ecosystem default — see `vercel:bootstrap` skill |
| Database | **None** | All persistent state owned by sibling apps — including for signed-in people |
| Auth | **WitUS SSO only** | OIDC code flow against `accounts.witus.online`; session is a signed cookie, no user table. Dark until provisioned — see § Authentication |
| Email | **Mailgun** on `mg.witus.online` | Ecosystem domain |
| Analytics | **Vercel Analytics** | Drop-in, no PII |
| Error monitoring | **Better Stack** via `@sentry/nextjs` | Sentry-protocol ingest; inert without a DSN, and every event is scrubbed by `lib/sentry-scrub.ts` |
| Tests | **Vitest** | Ecosystem default; `npm test` |

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
/api/health                     GET + HEAD uptime probe (dynamic, no-store)
/api/inbox-ingest               POST endpoint (dynamic)
/api/outbox/publish             POST endpoint (dynamic)
/manifest.webmanifest           PWA manifest

# Authentication — see § Authentication. All dynamic, all noindex.
/signin                         the only door in ("Sign in with WitUS" / "Continue as <name>")
/signed-in                      protected; proves the loop end to end. NOT a profile page.
/api/auth/witus/authorize       GET  starts the OIDC code flow (state + PKCE)
/api/auth/witus/callback        GET  finishes it and mints the session cookie
/api/auth/signout               POST destroys the local session (303 to /, or 200 JSON)

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
| `EMAIL_FROM` | No | `RideWitUS <noreply@${MAILGUN_DOMAIN}>` | From: header on outgoing mail |
| `BAM_NOTIFY_EMAIL` | No | `bam@awews.com` | Where form-submission alerts land |
| `INBOX_INGEST_URL` | Production | — | WitUS Inbox HMAC ingest endpoint |
| `INBOX_INGEST_SECRET` | Production | — | HMAC-SHA256 signing key for Inbox |
| `INBOX_SOURCE_SLUG` | Production | — | This app's source identity (e.g., `ridewitus`) |
| `OUTBOX_INGEST_URL` | Production | — | WitUS Outbox HMAC ingest endpoint |
| `OUTBOX_INGEST_SECRET` | Production | — | HMAC-SHA256 signing key for general posts |
| `OUTBOX_SOURCE_SLUG` | Production | — | Source identity for generic Outbox posts |
| `OUTBOX_PODCAST_RWU_SECRET` | Production | — | Separate secret for podcast publish channel (so it can be rotated independently) |
| `OUTBOX_PODCAST_RWU_SLUG` | Production | — | Source identity for podcast Outbox posts |
| `WITUS_OIDC_CLIENT_ID` | For sign-in | — | `witus-ride`, fixed by the IdP registry. All three of these must be set together or sign-in stays dark |
| `WITUS_OIDC_CLIENT_SECRET` | For sign-in | — | Issued on the IdP as `WITUS_OIDC_SECRET__RIDE` |
| `WITUS_SESSION_SECRET` | For sign-in | — | HMAC key for this app's session cookie. Not shared with any other app; rotating it signs everyone out |
| `WITUS_OIDC_ISSUER` | No | `https://accounts.witus.online/api/idp` | One value; all four OIDC endpoints and the session-probe origin derive from it |
| `NEXT_PUBLIC_SITE_URL` | No | request host | Canonical origin for the `redirect_uri` and `post_logout_redirect_uri`. Both derive from the same value so they cannot disagree |
| `SENTRY_DSN` | No | — | Better Stack ingest DSN for server + edge errors. Unset ⇒ the SDK never initializes |
| `NEXT_PUBLIC_SENTRY_DSN` | No | — | Same source, browser side. Inlined at build time |
| `SENTRY_ENVIRONMENT` | No | `VERCEL_ENV` → `NODE_ENV` | Label on every event |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | No | `NODE_ENV` | Browser-side equivalent |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | No | — | Build-time source-map upload only. Absent ⇒ upload is skipped and stack traces stay minified |

Per ecosystem convention, provision via `vercel env add` rather than committing `.env*` files. `.env*` is in `.gitignore`.

---

## Authentication

RideWitUS shipped with no authentication of any kind — no login, no session, no database. This
subsystem was added on 2026-09-02 ahead of the CentenarianOS travel module moving into this app,
which will need accounts.

**"Sign in with WitUS" is the only way in.** There is no password, no magic link, and no local user
table. Nothing about a person is stored anywhere by this app; there is still no database.

```
Visitor            RideWitUS                          accounts.witus.online
   │                   │                                       │
   │ GET /signin       │                                       │
   ├──────────────────►│  renders immediately                  │
   │                   │                                       │
   │  ...in parallel, from the BROWSER (CORS, credentials:include)
   ├───────────────────────────────────────────────────────────► /api/ecosystem/session
   │◄──────────────────────────────────────────────────────────┤ {signedIn, user:{name}}
   │  button relabels to "Continue as <name>", or nothing happens
   │                   │                                       │
   │ click             │                                       │
   ├──────────────────►│ /api/auth/witus/authorize             │
   │                   │  state + PKCE → httpOnly cookies      │
   │◄──────────────────┤  302 ──────────────────────────────►  │ /oauth2/authorize
   │                   │                                       │
   │◄──────────────────────────────────────────────────────────┤ 302 back with ?code&state
   ├──────────────────►│ /api/auth/witus/callback              │
   │                   │  verify state, POST code + verifier ─►│ /oauth2/token
   │                   │  GET claims with the access token ───►│ /oauth2/userinfo
   │                   │  sign rwu_session cookie, discard tokens
   │◄──────────────────┤  302 /signed-in                       │
```

### The session is a cookie and nothing else

[`lib/auth/session.ts`](./lib/auth/session.ts) mints a compact HS256 JWT over `{sub, email, name?,
iat, exp}` and [`lib/auth/dal.ts`](./lib/auth/dal.ts) puts it in `rwu_session` — `httpOnly`,
`Secure` in production, `SameSite=Lax`, `Path=/`, 7 days. Verification is an HMAC check and an
expiry check; there is no lookup. Signing out is deleting the cookie.

The signature is done with `node:crypto`, not `jose`: the token is symmetric, minted and verified by
this same process, and never leaves it, so the standard library covers it and the dependency list
stays short. The JWT *shape* is kept because it is inspectable when something is wrong.

`lib/auth/dal.ts` is the only module that reads or writes the cookie. Server code asks
`getCurrentUser()`, `requireUser()` (pages — redirects to `/signin`), or `requireApiUser()` (route
handlers — returns a 401 `NextResponse` to return as-is).

**Claims come from `userinfo`, not the `id_token`.** Verifying an RS256 id_token client-side would
mean a JWKS fetch, a cache, and a key-rotation failure mode, to learn exactly what one
authenticated back-channel request returns. The IdP's tokens are used once in the callback and
discarded.

**There is no allow-list.** Anyone with a WitUS account can sign in. That is intended for a public
curriculum site: a session grants access to `/signed-in` and nothing else today. When the travel
module lands and there is something worth authorizing, that gate belongs on the resource.

### Configuration is all-or-nothing, and dark by default

`witusSsoConfigured()` ([`lib/witus-sso-config.ts`](./lib/witus-sso-config.ts)) requires
`WITUS_OIDC_CLIENT_ID` **and** `WITUS_OIDC_CLIENT_SECRET` **and** `WITUS_SESSION_SECRET`. Missing any
one of them: `/signin` renders no button, the probe never fires, and **no request is made to
accounts.witus.online at all**. An affordance the visitor cannot complete is worse than none.

Nothing throws at module scope — every public page here is statically prerendered and must keep
building on an unprovisioned deploy, exactly as it does with no Mailgun key and no Sentry DSN.
`/api/health` reports `config.witus_sso` as a boolean so a deploy can be verified without reading
any value back.

Every IdP URL derives from one `WITUS_OIDC_ISSUER` (default `https://accounts.witus.online/api/idp`),
so a staging IdP moves all five at once and this repo never asserts a second guessable
accounts.witus.online path.

### Two ecosystem features

**"Continue as ⟨name⟩"** — the sign-in page renders as it always would, and in parallel the browser
asks the IdP's `/api/ecosystem/session` who this is (4s abort, `credentials: "include"`). An answer
relabels the button. A failure, timeout, CORS refusal, or blocked third-party cookie changes
nothing and says nothing — which is the *common* case, since the IdP's cookie is third-party here
and Safari ITP / Firefox TCP answer nothing. **The name is display copy, never a credential**: it
crossed an origin boundary, so it is client-supplied by definition, and clicking the button runs the
real code flow regardless. A one-shot loop guard (a `sessionStorage` marker written *before*
leaving, plus a `?sso=tried` query param for browsers with no storage) stops a stale IdP session
producing probe → click → failure → probe forever.

**Global sign-out** — signing out here ends the shared IdP session, so it signs you out of every
WitUS app (BAM, 2026-08-30). **The order is the safety property:** the local session is destroyed
and awaited first, then the browser is handed to
`<issuer>/oauth2/endsession?client_id=…&post_logout_redirect_uri=…`. If the IdP is unreachable or
refuses, the person is still signed out here. `client_id` is required — better-auth rejects a
`post_logout_redirect_uri` with `invalid_request` without it or a verifiable `id_token_hint`, and
this app holds no id_token client-side. The redirect URI must be **exactly**
`https://ride.witus.online/`, trailing slash included, because better-auth exact-matches it against
the client's registered `redirectUrls`.

### The IdP registry has to match

Redirect URIs are compared with `===`; a mismatch is a 400 at the IdP, not a fallback. This app is
registered in [`gemini/witus/lib/identity/clients.ts`](https://github.com/dapperAuteur/witus) as
slug `ride`, client_id `witus-ride`, origin `https://ride.witus.online`. As of 2026-09-02 that entry
still carries Better Auth's default callback path behind a "confirm RideWitUS's auth lib" TODO. It
must become:

```
{ slug: "ride", name: "RideWitUS", origin: "https://ride.witus.online",
  callbackPath: "/api/auth/witus/callback" }
```

registering `https://ride.witus.online/api/auth/witus/callback` exactly. The post-logout URI
(`https://ride.witus.online/`) and the probe's CORS allow-origin both already derive correctly from
that entry and need no change. Tracked in `plans/user-tasks/05-witus-sso-env-and-registry.md`.

### `NEXT_PUBLIC_SITE_URL`, and why not `SITE_URL`

The `redirect_uri` and `post_logout_redirect_uri` are built from the **same** origin expression, so
they cannot disagree on a host where one would 400. That origin is `NEXT_PUBLIC_SITE_URL` when set,
otherwise the request's own host — correct on `ride.witus.online`, and deliberately unregistered
(so sign-in fails closed) on a preview deployment.

It is **not** `lib/site-meta.ts`'s `SITE_URL`, which says `https://ridewitus.witus.online` — a host
that does not resolve (verified 2026-09-02: DNS returns nothing, while `https://ride.witus.online`
serves the site 200). That is a pre-existing bug affecting `metadataBase` and the OG tags, and it is
a separate branch's job.

---

## Error monitoring

Errors are reported to **Better Stack**, which ingests over the Sentry protocol, so the client is the standard `@sentry/nextjs` SDK pointed at a Better Stack DSN. Nothing about the wiring is vendor-specific: swapping the DSN swaps the destination.

- **Inert by default.** [`sentry.server.config.ts`](./sentry.server.config.ts), [`sentry.edge.config.ts`](./sentry.edge.config.ts), and [`instrumentation-client.ts`](./instrumentation-client.ts) each guard `Sentry.init()` behind a DSN check. With no DSN set, no SDK is initialized and no request leaves the process, so local dev and previews are unaffected until BAM provisions the source.
- **Errors only.** `tracesSampleRate: 0`, both replay rates `0`, `sendDefaultPii: false`. Session replay in particular is off on purpose: it would record the `/tune-in` form as it is typed.
- **Everything is scrubbed before transmission.** [`lib/sentry-scrub.ts`](./lib/sentry-scrub.ts) is the `beforeSend` hook on every runtime. It deletes the request body outright (the three `/api/inbox-ingest` form types are all contact details plus a neighborhood), drops cookies and credential headers including `X-Witus-Signature`, strips user identity, and redacts emails, JWTs, HMACs, labelled secrets, token-bearing URLs, street addresses, and lat/lng pairs from messages, exception values, extra, tags, and breadcrumbs. It is covered by [`lib/sentry-scrub.test.ts`](./lib/sentry-scrub.test.ts) (`npm test`).
- **No Content-Security-Policy** ships from this app today, so no `connect-src` allowance is needed. If one is added later it must include the DSN origin or browser-side reports will fail silently. Re-confirmed 2026-08-23 by an ecosystem-wide audit: there is no CSP in `next.config.mjs`, no `middleware.ts`, no `vercel.json` header, and no `<meta http-equiv>` in the root layout.
- **The root layout has its own boundary.** [`app/global-error.tsx`](./app/global-error.tsx) catches a crash in the root layout itself, which `error.tsx` cannot catch because the layout is the thing that broke. It renders its own `<html>`/`<body>` with inline styles and imports nothing but the Sentry SDK, so a broken component or an unloaded stylesheet cannot take the error page down with it.

---

## Uptime monitoring

`/api/health` ([`app/api/health/route.ts`](./app/api/health/route.ts)) is the target for external uptime
monitors. It is a **liveness probe**, not a delivery check.

- **Why not `/`.** Every public page is statically prerendered, so `/` can answer `200` from the CDN
  while the deployment behind it is broken. `/api/health` is `force-dynamic` with `revalidate = 0` and
  `Cache-Control: no-store`, so a `200` means a route handler really ran on this deploy.
- **What it checks.** That the handler executed and that `EPISODES` loaded non-empty. With no database
  and no auth, the bundled curriculum module is this app's only hard runtime dependency.
- **What it deliberately does not check.** Mailgun, the WitUS Inbox, and the Outbox are never called
  from the probe. Their configuration is reported as three presence booleans (`!!` of the env var,
  never the value). Calling them would let a third-party outage turn this site's monitor red while the
  site served normally, and would put an outbound request on every monitor tick.
- **Failure shape.** `503 { ok: false, error: "<fixed token>" }`. The `catch` takes no binding and logs
  a constant string, so an exception message can never reach the response or an error report.
- Covered by [`app/api/health/route.test.ts`](./app/api/health/route.test.ts), which asserts that a set
  env value cannot appear in the serialized body.

---

## Build + deploy

- `npm run build` produces a static-first build with eight dynamic routes: `/api/health`, `/api/inbox-ingest`, `/api/outbox/publish`, and the five authentication routes (`/signin`, `/signed-in`, `/api/auth/witus/authorize`, `/api/auth/witus/callback`, `/api/auth/signout`).
- All 38+ public pages are statically prerendered via `generateStaticParams()`.
- Deploy via Vercel (the ecosystem default). The branch policy in [CONTRIBUTING.md](./CONTRIBUTING.md) requires BAM to merge to `main` via the GitHub UI; Vercel auto-deploys main → production and branches → preview.

---

## Related

- [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts) — the canonical 32-episode source of truth
- [`public/brand/README.md`](./public/brand/README.md) — ecosystem brand spec
- [`public/brand/footer-recipe.md`](./public/brand/footer-recipe.md) — shared footer pattern
- [`lib/witus-sso.ts`](./lib/witus-sso.ts) — the SSO helpers, with the reasoning in comments
- [`STYLE_GUIDE.md`](./STYLE_GUIDE.md) — code + copy + visual conventions
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow + branch hygiene
- BVC pattern reference: [`gemini/centenarian-os/lib/bvc/commodities.ts`](https://github.com/dapperAuteur/centenarianos)
