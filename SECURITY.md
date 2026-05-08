# Security policy

## Reporting a vulnerability

If you discover a security vulnerability in RideWitUS, please email **bam@awews.com** with:

1. A description of the issue and its potential impact.
2. Steps to reproduce.
3. The version, branch, or commit hash where you observed the issue.
4. Any proof-of-concept code or screenshots, if relevant.

**Do not** open a public GitHub issue for security vulnerabilities. The maintainer will respond within **5 business days** with a triage decision and timeline.

## Scope

In scope:

- This codebase (`ride-wit-us`).
- Form submissions to `/api/inbox-ingest`.
- The Mailgun integration as wired in [`lib/mailgun.ts`](./lib/mailgun.ts).
- Brand assets in `public/brand/` (these are copied from the canonical at `gemini/witus/public/brand/`; vulnerabilities there should also be reported to the witus repo maintainer).

Out of scope:

- Third-party services that this app links to (CentenarianOS, Wanderlearn, FlashLearnAI, AwesomeWebStore, witus.online, Mailgun itself). Report directly to those vendors.
- Issues that require attacker control of `mg.witus.online` DNS, BAM's email account, the Vercel deployment account, or other privileged infrastructure outside the application code.
- Vulnerabilities in dependencies — these should be reported to the dependency's maintainer. We pull standard ecosystem reports via Vercel's security dashboard.

## Supported versions

Only the current `main` branch is supported. Pre-`main` branches are work-in-progress and are not maintained for security patches.

| Branch | Status |
|---|---|
| `main` | Supported |
| Any other branch | Not supported |

## Disclosure timeline

- Day 0 — Report received at `bam@awews.com`.
- Day 1–5 — Triage; reporter receives an acknowledgement and rough severity assessment.
- Day 5–30 — Fix developed on a private branch. Reporter is updated weekly.
- Day 30+ — Fix merged to `main` and deployed. Reporter credited (with permission) in the commit message and any public advisory.
- After fix lands — Public advisory if the issue affected production users.

Critical vulnerabilities (active exploitation, data exposure) compress this timeline. Coordinated disclosure is preferred — please give the project a chance to fix before publishing.

## What's likely actually risky here

This app is intentionally minimal: no database, no authentication, no user accounts, no payment surface. The realistic attack surface is:

1. **`/api/inbox-ingest` payload abuse** — header / form-field injection into Mailgun emails, or use of the endpoint as a spam relay. Mitigations: payload validation (form-type taxonomy), Mailgun rate limits, no arbitrary-recipient field. If you find a way to coerce arbitrary `from` or `to` headers, that's in scope.
2. **Reflected content in form-confirmation emails** — the subscriber's name and the host-listen-party fields appear in BAM-alert emails as plain text. Email clients render plain-text safely, but if you find an HTML-injection path, that's in scope.
3. **Brand asset substitution** — if `public/brand/` is editable through some path traversal, that's in scope.
4. **Static-site cross-origin issues** — none expected, since there's no auth or session state. If you find a way to leak data via the `/api/inbox-ingest` response, that's in scope.

## Acknowledgements

Thanks to all responsible reporters. Public credits are added here once advisories are published.
