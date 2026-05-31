## ⚠️ Ecosystem repo identity (don't confuse these)

The site **brandanthonymcdonald.com** (BAM's personal portfolio) lives in `/Users/bam/Code_NOiCloud/ai-builds/claude/bam-landing-page/`, **NOT** `bam-portfolio`. A stray directory at `/Users/bam/Code_NOiCloud/projects/bam-portfolio/` exists from a prior misplaced `Write` call; it is not a real repo. When asked to work on the brandanthonymcdonald.com codebase, target `bam-landing-page`.

This repo (`ride-wit-us`) is **RideWitUS** — the podcast curriculum surface of the WitUS ecosystem. Its companion brand site is `gemini/witus` (the static `witus.online` umbrella). They are different repos for different concerns:

- **`gemini/witus`** = `witus.online`, the umbrella brand site (no DB, no auth, marketing-only).
- **`gemini/ride-wit-us`** = RideWitUS, the podcast app + thin coordination surface for the FreeWheelin / Brompton bike-mechanic curriculum. Curriculum + lessons live natively in CentOS Academy and Wanderlearn — this app does **not** rebuild them.

The dir was previously an activity tracker (walking/running/biking/driving). All of that was deleted on `feat/curriculum-podcast`. Do not resurrect Stripe, Prisma, JWT auth, or the dashboard — every feature already exists elsewhere in the ecosystem (rides → CentOS travel; auth → Supabase; payments → ecosystem path).

---

## Operator-task rule: capture user actions in `./plans/user-tasks/`

When Claude proposes work that needs BAM to do something outside the editor (account signup, API key, DNS change, vendor dashboard, env-var rotation, secret generation, PR review/merge, podcast directory submission, etc.), Claude MUST create a `./plans/user-tasks/NN-slug.md` file in this repo. **No exceptions for "small" steps.**

Required sections per task file: **Scope tag** · **What + why** (with explicit *what this blocks* detail and any hard deadline) · **Steps** · **What Claude will use** · **How to mark done** · **Related**.

Update `./plans/user-tasks/00-descriptions.md` index with columns `# | Title | Scope | Blocks | Status`. The `Blocks` column is non-negotiable — it's the column BAM scans to triage.

Full rule with rationale: `/Users/bam/Code_NOiCloud/ai-builds/gemini/witus/CLAUDE.md` §"Operator-task rule".

**Ecosystem-wide tasks** (Keap, IRL events, weekly retros, cross-product decisions) live in the canonical witus queue at `gemini/witus/plans/user-tasks/`. **Repo-local tasks** (RideWitUS deploy, Cloudinary folder setup, Apple/Spotify podcast submissions, FreeWheelin partner outreach, env vars) live here. Read the witus queue at session start before starting dependent work.

---

## Citation rule — APA 7 in-line + References

All curriculum content (course materials, episode outlines, teacher packets), professional writing (white papers, partnership briefs, partner-facing decks), and business writing (proposals, grant applications, sponsor pitches) in this repo uses **APA 7 in-line citations** with a `## References` section at the end of each document.

In-line: `(Author, Year)` for paraphrases; `(Author, Year, p. X)` for direct quotes; narrative `Author (Year)` when the author is the sentence subject. Organization-as-author: first reference `(Centers for Disease Control and Prevention [CDC], 2024)`, subsequent `(CDC, 2024)`. Undated source: `(Author, n.d.)`.

For the RideWitUS S1+S2+S3+S4 packets specifically: each packet's `mechanics.md`, `engineering.md`, `pedagogy.md`, and `community.md` carries its own References section with only the sources cited in that file. `vocabulary.csv` source column may use the shortened parenthetical (e.g., `Park Tool, 2020`) with the full reference in the packet's `mechanics.md`.

**Out of scope** (no APA needed): code comments, ARCHITECTURE.md, README.md, plans/user-tasks files, plans/BACKLOG.md, conversation transcripts.

Full rule with rationale: `/Users/bam/Code_NOiCloud/ai-builds/gemini/witus/CLAUDE.md` §"Citation rule — APA 7 in-line + References".

---

## Branch hygiene — BAM merges, between sessions by default

**Half 1.** End-of-branch contract: branch → commit → push → stop. Claude does not run `git checkout main && git merge`. Never `--force` to shared branches. After push, hand back the branch name + summary and stop.

**Half 2.** BAM merges committed-and-pushed branches via the GitHub UI before the next session starts, unless explicitly told otherwise. **Mid-session, after a push, BAM may merge in a separate window and the local checkout silently fast-forwards to `main`.** Re-check `git branch --show-current` before EVERY commit, not just at branch creation, or you risk landing follow-up commits directly on `main`.

**Half 3.** Keep branches small. When a session produces multiple branches, consolidate into one `bundle/<slug>-YYYY-MM-DD` branch before handoff: merge with `git merge --no-ff` (preserves per-concern history), resolve any 3-way conflicts during bundling, run final `tsc + lint + build`, push, and file ONE user-task at `./plans/user-tasks/NN-merge-bundle-<slug>.md` for BAM to merge bundle → main.

Full rule with rationale: `/Users/bam/Code_NOiCloud/ai-builds/gemini/witus/CLAUDE.md` §"Branch-hygiene rule".

---

## What this app is (and isn't)

**Is:** podcast feed + episode landing pages + curriculum directory + ecosystem-fit landing. Source of truth for the 32-episode RideWitUS curriculum is [`lib/curriculum/episodes.ts`](./lib/curriculum/episodes.ts), mirroring the BVC pattern at [`gemini/centenarian-os/lib/bvc/commodities.ts`](../centenarian-os/lib/bvc/commodities.ts).

**Bike progression by season** (don't make any one bike the universal anchor — see auto-memory `feedback_audience_accessibility.md`):
- S1 Apron Foundations — single-speed cruiser. Simplest bike at the donation bay; no gears to introduce yet.
- S2 Apron Advanced — bikes with gears. Cassettes, freewheels, derailleurs, internal hubs.
- S3 Bike Design & Folding-Bike Engineering — Brompton enters as the engineering subject.
- S4 Program Operations — bike-agnostic.

**Isn't:** a class player, a flashcard tool, a ride tracker, a payment surface. Those are CentOS Academy / FlashLearnAI / CentOS Travel / the ecosystem payments path respectively. CTAs from each episode page route into them via stable URLs.

**Brand assets:** copied verbatim from [`gemini/witus/public/brand/`](../witus/public/brand/) into [`./public/brand/`](./public/brand/). Re-copy on the next significant brand update; do not edit them in place. Top-level surfaces use `04-orbit-type` per the safe-universal recommendation in [public/brand/README.md](./public/brand/README.md). The `/design/*` prototypes each use a different variant for at-a-glance distinction.

**Footer:** canonical recipe from [`./public/brand/footer-recipe.md`](./public/brand/footer-recipe.md). Rise Wellness disclaimer is **byte-identical** ecosystem-wide; the only swap targets are accent + surface tokens.

@AGENTS.md

---

## Plans convention

All implementation plans live in `./plans/` as markdown named `NN-description-of-plan.md` — two-digit numeric prefix, kebab-case slug, next available number, don't skip. Sub-queues: `./plans/user-tasks/NN-slug.md` (operator tasks), `./plans/bugs/`, `./plans/future/`. (`plans/` is typically gitignored — local working notes.) Full rule: `gemini/witus/CLAUDE.md` §"Plans convention".
