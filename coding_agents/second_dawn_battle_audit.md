# Persisted battle engine audit — 2026-09-07

Outcome: players direct ship activations, dice allocation, retreat and reputation through reconnect-safe authoritative decisions.

Implemented in `shared/eclipse/battleEngine.ts`: `advanceCombat`, `resolveCombatChoice`, and `reputationCapacity`. All mutations target the caller's working copy. Root command processing clones before validation and commits accepted results. Resolving a combat turn can create a new allocation decision; callers must not clear that replacement afterward. Reset `engine.combatInitialized` to false before each new Combat Phase.

Sources: publisher-linked 2021-04-27 rulebook pp.18–21 (battle ordering, missiles, engagement, damage, retreat, neutral allocation, stalemate, reputation), p.11 (Antimatter Splitter), pp.26–29 (reputation/ambassador track slots). Read actual PDF extraction `/tmp/second-dawn-rules.txt` and linked component scans from the parallel blueprint audit. Dized publisher-verified corroboration: [initiative](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/x6tnFSGfQ5mMeDwYMvoWVA/initiative), [neutral damage](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/tFdkLOvlTl65ODyP6GJc7w/hits-and-damage-with-non-player-opponents), [hitting](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/vB4RCvZxQYiwYR71YglbYA/hitting).

Acceptance implemented:

- Descending sector order, pairwise reverse arrival, controller and neutral defenders last, peaceful Draco/Ancient coexistence.
- Blueprint-derived initiative, defender wins opponent ties, owner chooses same-initiative ship-type ordering.
- One missile sequence per pairwise battle; repeated cannon engagement rounds.
- Persisted random stream and rolled dice; no reroll on reconnect.
- Manual ordinary allocation, shields/computers, burst and miss handling, simultaneous damage, excess damage and kill credit.
- Antimatter cannon splitting only for holders of Antimatter Splitter, among hit targets; antimatter missiles cannot split.
- Automatic neutral allocation: destroy larger eligible targets, then damage largest surviving hittable targets. Ship-size order follows printed blueprint space counts (Dreadnought > Cruiser > Starbase > Interceptor).
- Retreat declaration leaves ships attackable until next activation. End-of-battle completion distinguishes previous vs current engagement retreat declarations.
- Stalemate forces the unarmed attacker to retreat; ships with no legal retreat are destroyed. No arbitrary battle round cap.
- Once-per-sector sequential private reputation draw, at most five drawn and at most one new tile retained; previous tiles may be replaced and returned supply remains conserved.
- Retreat participation penalty; destroying an immobile ship during a forced retreat correctly updates eligibility of the remaining retreating fleet.
- Dedicated ambassador/reputation slots: Orion5 minus ambassadors; Eridani/Draco/Mechanema4 minus ambassadors; Hydran/Planta3 minus ambassadors beyond the first; Terrans4 minus ambassadors beyond the first.

Tests first: initial missing-module failure logged in `coding_agents/logs/second-dawn-battle-red.out`; reputation-slot and forced-retreat regressions each reproduced a failure before fixes. Final 19 focused tests pass in `src/__tests__/second_dawn_battle_engine.spec.ts`. Changed-file ESLint passes. Full lint retains 88 errors and 12 warnings. Production build including Convex codegen, TypeScript and Vite passes (`coding_agents/logs/second-dawn-battle-build.out`).

Decision log: root owns bombardment/control/discovery/repair and upkeep; this engine returns true after all sector battles and reputation choices finish. Standard neutral blueprint tiles are used consistently (advanced alternatives belong to setup selection, not random per-attack choices). Owners may revise tied ship-type ordering for the missile sequence and every engagement round. Unarmed types do not create spurious missile ordering prompts; destroyed groups do not participate in ordering. A failing regression demonstrated the previous fixed-order restriction before correction.

Rollback: new continuation fields and optional allocation damage preserve existing snapshots structurally; active full-game matches must remain pinned to a rules/catalog version. No legacy game code was changed in this slice.
