# Distinct fleets and readable AI turns — 2026-09-08

## Player outcome

Each fleet card now represents one owner's ship class, with its blueprint silhouette and ×count. Numeric player prefixes are removed. Owner color and one of six original civilization emblems identify fleets, territories, and the player roster. Alien/Terran pairs share their emblem, including faction selection. Four card positions bound sector clutter; crowded sectors show an explicit extra-types card, with the complete composition one selection away in the inspector. Ancient, Guardian and Galactic Center fleets retain distinct silhouettes.

AI decisions are durably spaced 1.2 seconds apart. A persistent status strip announces the active AI, displays new public action summaries, and clearly marks the human turn when it returns. Newly changed sectors pulse and ship movement draws an animated route. The Animations toggle persists per browser and defaults off for reduced-motion users. Turning motion off preserves action explanations. Reload starts at current state and does not replay old history. No private AI data or hidden decisions feed these effects.

## Implementation decisions

Scheduling changes preserve authoritative revision and identity checks. Normal jobs, retries and chained timeout takeover choices are paced; the first timeout choice still occurs at the agreed human deadline. No game rule, AI choice policy, bonus or saved-state format changes.

The frontend compares authorized public board revisions for sector/movement effects. Public journal rows supply the text. Independent review caught a same-revision status refresh shortening map effects; separate animation lifetimes and a regression fixed it. Another regression ensures an old refetched journal entry does not reappear as a fresh action. AI failure explicitly says paused instead of claiming it is choosing an action.

## Verification

463 tests across 91 files pass in the bounded suite. Changed-code ESLint, TypeScript and production build pass. Repository lint retains its existing 88 errors and 12 warnings. Relevant failing-first and green logs are under `coding_agents/logs/second_dawn_{fleet,ai_presentation,ai_pacing}*`.

Independent fleet review covers actual crowded late-game Fit/detail screenshots at all three desktop sizes: no horizontal overflow, no card overlap, and working sector selection. A nested SVG sizing defect found in the browser was fixed with explicit dimensions. Evidence: `second_dawn_fleet_readability_validation.md` and `second_dawn_fleet_review/`. This is agent review, not a new human playtest.

## Rollback and limits

Frontend card/effect changes and server delay can be reverted independently without migrating saves. Long AI-only sequences now intentionally take longer; full-match browser timeout budgets must account for the per-decision delay. Natural opening walkthroughs may not include movement, so movement-specific rendering tests are separate from observations of live AI behavior.

Vercel deployment `dpl_HnbkQ7m5G1He98DELM7vma6CJz77` is Ready, with immutable URL https://eclipse-rougelike-ro9bims03-obleton-adrian.vercel.app/ and public alias https://eclipse-rougelike.vercel.app/. It continues to use development Convex `ideal-nightingale-55`. Live preview fleet screenshots passed at all three desktop sizes after deployment.

Local actual AI walkthrough: 15 accepted AI decisions with 14 distinct visible summaries, observed summary intervals approximately 1.1–2.4 seconds, affected-sector feedback, explicit human return, motion-off behavior, persistence/reload and reduced-motion default all pass with no page errors. Nine screenshots across desktop sizes show no overflow. A reviewer found that the current camera could leave AI sectors offscreen; the Watch AI button now opens the galaxy and fits the whole map on demand. No automatic camera jump is introduced. The existing History tab remains the detailed log.


## Final action-specific inspector and movement additions

Follow AI defaults on and opens a read-only inspector for the latest meaningful public action. Research shows the exact technology/effects; upgrades show the named current public class loadouts; building/moving shows piece counts and affected sectors; exploration, influence and colonization show public sector facts. Bookkeeping does not immediately replace the useful action card. Turn following can be disabled, a manual sector selection dismisses it, and the normal inspector returns for the human. Watch AI can reopen the last meaningful result. Private decisions and hidden draws are excluded by typed public history projection.

Actual local browser verification observed automatic sector action cards, following off/on, restoration of human controls, reopening the last meaningful result, and manual dismissal. Natural opening turns did not exercise research/upgrade/movement; separate integrated engine-fixture screenshots cover those action cards and pure-rule tests cover projection privacy. Reviewed 1366×768 and 1440×900 action cards are readable without horizontal overflow. Laptop blueprint and combat layouts were compacted after independent review found limited initial visibility; failing-first browser visibility checks now pass.

The movement planner now allows a speed-one ship to travel two sectors using two activations in one confirmation. Complete paths and actual activation counts are visible before committing. Intermediate pinning, connections, mixed fleet budgets and one-disc cost remain authoritative. History counts unique ships rather than confusing repeated activations with additional ships. An actual 340px browser inspector fixture confirmed two-sector travel, two activations, one confirmation and one disc; no cloud state was injected.

Final bounded suite: 463 tests, 91 files, all pass. TypeScript, build and changed-code lint pass. Evidence: `second_dawn_visual_turns_final_{tests,build,lint}.out`, `second_dawn_ai_action_panel_validation.md`, `second_dawn_ai_layout_review/review.md`, `second_dawn_movement_chain_browser/result.json`, `second_dawn_public_action_presentation.md` and `second_dawn_ai_presentation_browser/local/result.json`.

## Deployed verification

Extended browser walkthrough passed on https://eclipse-rougelike.vercel.app/ after release: 17 accepted AI decisions, readable public summaries and visible sector feedback, automatic visual action inspector, Follow AI off/on, human inspector restoration, Watch AI reopening, manual dismissal, animations off, reduced-motion default and reload without replay. No page errors. Evidence: `second_dawn_ai_presentation_browser/live/result.json` and its screenshots. The live preview fleet capture also passed at 1366×768, 1440×900 and 1920×1080 with no horizontal overflow. Movement's exact two-step shortcut was verified in the real local browser/pure-engine fixture and behavioral tests; no claim is made that this particular route was observed in the live AI opening.
