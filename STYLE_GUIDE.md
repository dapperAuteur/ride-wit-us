# Style Guide

## TypeScript

- **Strict mode on.** Don't widen types to `any` to silence errors.
- **Default to `interface`** for object shapes; `type` for unions, function signatures, and aliases.
- **Async/await** over raw promises in new code.
- **No barrel files** unless an existing pattern justifies one. Import from concrete paths.
- **Path alias:** `@/*` points to repo root (per `tsconfig.json`).

## React / Next.js

- **Server Components by default.** Add `"use client"` only when a component needs `useState`, `useEffect`, browser APIs, event handlers, or refs. The smaller the Client Component, the better.
- Components live in `components/` (shared) or colocated under their route in `app/`.
- **Naming:**
  - Files: `kebab-case.tsx` (e.g., `notify-me-form.tsx`).
  - Components: `PascalCase`.
  - Hooks: `useThing` (camelCase, lowercase first letter).
  - Constants: `SCREAMING_SNAKE_CASE` for top-level, `camelCase` for local.
- **Props:** explicit `interface` for component props; required props don't need `?`.
- **Async pages:** Next 15 made `params` a Promise. `async function Page({ params }: { params: Promise<{ slug: string }> })`. Always `await params`.
- **`generateStaticParams`** for any route with `[slug]` or `[n]` if the set is fully known at build time (it almost always is for this app).
- **Metadata:** export `metadata` from each page. For dynamic pages, export `generateMetadata`.

## Styling

### Tailwind

- Use Tailwind utility classes for layout, spacing, color. The repo runs Tailwind 3.
- Reach for arbitrary values (`text-[#221E1B]`, `bg-[#fff8e8]`) when matching the Monon Chalk hexes — prefer the named tokens in `tailwind.config.ts` (`apron-green`, `chalk-paper`, etc.) when available.
- The `cn()` helper at `@/lib/utils` is the standard way to compose conditional classes.
- Don't inline complex CSS in `style={{}}` unless the value is dynamic (rotation degrees, dynamic shadow color). Static styling goes through Tailwind.

### Theme tokens (Monon Chalk — canonical)

| Token | Hex | Usage |
|---|---|---|
| `chalk-paper` | `#F4ECD8` | Page background |
| `chalk-ink` | `#221E1B` | Body text, frame borders, drop-shadow color |
| `chalk-sun` | `#F4B44A` | Primary accent (stickers, highlights) |
| `chalk-ride` | `#D33E2D` | Display headlines, hover state, accent in 3-line stacked H1s |
| `chalk-sky` | `#5C8AA5` | Info / community accent |
| `chalk-grass` | `#3E7C3A` | Confirmation / success accent |

The two non-chosen prototypes have their own palettes scoped under `[data-design="workshop-apron"]` and `[data-design="folder-and-frame"]` in `globals.css` — do not pollute those.

### Type stack

- **Display:** `Recoleta` (Google Fonts loader pending; CSS fallback to Source Serif Pro → Georgia).
- **Body:** `Inter`.
- **Mono:** `IBM Plex Mono` — used sparingly for episode codes (`S1·E02`), section eyebrows, and form labels.

Use the Tailwind `font-display` / `font-sans` / `font-mono` utility classes; they read from `--font-*` CSS variables defined per `data-design` scope.

### Motifs (Monon Chalk)

- **"Sticker" elements** — `class="sticker"` (defined in `globals.css`): thick ink border, hard offset shadow, slight rotation. Combine with `style={{ transform: "rotate(-1deg)" }}` for varied tilt.
- **Section dividers** — `border-t-4 border-dashed border-[#221E1B]`.
- **Card pattern** — `border-2 border-[#221E1B] bg-[#fff8e8] p-N` with `style={{ boxShadow: "4px 4px 0 <accent>" }}` for tactile feel.
- **Display headlines** — three lines stacked, with the middle line in `chalk-ride` for color contrast.
- **Halftone background** — applied to `body` via `globals.css`. Don't reapply per-page.

### Accessibility

- All interactive elements need a **focus-visible outline** — convention is `focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]` (or the relevant theme accent).
- All `<a target="_blank">` need `rel="noopener noreferrer"` and a `<span className="sr-only"> (opens in new tab)</span>` if the visible text doesn't already cue it.
- Form `<label>` wraps `<input>` + a visible label `<span>` (no `for`/`id` separation needed for that pattern).
- Skip-to-content link in `app/layout.tsx` — keep it.

## Copy style

- **Sentence case** for headings, not Title Case.
- **Em dashes** are fine — used sparingly, with spaces around them.
- **Brand-name caps** stay as the brand: `RideWitUS`, `WitUS`, `CentenarianOS`, `FlashLearnAI`. Don't lowercase or hyphenate.
- **Avoid hype words.** "Revolutionary," "game-changing," "powerful" — cut.
- **Show, don't claim.** Instead of "best curriculum," describe what's in it.
- **No exclamation points** in body copy. They're allowed in stickers if they earn it (almost never).
- **Curriculum-specific terms:** "Apron Foundations / Apron Advanced / Bike Design / Program Operations" capitalize as the season titles do; "single-speed cruiser," "Brompton," "FreeWheelin'" (with apostrophe) for the org name.

## Images and assets

- **Brand assets** live in `public/brand/<variant>/`. Copied from `gemini/witus/public/brand/`. Don't edit in place — re-copy from canonical.
- **Episode artwork** (planned, not yet shipped) will live in shared Cloudinary under `ridewitus/<season>/<episode>/` per `gemini/wanderlearn/wanderlearn-app/docs/CLOUDINARY_FOLDER_CONVENTION.md`.
- **Inline SVG** is fine for small decorative diagrams (see the Brompton sketch in `app/styleguide/workshop-apron/page.tsx`). Add `aria-hidden="true"` if the SVG is purely decorative.

## Comments

- **Default to no comments.** Names and types do most of the explaining.
- Add a comment when the *why* is non-obvious — a constraint, a workaround, a partnership rule (e.g., "Rise Wellness disclaimer is byte-identical").
- Don't comment what the code already says.

## File-level conventions

- Every page or component starts with imports, then top-level `const`s and types, then the default export.
- Group imports: framework (`next`, `react`) → app modules (`@/lib`, `@/components`) → relative imports.
- Single default export per page; named exports for shared components/utilities.

## Git

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch hygiene, commit messages, and the bundle pattern.
