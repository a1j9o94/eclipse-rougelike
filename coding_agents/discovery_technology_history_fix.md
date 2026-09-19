# Discovery technology history — 2026-09-19

Outcome: players can see which technology they received from an Ancient Tech discovery directly in History, including past saved games.

Acceptance: an accepted free-technology resolution names its acquired technology and uses the existing public research presentation; private discovery draws, kept discoveries, reputation choices, and internal command/decision IDs remain hidden.

Cause: History intentionally summarized every resolved choice by its kind. That correctly protected private discoveries/reputation but also hid the acquired technology, which is public after research. The accepted journal already contains the technology ID, so no save migration or new persisted event is needed.

Implementation: `shared/eclipse/history.ts` narrowly allowlists accepted `free-technology` choices for the summary (`Received Fusion Drive from discovery`) and existing research-card presentation metadata. Catalog lookup prevents arbitrary unrecognized identifiers from being displayed. Other choice payloads retain their previous redaction.

Fail-first evidence: both new regressions initially produced `Resolved free technology`. The behavioral test commits a real free technology through the authoritative command processor, checks the actual acquired technology and unchanged science balance, then verifies its public History projection while filtering private event content. A legacy journal scenario checks retroactive naming and unchanged discovery/reputation redaction.

Validation: 17 tests passed across new discovery technology history, ordinary history, presentation metadata, and Convex history query coverage. Full `npm run lint && npm run build` passed (Convex codegen, TypeScript, Vite); only existing Browserslist/chunk-size warnings. No UI component changes.

Deployment: Convex must receive this shared projection change for live History queries. Frontend deployment updates preview/offline shared formatting. Existing journal rows require no rewrite. Rollback is a normal revert of the narrow projection change and tests.
