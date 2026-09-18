# Fleet identity and readable computer turns

Outcome: players distinguish fleet composition at a glance and can follow each computer action before play returns to them.

Acceptance:
- Galaxy fleets show separate owner/type cards with distinctive ship silhouettes and counts, without numeric player prefixes. Owner color plus a reusable civilization symbol identifies fleets; symbols are shared across each alien/Terran board pair and have accessible names.
- Sector inspector uses the same fleet identities; crowded six-player examples fit without obscuring planets/connections. Neutral Ancient/Guardian/GCDS fleets remain distinguishable.
- AI decisions are durably spaced at roughly 1.2 seconds with existing revision/ownership guards. No hidden data used for presentation.
- Persistent status states whose AI turn it is, shows public action summaries as they arrive, and clearly announces the return to the human. Relevant sectors pulse and moved ships have a restrained visual path.
- Motion can be disabled, respects system reduced-motion preference, and never delays or blocks an authoritative human decision. Reload resumes the current match without replaying the entire history.
- Tests fail before behavior changes. Bounded unit/adapter batches, scoped lint, build, actual-browser AI walkthrough and reviewed screenshots at 1366×768, 1440×900 and 1920×1080. Live and preview updates deployed to Vercel and the approved Convex development backend.

Risks: crowded SVG fleet cards require bounded layout and explicit overflow affordance; server pacing adds wait time in long AI-only stretches. Existing deterministic engine outcomes remain unchanged. Revert presentation or scheduling delay independently without altering saved state.

## Accepted follow-ups

The user noticed that the single-activation movement planner required two confirmations for a speed-one ship moving two sectors. The planner now budgets multiple activations, emits sequential moves for the same ship in one authoritative command, and previews the complete route and activation cost. Existing engine rules stay unchanged.

The user then requested action-specific computer interfaces instead of only slower timing. Add a read-only inspector that automatically follows committed public AI results: technology/effect card, current upgraded class loadouts, build quantities, moving fleets, explored/influenced/colonized sector facts. A Follow AI control disables this automatic view; human controls return when the human acts. Typed optional public history metadata supports these views without exposing hidden draws or reputation choices. Preserve existing screens and allow manual inspection without the next update overriding it.
