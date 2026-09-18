# Desktop chrome follow-up

## Outcome

Desktop play gives the galaxy and docked inspector a second navigation row's
worth of vertical space.

## Decision

The status information and screen navigation share one 44 px desktop command
strip. The mark is retained as a compact utility symbol; the full wordmark and
income details no longer consume persistent map space. Resources, turn state,
action capacity, score, every screen destination, history, AI retry, and the
room menu remain available in that strip.

At narrow desktop widths the command strip scrolls horizontally instead of
wrapping into another row. Mobile retains its separate header and sheet UI.

## Acceptance criteria

- Desktop has no separate `.sd-toolbar` row.
- The game-screen navigation and room menu remain in `.sd-header`.
- The command strip has a 44 px minimum height and does not wrap.
- Draft recovery notice remains below the command strip.

## Validation

- `src/__tests__/second_dawn_desktop_chrome.spec.tsx`
- `npm run build:vercel`
