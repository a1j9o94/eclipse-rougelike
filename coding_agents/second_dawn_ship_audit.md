# Second Dawn ship audit

Outcome: players can inspect, upgrade, and fight with the actual base-box ship blueprints and ship-part values. Acceptance: all 39 ship parts, all base faction blueprint grids, all nine neutral blueprint tiles, legal overlay semantics and source-backed stats. No existing repository ship rules were used as evidence.

## Evidence and scope

Primary rules: [publisher-linked rulebook](https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=1), pp. 4, 7, 9, 11–12, 18–19, 26–29. [Dized ship-part rules](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/yRliUk6OSEmF4SxWuOAv3w/ship-part-tiles) independently corroborate symbols and totals. p12 prints the upgrade sequence and drive/energy/research restrictions; p9 specifies ancient removal and Muon placement outside the grid.

Supplemental visual evidence: physical Second Dawn component scans distributed by [Wyko's Tabletop Simulator mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2414358241), credited there to Zee Germans. Individual scan links below were rendered and visually read. These are community-distributed component scans, not publisher-hosted files. The publisher rulebook corroborates component identities, visible values and faction exceptions, but does not expose every part value unobscured. No claim that every number was independently publisher-verified. No TTS rule scripts, expansion values, or first-edition implementations were imported. TTS also contains expansions; inclusion was restricted to the 39 part identities and base factions confirmed by the publisher catalog. Artwork was downloaded only to `/tmp` for inspection, not shipped in the application.

The original text-layer publisher PDF renders overlapping white artifacts; fine icon checks used the raster publisher PDF above. Community scans resolve occluded part faces. Earlier tentative Hydran starbase initiative **4 was incorrect**: the printed base initiative is **3**, as independently visible in the unobstructed scan. Orion has 4 and Planta 2.

## Rules decisions

- Grid arrays hold overlays. `null` reveals the underlying printed part; it does not erase it. `blueprintDefinition.preprinted` supplies defaults; permanent outside-grid stats cannot be overwritten.
- Slot indices use stable catalog order, not coordinates on the physical species board. This has no rules consequence because slots have no adjacency restrictions.
- Mobile blueprints require at least one drive; starbases cannot have a drive. All ship stats accumulate; energy consumption cannot exceed production.
- Only installed overlays require their corresponding technology, not preprinted parts. Gluon does not authorize positron, etc. (p30 FAQ).
- Each ancient part is a unique discovery component. The validation budget includes ancient parts currently on the blueprint being edited, excludes those assigned to other blueprints, and caps an identity at one. The command processor must enforce conservation across all blueprints, remove discarded ancient parts from the game, and count upgrade activations.
- Muon Source provides 2 energy and 1 initiative outside the grid, and cannot subsequently be removed/replaced under the outside-grid rule. `previous` enables this transition check.
- Hull is damage absorption, not hit points: destruction occurs when damage exceeds hull, so HP is hull+1.
- Weapons retain missile/cannon kind and color; missiles fire once before engagement rounds. Antimatter Splitter applies to antimatter **cannon** damage, not red missiles.
- Plasma Missile consumes **1** energy in Second Dawn. Transition Drive moves **3**, consumes **0**, grants **0** initiative. Nonlinear Drive moves **2** and **produces 2** energy.
- Standard part tiles are unlimited (p7). Ancient parts remain finite.

## Faction grids

Normal grids: interceptor 4 slots (ion cannon, nuclear source, nuclear drive, empty); cruiser 6 (electron computer, ion cannon, hull, nuclear source, nuclear drive, empty); dreadnought 8 (electron computer, two ion cannons, two hulls, nuclear source, nuclear drive, empty); starbase 5 (electron computer, ion cannon, two hulls, empty), with permanent 3 energy. Normal permanent initiative: 2 / 1 / 0 / 3.

Hydran, Draco, Mechanema and all Terrans use normal grids. Starting researched tech does not automatically replace their printed default parts. Eridani uses normal grids with +1 permanent energy on each mobile blueprint. Orion replaces the empty printed slot of **every** blueprint with Gauss Shield, adds +1 initiative on every blueprint, and has permanent energy 1 / 2 / 3 / 3.

Planta: 3 / 5 / 7 / 4 slots; no printed empty interceptor slot, no printed electron computer in cruiser/dreadnought, no empty starbase slot. The starbase retains its printed electron computer, so its total starting computer is +2. Permanent computer +1 every blueprint; permanent energy 2 / 2 / 2 / 5; permanent initiative 0 / 0 / 0 / 2.

## Exact scan references

### Species boards

- [Terran Federation](https://images.steamusercontent.com/ugc/1267149075135732708/0F2312F534ECA7ADA827FDCF3917318F655F3EC6/)
- [Planta](https://images.steamusercontent.com/ugc/1267149075135734648/803FABD46DBCB6A18C2A393F920EEF9AF61B8E59/)
- [Hydran Progress](https://images.steamusercontent.com/ugc/1267149075135735596/C9D3320FE9106B1C644CD0D2FEBADAFB50578DE2/)
- [Eridani Empire](https://images.steamusercontent.com/ugc/1267149075135736437/5936C7952D10C08F4DF19C14CC383884B3395A36/)
- [Descendants of Draco](https://images.steamusercontent.com/ugc/1267149075135737354/E5C0B00CD2CECC2EEAAB5DAC959F4CC38241A4FD/)
- [Orion Hegemony](https://images.steamusercontent.com/ugc/1267149075135750497/65B5C60C4B8CA9466B056A5DCA4D121CF7C8CB9E/)
- [Mechanema](https://images.steamusercontent.com/ugc/1267149075135751725/0E895EB904EC2416AD756AF44659B6749F348487/)

### Standard and researched parts

- [Ion Cannon](https://images.steamusercontent.com/ugc/1267149075135755317/951CEBBAEEAA63D90049D9A73F62CEA3FCC1F282/)
- [Nuclear Source](https://images.steamusercontent.com/ugc/1267149075135752446/83AE027FDD7696BF23B64C24DC040467AACF399B/)
- [Nuclear Drive](https://images.steamusercontent.com/ugc/1267149075135752630/845FEC656748EDBC253AC9AD10D71CE9016ACCB5/)
- [Hull](https://images.steamusercontent.com/ugc/1267149075135752117/AFE9DC7F5AC5387DB22CFAF3F02B2C7D7B62F920/)
- [Electron Computer](https://images.steamusercontent.com/ugc/1267149075135752278/BC97CD78A231B688D88DC363A13031BB86A95EC7/)
- [Plasma Cannon](https://images.steamusercontent.com/ugc/1267149075135750280/5AB0D8EB4081567D907D5D227FD75037A050C552/)
- [Soliton Cannon](https://images.steamusercontent.com/ugc/1267149075135741408/0243040F923AB1C782E52A712DCF5A01F7FC70B4/)
- [Antimatter Cannon](https://images.steamusercontent.com/ugc/1267149075135753492/762FC7AF3C8EFB9945C53840E58CB830541DBB51/)
- [Plasma Missile](https://images.steamusercontent.com/ugc/1267149075135751452/75EF7822A87C594EF695420EFB57627B85ED6DA5/)
- [Flux Missile](https://images.steamusercontent.com/ugc/1267149075135754020/34F96AAD2AA16D2F4B1B3A6346B103D9029D2F78/)
- [Fusion Drive](https://images.steamusercontent.com/ugc/1267149075135748274/15A5426B74812DF0EF91E34292C8EC7A61704BD3/)
- [Tachyon Drive](https://images.steamusercontent.com/ugc/1267149075135753328/4D1002BB741D2386A9CF578EF73738767FDAC135/)
- [Transition Drive](https://images.steamusercontent.com/ugc/1267149075135754226/A61253FF44B983FD727AD7FCB70055004945250F/)
- [Fusion Source](https://images.steamusercontent.com/ugc/1267149075135746056/2DAB93B1CDFC6CBE0C088DD4BDF184EC3E21ED4B/)
- [Tachyon Source](https://images.steamusercontent.com/ugc/1267149075135753171/31C6371C7BBC8A39BC3BA4071D1E572F481622AF/)
- [Zero-Point Source](https://images.steamusercontent.com/ugc/1267149075135754366/BBEEED79C383C633C3A38ECEAC7DE63DEF1D5B5A/)
- [Positron Computer](https://images.steamusercontent.com/ugc/1267149075135745540/34569ED4474807B9D5062305EE8F2E97DEA9D07A/)
- [Gluon Computer](https://images.steamusercontent.com/ugc/1267149075135752997/9A18ED3F1C1206C1716B6A4D292878E1E86A143C/)
- [Gauss Shield](https://images.steamusercontent.com/ugc/1267149075135753675/80B50DDC2701884802561589D02F9C26A444F167/)
- [Phase Shield](https://images.steamusercontent.com/ugc/1267149075135754858/BF8BF29433BBEDFFFE7DE6803661ED03BB5195B0/)
- [Absorption Shield](https://images.steamusercontent.com/ugc/1267149075135754698/270357D0A44D11D4676F49BE7628C40E11A7230B/)
- [Improved Hull](https://images.steamusercontent.com/ugc/1267149075135743359/8F65D492B1E7D8BA9FC4FBFF2628B8056CC139E6/)
- [Conifold Field](https://images.steamusercontent.com/ugc/1267149075135752801/D737C444CB4FA39EDCDB939C3890FE91D5CC22E1/)
- [Sentient Hull](https://images.steamusercontent.com/ugc/1267149075135754524/3305822C0A36AF761DB111D77D186C255D420E0A/)

### Ancient parts

- [Ion Disruptor](https://images.steamusercontent.com/ugc/1267149075135691425/8EF250A6707B2FDCE4783FA5BC2D3734C8112916/)
- [Ion Turret](https://images.steamusercontent.com/ugc/1267149075135686872/6E6AC643C401D8B7857CF9A32D5B8110139838AF/)
- [Plasma Turret](https://images.steamusercontent.com/ugc/1267149075135675338/09599081D9AA44FA1131916A7F661FB1B60CF36F/)
- [Soliton Charger](https://images.steamusercontent.com/ugc/1267149075135678677/D61B38DE17EF14D170C8C6C034544B0E51EF67EF/)
- [Ion Missile](https://images.steamusercontent.com/ugc/1267149075135690739/C34084A2AE809E7C5F165079C870FEB7F2CA3094/)
- [Axion Computer](https://images.steamusercontent.com/ugc/1267149075135685775/41CC6A743F1E7F215C093D1561751406E02EE2A3/)
- [Antimatter Missile](https://images.steamusercontent.com/ugc/1267149075135692138/5ED91AD625B7BA35312E29F5C9644D610EA4E637/)
- [Flux Shield](https://images.steamusercontent.com/ugc/1267149075135679936/152442807A774E70273596EA8CA894957D278F38/)
- [Conformal Drive](https://images.steamusercontent.com/ugc/1267149075135693593/2C5B8FF5B58921F24FAB3FC266FB7305E1393B64/)
- [Nonlinear Drive](https://images.steamusercontent.com/ugc/1267149075135696421/A4C7DD41A7192314B08F705062551DCB4E9A3F39/)
- [Shard Hull](https://images.steamusercontent.com/ugc/1267149075135682721/4FDF34B11332B69A8E5C15551DB3922B6705B886/)
- [Hypergrid Source](https://images.steamusercontent.com/ugc/1267149075135683299/84E15FF9C377226A4754807D1605D21915638638/)
- [Inversion Shield](https://images.steamusercontent.com/ugc/1267149075135692773/66E98F590A9938406BC56A7360C1EB2A543ABFD0/)
- [Soliton Missile](https://images.steamusercontent.com/ugc/1267149075135689701/CE7ADC6E5AE4C5A019D6B0F83402DADF0E83DBB1/)
- [Muon Source](https://images.steamusercontent.com/ugc/1267149075135687648/2A2B955CFAB9313C0DAA6904546B072A486917FF/)

### Neutral blueprints

- [GCDS](https://images.steamusercontent.com/ugc/1267149075135606311/1CCB957B93BEBD324A7AE18113C77DD76AC9934E/)
- [Guardian](https://images.steamusercontent.com/ugc/1267149075135618892/2E8B1EC497A40190CD5724FE2A68521792C3CF40/)
- [Ancient](https://images.steamusercontent.com/ugc/1267149075135618712/F1E66BC907F805054FFE58432E8C08A4E7300938/)
- [Advanced GCDS](https://images.steamusercontent.com/ugc/1267149075135607313/0D7676C5D38F627FB672FB28DD6670F5E08ACF81/)
- [Advanced GCDS](https://images.steamusercontent.com/ugc/1267149075135608356/2965AB26205340CD66280D29C1BE2F6EF62524B5/)
- [Advanced Guardian](https://images.steamusercontent.com/ugc/1267149075135608755/2FC0F174782D2038AF7FC4B99E15ED4913B23B56/)
- [Advanced Guardian](https://images.steamusercontent.com/ugc/1267149075135607977/DDE5DAC915ACC322DFC228FCEDE0BE6B9D5D1960/)
- [Advanced Ancient](https://images.steamusercontent.com/ugc/1267149075135609593/3A60DEEA0EE58B398EB7D9C983F47458E330941F/)
- [Advanced Ancient](https://images.steamusercontent.com/ugc/1267149075135609165/C31794E9753FBD0E7063D05B240096A4420AAFDF/)

Standard neutrals: Ancient initiative2,computer1,hull1,two yellow cannons; Guardian initiative3,computer2,hull2,three yellow cannons; GCDS initiative0,computer2,hull7,four yellow cannons. Two advanced tiles per neutral type are separately cataloged, not randomly combined parts.

## Validation and remaining integration

Initial eight behavioral tests were written first and failed because the modules did not exist. Implementation made them pass. Two additional regression cases cover Eridani's exact energy budget and neutral missile/cannon separation. Focused suite: 10 tests passing. Focused ESLint: clean. Parent owns repository-wide lint/build gates and integration.

The pure catalog and validation slice is complete. Engine integration must use the overlay model, conserve ancient parts across the fleet, enforce installation/removal activation counts, resolve ancient part loss, choose/persist neutral tile variants at setup, and use derived stats for every live ship. No part values or faction blueprint numbers remain guessed/unresolved in this slice. Supplemental scan provenance remains visible for independent review.

## Immediate ancient-part acquisition

`ancientAcquisition.ts` implements publisher p9's immediate free installation versus storage. The persisted `ancient-part` choice identifies the awarded part; null blueprint stores it. A supplied blueprint may change exactly one grid slot to the awarded part, or append Muon outside the grid. It cannot relocate another part, change another blueprint, remove permanent outside parts, bypass energy/drive restrictions, or duplicate a unique ancient tile. Replaced ancient overlays are removed without returning to storage. No action/influence activation is consumed. The root command processor owns clearing the pending decision, journal emission and queue continuation.

Five behavioral tests were written before implementation and failed for the missing module; all five now pass. They cover free valid installation, storage, atomic invalid energy/unrelated edits, prohibited ancient relocation, replacement removal and Muon permanence. Focused ESLint is clean. Type additions are limited to the ancient-part decision/response union members.

## Upgrade activation ordering

`upgradePlan.ts` validates the order of final blueprint edits instead of assuming a legal final grid implies legal intermediate activations. It searches at most nine physical slots (eight grid slots plus outside Muon), allowing any chosen changed overlays to be returned before each installation, and validates energy/drive/tech restrictions after every completed installation. It never invents temporary part installations or extra upgrades. Existing ancient parts cannot be relocated; outside-grid parts remain permanent. The returned installation count is combined across blueprints by the command processor. Four tests failed before the helper existed and now pass; they cover source-before-cannon ordering, removal-before-drive ordering, removal-only upgrades including eight free removals, ancient relocation and nonmutating search.
