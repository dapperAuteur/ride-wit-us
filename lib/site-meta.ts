// The public origin of this site. `NEXT_PUBLIC_SITE_URL` when set (what the SSO config already reads,
// lib/witus-sso-config.ts); otherwise the host that serves the site. Until 2026-11-11 this constant
// named `ridewitus.witus.online`, a host with no DNS record, so every canonical URL, OG tag, Outbox
// post link and waitlist-confirmation link pointed at a dead address. Keep this in step with the
// IdP registry (`ride.witus.online` is the registered client host).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "")) || "https://ride.witus.online";
export const APP_NAME = "RideWitUS";
export const APP_TAGLINE = "A bike-shop curriculum, in podcast form. From the WitUS ecosystem.";
export const APP_DESCRIPTION =
  "RideWitUS is an audio-first bicycle-mechanic curriculum. Four seasons, 32 episodes — Apron Foundations on a single-speed cruiser, Apron Advanced once you've got gears, Bike Design & Folding-Bike Engineering on a Brompton, then Program Operations & Community. Classes live in CentOS Academy; routes live in Wanderlearn; vocabulary drills in FlashLearnAI.";
// The contact address shown in the footer, from the environment only. This repository is public, so
// no personal address lives in tracked code (same rule as witus-learn task 394). Unset means the
// footer shows no mail link; set `NEXT_PUBLIC_CONTACT_EMAIL` on Vercel to a role mailbox.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
