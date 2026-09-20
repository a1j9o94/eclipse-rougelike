# Less Random combat and reputation

## Outcome

Players using `less-random-v1` control the result of each eligible own-unit volley with five persisted Super Jokers and spend public combat reputation draws deterministically.

## Acceptance criteria

- Each player starts with five one-use Super Jokers; Ancients, Guardians, and GCDS never receive the choice.
- An own-unit volley pauses before allocation, damage, destruction, and Rift backfire. The owner may accept it, reroll the whole volley, or substitute the exact table result.
- Rerolls consume one Joker and may be followed by another Joker decision. Table substitution consumes one Joker and proceeds to allocation.
- Table rows 1–50 match `image17.png` and `image18.png`; mixed dice retain their persisted source/color order.
- Less Random reputation spends public draw credits on a 1 VP tile (one draw) or an `X` to `X+1` upgrade (`X` draws), constrained by track capacity and the finite face-up supply.
- Standard games retain seeded random draws and existing automatic retention behavior.

## Source decision log

- The source table defines face counts but does not say how faces map to mixed-color dice. The engine uses stable persisted die order, previews the complete face/color result before the Joker is spent, and records this as a deterministic interpretation.
- Rift Cannon is excluded by the Less Random technology catalog. Synthetic/legacy states containing Rift dice still derive normal Rift damage and backfire from the substituted face, and those effects wait for acceptance/allocation.
- Reputation action lists may be empty or spend fewer than the awarded draws because the source uses “may” and finite supply/capacity can block spending.

## Tests

- [x] Failing first: Super Joker table boundary rows and invalid sizes.
- [x] Failing first: mixed normal/Rift die substitution.
- [x] Failing first: exact reputation costs, supply conservation, capacity, unavailable supply, and overspending.
- [x] Failing first: battle pauses before allocation and consumes one Joker for table substitution.
- [x] Existing battle, Rift, and standard reputation regression suites.
- [x] Bounded 2–6 seat AI matches complete through round 10, plus an expanded match covering Rho Indi, Magellan, Midas, and Ragnarok.
- [x] Hard shallow search is invariant to opponent-private values and the authoritative RNG when the player view is identical.
- [x] Super Joker UI compares the complete current colored volley with the exact table substitution before commit.
- [x] Reputation UI validates each draft step against public holdings, capacity, draw budget, and finite supply; undo/reset and decision-keyed draft cleanup are covered.

## Risks and rollback

The mixed-color mapping is an explicit interpretation of an incomplete source rule. It is isolated in `lessRandomCombat.ts`; changing to player-assigned faces later will require extending the decision choice without changing the table data. Standard mode does not enter either new branch.

## Follow-ups

- Present the deterministic face/color preview and public reputation controls in the decision UI.
- Confirm replay validators and AI candidates cover both new decision kinds.
