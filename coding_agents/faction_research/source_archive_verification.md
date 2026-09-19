# Source archive verification — September 19, 2026

Outcome: preserve the entire enumerated Régis Étienne Eclipse Drive collection in original formats and original relative paths, with creator credits and auditable provenance.

Acceptance: all 190 files and 18 folder paths appear in the archive; file sizes match the Drive inventory; each archive member matches its local original's SHA-256; all original versions remain available; no temporary authenticated download links enter tracked artifacts.

## Result

- **190/190 files**, **18 folders**, **1,092,289,861 original bytes**.
- Archive: `regis-etienne-eclipse-drive-2026-09-19.zip`, **1,092,486,694 bytes**.
- Archive SHA-256: `a0393d5151ca7f49a012e221ecf65bc658b61df8a7ddd900875da38924e9e028`.
- Release tag: `faction-sources-2026-09-19`.
- [Per-file manifest](source-archive-manifest.json) records titles, file IDs, public Drive URLs, original paths, MIME types, creation/modification times, sizes, hashes, and archive member paths.
- ZIP contains the exact originals plus this repository's source-authority README, creator credits, and embedded manifest. Links to research outside the ZIP point to the repository release tag.

The connector supplied 189 complete raw originals. Its documented response rejected the 412,952,244-byte faction template XCF with HTTP 413 because it exceeded the connector's 268,435,456-byte download limit. That final file was retrieved through the ordinary public Google Drive download form and verified against its inventoried byte size. No access controls were bypassed.

SHA-256 values describe the downloaded originals and independently verified ZIP members. The Drive inventory did not contain provider-side hashes; verification does not claim comparison with provider-side SHA-256 values.

## Validation and decisions

`python3 tools/archive-eclipse-sources.test.py`: four integrity tests passed after an initial failure before implementation. Tests cover preservation/provenance, missing or wrong-size originals, traversal and duplicate paths, and corrupted ZIP member detection.

The builder then independently read and hashed every one of the 190 actual ZIP members. A manifest scan confirmed no download bearer URLs, inline file bytes, or artifact-host links. Temporary request files were consumed and removed during materialization.

Originals and ZIP remain under ignored `.second-dawn/faction-research/`; only the manifest, credits, research, and archive builder belong in Git. The ZIP is intended as a release asset, so normal clones and the playable site do not carry the 1.09 GB collection.

Risks and rollback: external source files may change after this snapshot; retain this dated archive and hashes. A source-interpretation change must refer to an original and an explicit version decision. Removing an archive release asset does not alter gameplay or require a save migration.

## Rebuild

After restoring originals and the raw inventory beneath `.second-dawn/faction-research/`:

```sh
python3 tools/archive-eclipse-sources.py \
  --inventory .second-dawn/faction-research/inventory.json \
  --originals .second-dawn/faction-research/originals \
  --manifest coding_agents/faction_research/source-archive-manifest.json \
  --archive .second-dawn/faction-research/regis-etienne-eclipse-drive-2026-09-19.zip \
  --readme coding_agents/faction_research/README.md \
  --credits coding_agents/faction_research/credits.md
```

The builder performs no network calls and publishes nothing. Rebuilding after changing credits or source file modification times changes the ZIP checksum; use the newly generated `.sha256` companion. Follow-up: publish the ZIP and its checksum with the complete research commit as the release tag target, then verify the release asset metadata.

## Publication verification

Published [faction-sources-2026-09-19](https://github.com/a1j9o94/eclipse-rougelike/releases/tag/faction-sources-2026-09-19), targeting full commit `c41405a9cf955d8ddec8841aad50bf88897ee26e`. The GitHub tag resolves to that commit. All three assets report `uploaded`: ZIP (1,092,486,694 bytes), checksum (109 bytes), and manifest (144,683 bytes). GitHub's server-reported ZIP SHA-256 matches the locally verified archive: `a0393d5151ca7f49a012e221ecf65bc658b61df8a7ddd900875da38924e9e028`. Release is public, not draft.
