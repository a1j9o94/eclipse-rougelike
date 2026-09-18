# Second Dawn sector catalog audit — 2026-09-07

Outcome: players explore and colonize the actual base-game sectors, with real printed wormhole connections and home orientations.

Acceptance: all 60 playable faces represented (54 physical tiles, including six double-sided homes); base IDs only; every printed population square, VP, artifact, discovery and defender transcribed; home values agree with the independent publisher faction audit.

## Evidence and method

- [Publisher-linked 2021-04-27 rulebook](https://www.dropbox.com/scl/fi/wfua8sx8lyp2axor71cjx/Eclipse2_rules-ENG_2021-04-27_small.pdf?rlkey=e6kaj8wow8rykg2esfbk8ixw0&dl=1): pp. 3 (inventory), 4–5 (setup), 7 (107 printed face and wormhole/warp definitions), 26–27 (home populations). Local inspection used `/tmp/second-dawn-raster.pdf` and rendered pages, not just extracted text.
- [Publisher-verified Dized inventory](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/rSsAz7o1SeuG-uStUruHWQ/sector-hexes) independently lists base sector IDs.
- Physical tile scans available through the public [Wyko TTS Workshop module](https://steamcommunity.com/sharedfiles/filedetails/?id=2414358241). The module credits Zee Germans for Second Dawn component scans. Its rule scripts, counts, and expansion components were NOT imported as authoritative game data. The public Steam asset manifest supplied URLs; each downloaded sector scan was inspected. Only numerical component facts are included in the application; artwork was not copied into the production app.
- [Lightion's sector stats](https://boardgamegeek.com/thread/3119824/sector-stats), images 7628405/7628406/7628407, used as a secondary crosscheck. The spreadsheet contains actual transcription errors, listed below. Every implemented field comes from inspected component faces, not from mechanically importing this table.
- [Entreri43's spreadsheet](https://boardgamegeek.com/filepage/229047/2nd-dawn-hex-breakdown-and-1st-ed-comparison) was located via public BGG API (file 313159), but direct download returned 403 and its contents were not used.

## Coordinate decision

The printed hex is flat-top, with readable horizontal names. Printed edge indices are NE=0, N=1, NW=2, SW=3, S=4, SE=5. This is the exact same cyclic order as `geometry.ts`. Rotating the artwork 30 degrees clockwise maps the indices into that module's pointy-top display labels E, NE, NW, W, SW, SE. Home and guardian arrows point at index 1. Home and guardian wormholes are always 0,1,3,4 before gameplay rotation. The application must use the same indices and add its sector rotation modulo six.

Opposite-face ink visible outside the cut edge of scans (notably 103 bottom) is excluded. Only circles actually printed within the playable face count.

## Corrections to secondary data

- 106 has two population squares (basic science and materials), not the spreadsheet total of three.
- 107 has three population squares (money, advanced science, advanced materials), not its spreadsheet total of two. Publisher p. 7 verifies this exact component face.
- 110 has advanced **money** and advanced gray; the spreadsheet puts its colored square in advanced materials.
- 311 has **three** wormholes (N, S, SE), not the spreadsheet's two.
- 208 has **four** wormholes (N, NW, S, SE), not the spreadsheet's three.
- 109 is 4 VP and 318 is 1 VP in inspected Second Dawn components. Do not use speculative Kickstarter-era change lists that state otherwise.

## Test-first and verification

`src/__tests__/second_dawn_sectors.spec.ts` was added first; the initial run failed because the catalog module did not exist (`coding_agents/logs/second-dawn-sectors-red.out`). Implementation then passed all five tests, including home values independently compared to the publisher-derived `BASE_FACTIONS`, excluded expansion IDs, printed anomalies, defenders, portal IDs, evidence URLs, unique IDs and valid wormhole edges.

Changed-file ESLint: pass. Full repository lint: existing 88 errors / 12 warnings (`coding_agents/logs/second-dawn-sectors-lint.out`). Build attempted, currently blocked by parallel engine/setup implementation and Convex validator typing (`coding_agents/logs/second-dawn-sectors-build.out`); parent orchestrator owns integration and the final gate.

## Decision log and follow-ups

All requested base face fields are resolved. The scans match the publisher's directly illustrated home and 107 examples; other sector faces have direct physical-component evidence but are not all reproduced in the rulebook. No unverified fields were filled by guessing. A second person reviewing the same scans is still desirable before declaring the complete game audited; this is distinct from automated correctness tests.

Risk/rollback: a face transcription can change seeded exploration outcomes. Pin games to the catalog version; correct a confirmed transcription through a catalog-version migration, not silent save reinterpretation. No application behavior outside the new catalog changed in this slice.

## Per-face inspection record

All listed values were visually checked against the linked scan. Population notation: M/S/T/G = money/science/materials/gray; `*` = advanced. Edges use the convention above. D = discovery, A = ancient count, F = artifact count.

| ID | Name | Edges | VP | Population | D / A / F | Scan |
|---|---|---|---|---|---|---|
| 001 | Galactic Center | 0,1,2,3,4,5 | 4 | M, M, S*, S, T*, T | 1 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135711258/51CD62FCCA31C64326606AC68E89E8BC01FE25BE/) |
| 101 | Castor | 0,2,3,4,5 | 2 | M, T*, T | 1 / 1 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135792000/022502A034F951E243B09F0AE0DEF3F33068B8CD/) |
| 102 | Pollux | 1,2,4,5 | 2 | S, S | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135792773/E1A9181C5EC40B222DE9D2647526C28BE9477CBB/) |
| 103 | Beta Leonis | 0,1,2,3,5 | 2 | M, S | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135790571/6A0536BEA62F1AAE908C34298210C823E6F7EE65/) |
| 104 | Arcturus | 0,1,3,4 | 2 | M, M*, S, S* | 1 / 2 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135791344/87A0291BB5C99EFCE66D4567FDA9BEDA357E9765/) |
| 105 | Zeta Herculis | 0,1,2,3,4 | 2 | M, S, T* | 1 / 1 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135791686/E0A383B8533F71604E5C07E7E4B7E0B7A6A52314/) |
| 106 | Capella | 0,1,4,5 | 2 | S, T | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135789798/5E83FB4D97C56BB738CFF183353434B99F6A8991/) |
| 107 | Aldebaran | 0,1,2,4,5 | 3 | M, S*, T* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135792376/9D682AEBB8D23045724691B8551001E514721A8C/) |
| 108 | Mu Cassiopeiae | 0,1,3,4 | 2 | M*, S, G | 1 / 1 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135788923/539FFC2F1B9E3931A04B11A6DB06B159015C92D2/) |
| 109 | Alpha Lacertae | 0,2,3,4,5 | 4 | M, T | 1 / 2 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135790917/63AF5DFB567F610011224F7085463D18273CF455/) |
| 110 | Iota Boötis | 1,3,4,5 | 2 | M*, G* | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135790167/1196D012D0C209EDF9D5A58CA22C761E5C83A18B/) |
| 201 | Alpha Centauri | 0,2,4 | 1 | M, T | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135786069/314C2CF08585DAF112B0C5CCE7AD8D407608FB56/) |
| 202 | Fomalhaut | 0,2,4 | 2 | S, S* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135782882/4432EF6C7C2DAD66E49C401872611ABFAC4C4ED7/) |
| 203 | Chi Draconis | 0,1,2,4 | 2 | M*, S, T | 1 / 2 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135780847/E33B76916E782DF34CC12447B5ED6C8B884C2DE9/) |
| 204 | Vega | 0,1,2,4 | 2 | M*, T*, G | 1 / 1 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135786823/DB38BD896155FDB470C6D81FF335008F0480C101/) |
| 205 | Mu Herculis | 3,4,5 | 1 | M, M*, S* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135785302/CD0853509E321D6D8FC9EB402F4CDEC0F8304A5A/) |
| 206 | Epsilon Indi | 0,2,4,5 | 1 | T | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135784521/ED97DC7E3C2CC22BFFAC47F26FF143A270C71C41/) |
| 207 | Zeta Reticuli | 0,1,4 | 2 | — | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135783401/01FAAF654DE1FB89A15C912D91B5AEDB28C5B241/) |
| 208 | Iota Persei | 1,2,4,5 | 2 | — | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135781803/A25CAC06A1F83016C1F4F62B6F90CE3A655B3523/) |
| 209 | Delta Eridani | 0,1,2,4 | 1 | M, S | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135782205/FE64320F052A00F6EC9847729EF5FF1C3082EF50/) |
| 210 | Psi Capricorni | 1,2,4 | 1 | M, T | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135783799/4890A66A7564B51B8F27F927B473A9FC0C2C34B8/) |
| 211 | Beta Aquilae | 0,1,4,5 | 1 | M, T*, G | 1 / 1 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135782563/171FCC083908BBA514FA00260CAF42895AC839EA/) |
| 214 | Beta Monocerotis | 0,1,2,3,5 | 2 | S, T*, G* | 1 / 1 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135784141/5A51B3BCB4366507BFC75F370C7B4908D88BD65E/) |
| 221 | Procyon | 0,1,3,4 | 3 | M, M*, S, S*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135738803/D928043E4D85CC51F71E252F4959597D1BFFE25C/) |
| 222 | Epsilon Eridani | 0,1,3,4 | 3 | M, M*, S, S* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135736208/9C9D02F5D00E52739A259A54193BB12599394756/) |
| 223 | Altair | 0,1,3,4 | 3 | M, M*, S, S*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135732511/E25B30B5E1B5C98F9BA0D1CDEA10D57384322826/) |
| 224 | Beta Hydri | 0,1,3,4 | 3 | M, S*, T* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135735387/26409967E93AD9A59E9CE5AD0AAB9BAC0395AE67/) |
| 225 | Eta Cassiopeiae | 0,1,3,4 | 3 | M, M*, S, S*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135737970/0A2D84E2BA0D9B530A5257A930676C4C6886A48B/) |
| 226 | 61 Cygni | 0,1,3,4 | 3 | S, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135734436/D5D32BE77336E187DAC77B3635C4066725944BE1/) |
| 227 | Sirius | 0,1,3,4 | 3 | M, M*, S, S*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135733435/058B4ECA21CA5263BA8A87193637D400383B1445/) |
| 228 | Sigma Draconis | 0,1,3,4 | 3 | M, S, T* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135737148/C3A88A982004279B4EED0C3B4503385369686A2F/) |
| 229 | Tau Ceti | 0,1,3,4 | 3 | M, M*, S, S*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135740618/1C9E2E3D47C0540B26DC72B8D4822E419D238E55/) |
| 230 | Lambda Aurigae | 0,1,3,4 | 3 | M, M*, S, T* | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135751199/6CAFDB82F8362DBAF70BE614113E03B8744CA9B2/) |
| 231 | Delta Pavonis | 0,1,3,4 | 3 | M, M*, S, S*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135727964/7A93FB3DEAF7D0953475A920A67F17DD77F0F41F/) |
| 232 | Rigel | 0,1,3,4 | 3 | M*, S, T*, T | 0 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135749754/779DD19611075E19FF6A512D5CE323FDBB117A49/) |
| 271 | Omega Fornacis | 0,1,3,4 | 2 | M, S, T* | 1 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135717669/3E7FA3A073354686E636B40856E29691693DE6A9/) |
| 272 | Sigma Hydrae | 0,1,3,4 | 2 | M, S*, T | 1 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135719604/4547613D6D2DC6C5B11E30FED95A0315E68D2F36/) |
| 273 | Theta Ophiuchi | 0,1,3,4 | 2 | M, T*, T | 1 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135719017/0EFFCC597B73774723EF8030D4556C5FA9A457A1/) |
| 274 | Alpha Lyncis | 0,1,3,4 | 2 | M, S, S* | 1 / 0 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135718357/8F8B2130FB15932196C4CE26B41357A19E97C5F4/) |
| 281 | Delta Corvi | 1,2,4,5 | 2 | M, S | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135784893/B9F7CF581F43AF70E6A03D7E6276C965BAD838D7/) |
| 301 | Zeta Draconis | 1,4,5 | 2 | M, S, T* | 1 / 2 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135793898/400FD1237758245F2F9C8DB989380D4489296F9C/) |
| 302 | Gamma Serpentis | 1,3,4 | 2 | M*, S*, T | 1 / 1 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135800091/B8CCD5A6B59BBBFCB6D04F87222297A2C5EA0994/) |
| 303 | Eta Cephei | 2,4 | 2 | M*, S*, G | 1 / 1 / 1 | [face](https://images.steamusercontent.com/ugc/1267149075135795731/4DEFAF0D88F831CDCB0EF3D5A19648A6D56523A1/) |
| 304 | Theta Pegasi | 1,4 | 2 | M*, T | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135794684/7FB338C5AD07745230B4F7CA974C95A421D70F1E/) |
| 305 | Lambda Serpentis | 0,1,4 | 1 | S, T | 1 / 1 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135796314/7F0AF8F5231C8AE7B08CF342E9D70A2DBF16459C/) |
| 306 | Beta Centauri | 0,4 | 1 | M, T | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135798679/E0851B080378B50765EFCF35CF56855385BD440B/) |
| 307 | Sigma Sagittarii | 1,4,5 | 2 | M, S* | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135797961/43F8A88348225C3F8379E4ADAD0CCD5753196EBA/) |
| 308 | Kappa Scorpii | 2,4,5 | 2 | S, T* | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135799437/25F5826FD75445A8E4DD98576B6BF69496797825/) |
| 309 | Phi Piscium | 1,2,4 | 2 | M, S* | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135795414/933BDAD301F473F0E3BCAB498ECB2ED8A62AF913/) |
| 310 | Nu Phoenicis | 1,4 | 1 | S, T | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135795049/BE928739D69EC14809C3990812C16DBC0B44BCEF/) |
| 311 | Canopus | 1,4,5 | 1 | T | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135797558/5823E8385A2699921BC015B21BEB7C1B70C7D2CC/) |
| 312 | Antares | 0,1,4 | 1 | T | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135797176/DFDB848E26AB64064B06D92EA9CB5CED45A0B5A1/) |
| 313 | Alpha Ursae Minoris | 1,4 | 1 | G | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135794342/D289CF9BD4C3CC99583543694C6B9FCAE284A5C7/) |
| 314 | Spica | 3,4,5 | 1 | G | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135801049/FCBC437D35A4033C48B2F42A65334343146509FD/) |
| 315 | Epsilon Aurigae | 1,2,4 | 1 | — | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135799743/63D759885A04FAC47924E2EA2ECA4E6E20D422BE/) |
| 316 | Iota Carinae | 0,1,4 | 1 | — | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135798999/FC4F0CBB3B73FD9B716C68F27AE734C3C373EFDD/) |
| 317 | Beta Crucis | 3,4 | 2 | M, M* | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135801475/2301A079C755F263BE6072054C0B26CC46962111/) |
| 318 | Gamma Velorum | 4,5 | 1 | T*, G | 0 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135800482/5FA34BFD2206896E5924FD31E778AE646C454EB2/) |
| 381 | Beta Sextantis | 1,3,4 | 1 | M, T | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135798324/FEDD83C58C55E1E53C07FA7355160CC944B7EE12/) |
| 382 | Zeta Chamaeleontis | 1,4,5 | 1 | S, T | 1 / 0 / 0 | [face](https://images.steamusercontent.com/ugc/1267149075135793543/60EB3911D8EAB7CD27E59B52DC14239DC903E2C4/) |

Second edge audit: all 360 edge positions inspected in enlarged strips (`/tmp/edge-sheet-{0,10,20,30,40,50}.jpg`). This identified an initial 104 edge transcription error and confirmed 311 has three circles despite the spreadsheet listing two. Regression assertions failed first, then both were corrected. All five tests pass again.
