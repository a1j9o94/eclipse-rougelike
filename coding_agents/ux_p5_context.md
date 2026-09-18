# UX P5 exploration, influence, and diplomacy evidence

## Outcome

Exploration keeps the saved tile, hex coordinates, legal rotation, neighboring connections, hostile Ancients, planets, and sector features together. It explicitly states that placement does not automatically spend influence or colony ships and that control, discovery, and colonization remain separate engine-ordered choices.

Discovery choices still begin unselected. Once the player selects a side, confirmation appears inside that card with the actual result (`Gain 8 money`, the exact mixed-resource bundle, `Install or store …`, `Choose free technology`, `Place free …`, `Place Warp Portal`, or `Keep for 2 VP`). Restricted or unusable rewards remain disabled and explained. The saved draw is never rerolled or inferred.

Influence now leads with player intent: **Claim sector**, **Release sector**, and **Transfer control**. All drafts remain exact legal candidates. The confirmation combines existing action economy/upkeep information with sector VP, population return, and later colonization consequences. Population income stays explicitly conditional because the authoritative follow-on population-return choice determines its track.

Diplomacy offers are now available directly from an inspected opponent’s public card when an authoritative candidate targets that opponent. The player must choose one of their own legal population cubes and sees its income change plus the 1 VP ambassador stake before offering. Merely inspecting never submits. Opponent reputation stays face down and all capacity, traitor, ownership, and connectivity restrictions remain candidate/engine-owned.

## Continuity seam

`DiscoveryDecision` uses `decision.sectorId` when available. The Board should retain the last exploration/discovery sector selection through subsequent control, resource, technology, or ancient-part decisions because those older pending-decision variants do not all carry a sector ID. This is presentation continuity only and requires no backend field or deployment.

## Verification

Fail-first tests demonstrated missing inline discovery commits, inspected-opponent offer actions, and intent-first influence labels before implementation.

- Targeted exploration/discovery/influence/colonization/diplomacy component suites run with `--maxWorkers=1`.
- `npm run typecheck:eclipse` and changed-file ESLint cover the implementation.
- No engine, save schema, RNG, command protocol, or backend dependency changed.

Human newcomer/expert and physical-device playtests remain pending and are not claimed.
