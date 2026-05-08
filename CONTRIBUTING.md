# Contributing to RideWitUS

> Branch hygiene is enforced across the WitUS ecosystem. The full rule with rationale lives in `gemini/witus/CLAUDE.md`; this file is the repo-local condensed version.

## Dev setup

```sh
git clone https://github.com/dapperAuteur/ride-wit-us
cd ride-wit-us
npm install
npm run dev
```

Without secrets, form submissions log to stdout instead of sending email. Provision Mailgun and other env vars via `vercel env add` (see [ARCHITECTURE.md](./ARCHITECTURE.md#environment-variables)). Never commit `.env*` files — they're gitignored.

## Branch hygiene (the enforced rule)

**Half 1 — Branch → commit → push → stop.** Never `git checkout main && git merge`. Never `git push --force` to a shared branch. After pushing, hand back the branch name and stop.

- Before any `git commit`, run `git branch --show-current`. If it's `main`, branch first (`feat/…`, `fix/…`, `chore/…`, `docs/…`).
- Re-check the current branch **before every commit**, not just at branch creation. Mid-session, BAM may merge a previous push via the GitHub UI and the local checkout silently fast-forwards to `main` — committing again without re-checking can land changes directly on `main`.

**Half 2 — BAM merges.** Pushed branches are reviewed and merged into `main` via the GitHub UI by BAM, between sessions by default.

**Half 3 — Keep branches small.** When a session produces multiple branches, consolidate them into one `bundle/<slug>-YYYY-MM-DD` branch before handoff:

1. Branch off `main`.
2. `git merge --no-ff` each small branch in turn (preserves per-concern history — non-negotiable, no squash).
3. Resolve any 3-way conflicts during bundling.
4. Run a final `npm run build` against the bundle.
5. Push the bundle.
6. File **one** user-task at `./plans/user-tasks/NN-merge-bundle-<slug>.md` for BAM to merge bundle → main.

The small branches stay on the remote for drill-down history; BAM does one merge, not N.

## Commit messages

Pattern: `type: short summary` then a body explaining the why.

Types in use: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`. The body should explain motivation and context, not just the diff. Past examples in `git log --oneline`.

Always co-author the commit when AI-assisted:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Pull requests

- Created manually via the GitHub UI by BAM, who reviews and merges.
- Title mirrors the commit summary.
- Body summarizes the why and the verification done locally.
- The branch is the source of review, not the diff against `main`.

## Where things go

| Where | What |
|---|---|
| `app/` | Next.js App Router routes (canonical at root, archive under `app/styleguide/`) |
| `components/` | Shared React components |
| `lib/` | Pure modules — episode data, Mailgun client, products list, utils |
| `types/` | Type declarations |
| `public/brand/` | Ecosystem brand variants — copied from `gemini/witus/public/brand/`. Do not edit in place. |
| `plans/` | **Local-only working notes** (gitignored). |
| `plans/user-tasks/` | Things BAM does outside the editor (signups, env vars, podcast directory submissions). See `CLAUDE.md` for the operator-task rule. |
| `plans/curriculum/` | Episode scripts (markdown), one file per episode. |
| `plans/design/` | Design direction notes + decision logs. |

## Operator-task rule

Anytime a change requires BAM to do something outside the editor — sign up for an account, generate an API key, configure DNS, rotate an env var, submit to a podcast directory, review/merge a PR — create a `./plans/user-tasks/NN-<slug>.md` file documenting it. The file is local-only (gitignored), but BAM reads it at session start. Required sections:

1. **Scope tag** at top — `[ecosystem]`, `[deploy]`, `[env]`, `[vendor]`, etc.
2. **What + why** — one-sentence summary plus *what this blocks* and any deadline.
3. **Steps** — the concrete actions BAM performs in the external tool.
4. **What Claude will use** — env vars, URLs, file paths Claude expects to read once BAM is done.
5. **How to mark done** — usually "delete this file" or "move to completed/".
6. **Related** — links to the source plan(s) and any sibling tasks.

Update `./plans/user-tasks/00-descriptions.md` index with columns `# | Title | Scope | Blocks | Status`. The **Blocks** column is the one BAM scans to triage — every row must name what downstream work the task unblocks.

## Plans dir

`./plans/` is gitignored. It holds:

- `curriculum-app-plan.md` — the canonical implementation plan
- `curriculum/` — episode scripts (one `.md` per episode, keyed by `Sxx-Eyy-<slug>.md`)
- `design/` — direction notes + `CHOSEN.md` decision log
- `user-tasks/` — BAM-action queue (see above)
- `freewheelin-jobs/` — research files for the FreeWheelin curriculum

Working notes that aren't plans (debugging logs, scratch) belong in your shell history or a sibling private repo, not here.

## Style

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for code + copy + visual conventions.

## Type errors and lint

`next.config.mjs` currently sets `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` for ESLint — inherited from the activity-tracker scaffold. Type errors should still be fixed when introduced; this flag is a safety net for Vercel deploys, not a license to commit broken code.

## Code of conduct

By contributing, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Vulnerability reporting is documented in [SECURITY.md](./SECURITY.md).
