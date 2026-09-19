# Colonization during upkeep review

Outcome: players who can legally colonize see that opportunity before finishing upkeep, without searching the command center.

Acceptance: show Colonize only when the current legal command list includes a nonempty placement; open the existing planet planner on desktop/mobile; returning to upkeep never submits payment; preserve normal placement and upkeep confirmations. No engine or timing rules change.

Implementation: the upkeep attention notice and upkeep review both offer Colonize. Mobile opens the planner expanded. During upkeep the planner has Back to upkeep, which rebuilds the upkeep draft from the current candidate list, including after accepted colonization. Disconnection/busy/interaction blocking prevents entering colonization. Missing colony ships, no eligible empty planets, or enemy presence yield no entry because legality yields no command.

Tests: three positive tests failed first on absent Colonize buttons; implemented the navigation, then all checks passed. Added eight targeted cases covering desktop/mobile, direct notice entry, no ships/no eligible planet/enemy presence, connection loss, and accepted engine placement then return. Together with existing attention and population planner tests: 34 tests passed in four files. Scoped eslint and `tsc -b` passed; parent runs final repository gates.

Browser: agent-browser, 1440×900 and 390×844. Mounted the actual production board with an isolated deterministic upkeep fixture in a temporary browser-only harness; onSubmit runs the real engine locally. This is component-flow evidence, not a guest-server test. The player can select Colonize in upkeep review and reach the existing planet planner; Back to upkeep stays at the top. Images opened and visually inspected: `screenshots/upkeep-colonize/review-desktop.png`, `review-mobile.png`, `planner-mobile.png`, plus `notice-desktop.png`. A desktop-to-mobile resize naturally collapsed the existing sheet; expanded it before capturing mobile review. Entering from the notice at mobile size is covered by the focused navigation test. No production-only route or mock UI was shipped.

Risks and rollback: small presentation/navigation change; revert the two components and tests to remove the shortcut. Rules remain authoritative; no automatic population placement, payment or action submission. Human playtest confirmation remains separate from automated and agent inspection.
