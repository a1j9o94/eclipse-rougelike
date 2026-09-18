# Visual action controls — deployed

The accepted dropdown replacement is implemented using influence discs and map targets, planet colonization squares, build quantities, ship movement/retreat cards, blueprint hardpoints and part trays, combat target/allocation cards, diplomacy population chips, reward counters, private reputation tiles, and sector decisions. Research free choices reuse effect cards with legal tracks. The unused generic candidate-card fallback was removed.

Browser verification passed eleven isolated engine action/diplomacy workflows, eight task walkthroughs, save/reload, offline submission blocking, reconnect, pending exploration recovery, and scheduled AI progress. The focused suite passed 381 tests across 74 files; subsequent keyboard/portal checks passed nine tests. Scoped lint and production build passed. Full repository lint retains 88 inherited errors and 12 warnings.

Independent agent review inspected 45 rendered images at three desktop sizes. Findings and limits are in `second_dawn_visual_release_review.md`. The reputation sidebar's obsolete combat copy was corrected after that review. The 21 reviewed general gameplay images establish `second_dawn_visual_baseline_v5`; existing baselines remain preserved. This is agent review evidence, not new human usability measurements.

Published Vercel deployment: https://eclipse-rougelike-hangy008c-obleton-adrian.vercel.app

Live aliases: https://eclipse-rougelike.vercel.app/ and https://eclipse-rougelike.vercel.app/#second-dawn-preview

Backend remains development deployment `ideal-nightingale-55`. Live smoke checks passed create, save/resume, offline/reconnect, exploration restoration, and AI/history progression. Evidence: `second_dawn_deployment_live/smoke.json` and `logs/second_dawn_visual_actions_deploy.out`.

Next authorized work: shareable multiplayer rooms and visual faction setup, tracked in `second_dawn_multiplayer_plan.md`.
