# Desktop chrome follow-up

## Outcome

Desktop play gives the galaxy and docked inspector both navigation rows' worth
of vertical space.

## Decision

The status information and available actions share one 44 px desktop command
strip. The former screen navigation and lower action footer are removed.

Explore, Influence, Research, Upgrade, Build, Move, and any currently legal
special action are direct command-strip choices. Spatial actions retain the
galaxy as their working surface; Research and Upgrade open their dedicated
workspaces. Galaxy is the default board state, not a separate destination.
The mark is retained as a compact utility symbol; the full wordmark and income
details no longer consume persistent map space. Resources, turn state, action
capacity, score, history, AI retry, and the room menu remain available in the
same strip. The player roster remains the entry point for public player boards.

At narrow desktop widths the command strip scrolls horizontally instead of
wrapping into another row. Mobile retains its separate header and sheet UI.

## Acceptance criteria

- Desktop has no separate `.sd-toolbar` or `.sd-footer` row.
- Available actions, history, and the room menu remain in `.sd-header`.
- Choosing Research from the strip opens its research workspace directly.
- The command strip has a 44 px minimum height and does not wrap.
- Draft recovery notice remains below the command strip.

## Validation

- `src/__tests__/second_dawn_desktop_chrome.spec.tsx`
- `npm run build:vercel`
