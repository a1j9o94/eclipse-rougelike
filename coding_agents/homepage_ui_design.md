# Homepage UI Redesign — Space Mobile Menu

Date: 2025-09-10

## Outcome
- Deliver a mobile‑first home screen that feels like a sleek space game menu. Remove the game title and the separate “Single Player/Multiplayer” headers; elevate a single primary action (Launch) with a sheet to configure Solo or Versus play. Move Battle Log into a polished modal accessible from the home screen.

## Player Experience Principles
- **Mobile‑first touch targets**: 44px min; large thumb‑friendly CTAs.
- **Minimal cognitive load**: one obvious path (Launch), everything else discoverable but secondary.
- **Diegetic space vibe**: starfield/nebula background, soft neon accents, glass panels.
- **Fast continue**: if a save exists, Continue is surfaced as a first‑class action.
- **Accessibility**: semantic landmarks, `role="dialog"` with focus trap, high‑contrast text.

## Information Architecture
- **Top Bar**: left `Settings` (⚙), center empty (no title), right `Battle Log` (📜) button.
- **Hero Area**: parallax starfield with a **Hangar Card** showing selected faction; swipe/chevrons to change faction.
- **Primary CTA**: centered `Launch` button; opens a **Launch Sheet**.
- **Secondary CTA**: `Continue` (if save found).
- **Bottom Dock**: 3–5 icons (Hangar, Tech, Versus, Rules). Versus is an entry to multiplayer when available.

## Launch Sheet (modal bottom sheet)
- **Tabs**: `Solo` | `Versus` (Versus disabled when no server; shows hint).
- **Solo Tab**: Difficulty chips (Easy/Medium/Hard) with ship counts; `Launch` starts `onNewRun(diff, faction)`.
- **Versus Tab**: `Find Match` (goes to multiplayer start) plus small copy about real‑time combat.
- **Faction Selector**: mirrors Hangar selection so players can adjust without leaving sheet.

## Battle Log (modal)
- Triggered by the top‑right 📜 button.
- Modal lists recent entries from `progress.log` newest first; empty state “No battles yet.”
- Future‑proof layout: optional metadata columns (time, faction, diff) when available.

## Visual System (Tailwind v4)
- **Background**: radial gradient `from-slate-950 via-indigo-950 to-black` with animated starfield (CSS only; no WebGL for now).
- **Panels**: glassmorphism cards `bg-white/5 backdrop-blur-md border border-white/10`.
- **Accents**: emerald (`emerald-400/500`) for Solo, blue (`sky-400/500`) for Versus.
- **Typography**: compact, all‑caps for CTAs; subdued body copy.

## Component Plan
- `StartScreen` (refactor of `StartPage.tsx`)
  - Props: `{ onNewRun(diff, faction), onContinue?, onMultiplayer? }` (unchanged)
  - State: `faction: FactionId`, `showLaunch: boolean`, `launchTab: 'solo'|'versus'`, `showLog: boolean`
  - Children: `TopBar`, `HangarCard`, `PrimaryCtas`, `BottomDock`, `LaunchSheet`, `BattleLogModal`

- `TopBar`
  - Left: Settings icon (noop for now)
  - Right: Battle Log button → toggles `showLog`

- `HangarCard`
  - Shows current faction name/desc and art placeholder; next/prev controls; calls `onChangeFaction(id)`

- `PrimaryCtas`
  - `Continue` (if save), then big `Launch` button

- `LaunchSheet`
  - Props: `{ open, onClose, tab, setTab, faction, onFactionChange, canMedium, canHard, shipCounts }`
  - Emits: `onLaunchSolo(diff)`, `onGoVersus()` (wraps `onMultiplayer`)

- `BattleLogModal`
  - Props: `{ open, onClose, entries: string[] }`

## Acceptance Criteria
- No game title or “Single Player / Multiplayer” headers are visible on the homepage.
- A centered `Launch` CTA opens a bottom sheet with `Solo | Versus` tabs.
- `Versus` tab is disabled and explains requirements when `!import.meta.env.VITE_CONVEX_URL`.
- `Continue` appears above Launch when a save exists and calls `onContinue`.
- Faction selection is available via Hangar card and within the Launch sheet; both stay in sync.
- Difficulty chips show correct ship counts and gating (Medium after Easy win, Hard after Medium win).
- Battle Log opens in a modal via a top‑right button and lists entries from `progress.log` with an empty state.
- All touchable elements meet 44px minimum and have visible focus.
- Lint, targeted tests, and build stay green.

## Test Plan (fail first)
1) Renders without game title or SP/MP headers on Start screen.
2) Clicking `Launch` opens sheet with `Solo | Versus` tabs; focus is trapped.
3) `Versus` tab is disabled when no server env; enabled when present.
4) `Continue` is rendered only when a save exists and calls `onContinue`.
5) Difficulty gating: Medium disabled until Easy win; Hard disabled until Medium win; counts match `getStartingShipCount`.
6) Faction change via Hangar updates selection used by Launch.
7) Clicking 📜 opens Battle Log modal; shows empty state vs. entries.

## Risks & Rollback
- Risk: New layout breaks test snapshots → update tests deliberately with coverage for behavior.
- Risk: Starfield performance on low‑end devices → keep animation lightweight and allow `prefers-reduced-motion` fallback.
- Rollback: Feature‑flag the new shell; keep old `StartPage` structure behind a conditional or quickly revert the TSX changes.

## Phased Implementation
1) Replace headers with new top bar + primary CTAs (no starfield yet).
2) Add Launch Sheet with Solo tab only → then Versus.
3) Add Battle Log modal.
4) Add starfield background + polish (reduced‑motion support).
5) Accessibility pass and tests.

## Decision Log
- Keep `StartPage` props unchanged to avoid ripples elsewhere.
- Use one modal for both tabs (Solo/Versus) to reduce complexity.
- Keep battle log as strings for now; model richer entries later.

## Follow‑ups
- Avatar/profile stub on top bar.
- Rich battle log entries with timestamp/outcome metadata.
- Optional WebGL starfield when budgets allow.

