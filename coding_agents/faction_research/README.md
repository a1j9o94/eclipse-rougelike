# Régis Étienne faction collection: research and source archive

## Authority and scope

The user designated [Régis Étienne’s Google Drive collection](https://drive.google.com/drive/folders/1pFDgHXE_gsLb2AT3hPptgiSuuM237KHR) as the source of truth on September 19, 2026. The [BGG collection thread](https://boardgamegeek.com/thread/3318132/my-24-factions-for-eclipse-second-dawn-for-the-gal) supplies background and creator credits; it does not override the Drive files. Official expansion rules stored in this Drive are read together with Régis’s explicit amendments.

An explicitly revised document, such as **Last MODIFICATION 20 MAY 2026** or **NEW VERSION 2026**, supersedes an older version of the same rule. Upload/modified timestamps alone do not establish that a rule changed. Preserve conflicting originals and record unresolved differences before implementation.

This is research for an optional faction collection. It does not change the rules of existing base-game matches. The foundation refactor introduces registry metadata and capabilities without adding factions or applying house rules. See [implementation and validation](../faction_registry_implementation.md).

## Contents

- [All 24 options, abilities, implementation ranking, and dependencies](factions.md)
- [AI heuristic research and proposed experiments](ai_heuristics.md)
- [Original-file inventory and checksums](source-archive-manifest.json)
- [Creator credits](credits.md)
- [Complete original-file archive on GitHub](https://github.com/a1j9o94/eclipse-rougelike/releases/tag/faction-sources-2026-09-19)

Original images, PDFs, DOCX/XLSX files, tokens, fonts, and editable templates are retained in the release archive with their original relative paths. Large source files are not bundled into the playable website or normal Git clones. The manifest records public Drive links, file IDs, sizes, timestamps, and SHA-256 checksums; temporary authenticated download URLs are excluded.

## Important ruleset differences

The May 2026 house-rules document changes considerably more than faction balance: two-sector exploration draws (three for Draco), outer-sector placement limits, open technology and discovery selection, public deterministic reputation upgrades, additional technologies/developments, exploration jokers, combat Super Jokers, and ten rounds. It also removes specific technologies and warp-portal sectors.

Those rules are authoritative descriptions of **this collection’s intended environment**, not implicit changes to the currently deployed eight-round base game. A faction can be implemented against the base game only after identifying which dependencies it needs and documenting any deliberate adaptation. In particular, do not silently reveal reputation in current matches or replace random draws just because the collection uses a different system.

Terran selection also bans an alien species in this variant (both Lyra versions count together), and component colors are chosen after factions. This supports separating seat color from faction identity, but adds a draft rule beyond a larger picker.

## Research acceptance and follow-ups

- All 24 listed options have a source-backed ability summary and an engineering difficulty assessment.
- Archive every enumerated original, including older versions; verify byte sizes and checksums, and publish a reproducible inventory.
- Preserve compiler and original designer credits in the repository and archive release.
- Keep the existing catalog, saves, faction selection, UI appearance, and AI behavior stable during the registry refactor.
- Before adding a faction: transcribe its full board/setup, resolve source conflicts, implement meaningful fail-first scenarios, test public/private information and interrupted choices, teach the AI its abilities, and run bounded full matches.

Rollback for the foundation is a code revert; no data migration is introduced. The source archive and research can remain independently of gameplay changes.
