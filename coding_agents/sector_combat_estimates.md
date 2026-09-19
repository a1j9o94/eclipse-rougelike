# Combat estimates after movement

Outcome: with the agreed combat-odds setting enabled, selecting a sector containing your ships shows a public fleet estimate. Fleet inspection also shows it without requiring a movement selection. Existing residents take precedence over an unrelated movement draft.

Uses the same bounded asynchronous simulator, public damage/loadouts and independent randomness as movement. Static encounters now follow actual defender priority: neutrals, participating owner, earliest resident arrival, then owner ID. Incoming movement assumptions remain unchanged. Active battles and multi-opponent sequences continue displaying an explicit unsupported explanation; the simulator does not know already-rolled hits or the current firing-group cursor.

TDD: inspection test failed before the preview was wired; stationary-unowned-sector test failed for the wrong defending side.28 tests pass across inspection, estimates, movement preview and room UI. Lint/TypeScript/production build pass with existing Browserslist/bundle notices. Preview fixtures enable odds for visual review.

Browser: real pinned fixture, selected sector230, observed estimate in sector inspector and fleet modal. Desktop screenshot reviewed. No game commands were submitted and no hidden information used. Human playtesting and active-battle continuation simulation remain separate work.
