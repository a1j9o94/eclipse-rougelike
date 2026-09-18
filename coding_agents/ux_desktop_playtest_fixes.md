# Desktop playtest follow-up

## Player outcome

End a turn and immediately see the next player's galaxy activity. Keep the galaxy
and sector details prominent on desktop. Make Neutron Bombs destroy all eligible
population without asking the player to allocate automatic hits individually.

## Acceptance criteria

- Accepted turn handoffs leave Research/Blueprints for Galaxy, once; pending human
  decisions and subsequent deliberate navigation keep priority.
- The desktop header uses a compact 64px minimum-height row, small identity/round
  labels and inline resource income. It can grow if text needs space.
- Affordable action count is the economy headline. Native hover text and a
  keyboard/touch disclosure retain the discs, money, income and upkeep breakdown.
- The inspector remains a persistent adjacent grid column, with independent
  scrolling and less padding. Standard width is 320–400px; build planning retains
  its wider 440px cap. Desktop selectors exclude the mobile layout.
- Active Neutron Bombs present automatic destroy-all/spare choices; Neutron
  Absorber preserves ordinary bombardment assignment. Population attacks remain
  optional; no ship damage or underlying game balance changes are intended.

## Diagnosis and review

See `ux_turn_handoff_fix.md` and `ux_neutron_bombs_fix.md` for implementation,
official rulebook evidence and targeted tests. The user clarified that surviving
population resulted from manual allocation of Neutron Bombs hits. This is an
interaction defect: the existing engine already computes automatic population
hits, but the generic target allocator obscures that effect.

Sol owns bombardment; Terra owns turn handoff and reviews header CSS. Parent
reviews integration, compact disclosure, styles and release provenance. The
React review covers receipt revisions, effects, keyboard access and mobile
behavior. No new dependencies or backend deployment configuration are needed.

## Verification and limits

Validation and release results will be recorded below. The supported browser
session is currently blocked by the previous Vercel authentication request; both
a browser command and the runtime reset timed out. Do not claim measured viewport
heights, screenshots or live interaction checks unless that session recovers.

## Rollback

Revert this follow-up's commit. Existing command payloads and stored games remain
compatible. Do not change deployment targets, drop tables or reset matches.

## Validation result

- 48 tests passed across seven focused suites: turn handoff, mobile shell,
  population/combat decisions, round aftermath, upkeep, action capacity and action
  economy. The old economy test was updated from the superseded `End action`
  button text to the existing `Done moving` label.
- Full production build (Convex codegen, app/domain TypeScript and Vite) passed.
  Changed TypeScript is ESLint-clean; root lint retains the existing 88 errors and
  12 warnings.
- Parent review caught receipt object identity risk; the handoff now requires a
  strictly newer accepted revision. Rulebook review preserved optional population
  attacks, and the user's clarification drove the dedicated automatic-all UI.
- CSS selectors exclude the mobile shell, whose breakpoint is 1023px; desktop
  grid minimums are below the available width at 1024px. This is a source review,
  not a measured browser result. The supported browser did not recover.
- Deployment and live asset verification are pending; record the result in the
  release PR after publishing to the established main-only Vercel project.
