# Public AI action inspector

Outcome: watching an AI action opens the corresponding visual public result in the existing inspector, while retaining the galaxy and player controls.

AiActionPanel consumes PlayerView and a PublicHistoryEntry only. It never reads view.private, pending choices, candidate commands, RNG, draws or simulation state. The optional typed presentation union is projected by the authoritative history module (owned by the identity/history agent).

- Research: actual catalog technology with computer/hull/etc. icon statistics and effect explanation. No research purchase button.
- Upgrade: explicitly lists every changed class, then read-only public installed part cards and printed empty slots for each class. Labels say Current public loadout because journal class metadata may precede a newer view. No slot editing controls.
- Build: class/structure silhouette cards, quantities, and sector inspection buttons.
- Move: known surviving ships in the public board plus public fleets in referenced sectors. Paths are not labeled source/destination because history does not contain movement origins. Missing historical ship/sector IDs are omitted safely.
- Influence, colonization and placed exploration: public sector buttons and current planet/population details.
- Other choices: public summary/details only; no attempt to infer private choice payloads.

TDD: `second_dawn_ai_action_panel_red.out` records missing-component failure before implementation. Five tests then pass for research effects/read-only controls, multiple blueprint types, build quantities/inspection, missing historical movement IDs and generic public choice fallback. TypeScript and scoped lint pass. Logs live under coding_agents/logs/second_dawn_ai_action_panel_*.

Browser: `tools/second-dawn-ai-action-panel-review.mjs` injects isolated deterministic public action presentations into the real SecondDawnBoard, then advances a revision to exercise its Follow AI integration. It does not mutate a saved match or backend. Captured research/upgrade/build/move at 1366×768 and 1440×900 under coding_agents/second_dawn_ai_action_panel_review/. The inspector is 310px outer / 265px content at both sizes; all panels have no horizontal overflow. Upgrade loadouts scroll vertically; the changed-class list makes additional classes explicit before scrolling. Research and build results fit entirely. Actual rendered four 768px screenshots and 900px research inspected; effects and quantities are readable, controls do not obscure the board. These are synthetic presentation fixtures, not evidence of an executed live AI game and not human playtest evidence.

Root owns Follow AI timing, manual override, final integrated tests, deployment and live AI verification.
