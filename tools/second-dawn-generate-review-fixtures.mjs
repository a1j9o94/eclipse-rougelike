import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {projectHistoryEntry}=await server.ssrLoadModule('/shared/eclipse/history.ts');
 const publicHistory=[];
 const {createGame}=await server.ssrLoadModule('/shared/eclipse/setup.ts');
 const {processGameCommand}=await server.ssrLoadModule('/shared/eclipse/engine.ts');
 const {getPlayerView}=await server.ssrLoadModule('/shared/eclipse/protocol.ts');
 const {legalCommands}=await server.ssrLoadModule('/shared/eclipse/legal.ts');
 const {chooseAiCommand}=await server.ssrLoadModule('/shared/eclipse/ai.ts');
 const {movableShipCount}=await server.ssrLoadModule('/shared/eclipse/geometry.ts');
 const {movementAbilities}=await server.ssrLoadModule('/shared/eclipse/rulesState.ts');
 const {sectorDefinition}=await server.ssrLoadModule('/shared/eclipse/sectors.ts');
 const {BASE_FACTIONS}=await server.ssrLoadModule('/shared/eclipse/catalog.ts');
 let state=createGame({seed:106,warpPortals:true,seats:BASE_FACTIONS.slice(0,6).map((f,i)=>({id:`p${i}`,faction:f.id,controller:'ai'}))});
 const fixtures={opening:structuredClone(state)};
 let steps=0;
 const ancientExamples={};
 while(state.phase!=='finished'&&steps<6000){
  const actor=state.pendingDecision?.owner??state.activeSeatId;
  const pending=state.pendingDecision;
  if(!fixtures['exploration-ancients']&&pending?.kind==='exploration'&&pending.drawnTileIds.some(id=>(sectorDefinition(Number(id))?.ancients??0)>0)){
   fixtures['exploration-ancients']=structuredClone(state);
   ancientExamples['exploration-ancients']={seed:106,commandIndex:steps,round:state.round,decision:pending.kind,owner:pending.owner,position:pending.position,drawnSectors:pending.drawnTileIds.map(id=>({tileId:id,ancients:sectorDefinition(Number(id)).ancients}))};
  }
  if(!fixtures.ancients&&!pending&&state.phase==='action'&&state.ships.some(ship=>ship.type==='ancient')){
   fixtures.ancients=structuredClone(state);
   ancientExamples.ancients={seed:106,commandIndex:steps,round:state.round,sectors:state.sectors.filter(sector=>state.ships.some(ship=>ship.type==='ancient'&&ship.sectorId===sector.id)).map(sector=>({sectorId:sector.id,tileId:sector.tileId,ancients:state.ships.filter(ship=>ship.type==='ancient'&&ship.sectorId===sector.id).length}))};
  }
  const battle=state.engine?.battle;
  if(!fixtures['ancient-combat']&&battle&&[battle.attacker,battle.defender].includes('ancient')&&pending&&state.seats.some(seat=>seat.id===pending.owner)&&state.ships.some(ship=>ship.type==='ancient'&&ship.sectorId===battle.sectorId)){
   fixtures['ancient-combat']=structuredClone(state);
   ancientExamples['ancient-combat']={seed:106,commandIndex:steps,round:state.round,sectorId:battle.sectorId,tileId:state.sectors.find(sector=>sector.id===battle.sectorId).tileId,attacker:battle.attacker,defender:battle.defender,decision:pending.kind,owner:pending.owner,ships:state.ships.filter(ship=>ship.sectorId===battle.sectorId).map(ship=>({owner:ship.owner,type:ship.type,damage:ship.damage}))};
  }
  for (const kind of ['exploration','discovery','control','bankruptcy','portal-placement','free-technology','population-return','resource-reward','reputation','diplomacy','initiative-order','bombardment','combat-split-damage']) if (!fixtures[kind] && state.pendingDecision?.kind === kind) fixtures[kind] = structuredClone(state);
  if(!fixtures.midgame&&state.round>=4&&!state.pendingDecision)fixtures.midgame=structuredClone(state);
  if(!fixtures.late&&state.round>=8&&!state.pendingDecision)fixtures.late=structuredClone(state);
  if(!fixtures.retreat&&state.pendingDecision?.kind==='combat-turn'&&state.pendingDecision.destinationIds.length)fixtures.retreat=structuredClone(state);
  if(!fixtures.pinned&&state.phase==='action'&&!state.pendingDecision&&state.seats.some(seat=>state.ships.some(ship=>ship.owner===seat.id&&ship.type!=='starbase'&&movableShipCount(seat.id,ship.sectorId,state.ships.map(s=>({id:s.id,owner:s.owner,sectorId:s.sectorId,kind:s.type,movement:0})),movementAbilities(seat))===0)))fixtures.pinned=structuredClone(state);
  if(!fixtures.combat&&state.pendingDecision?.kind==='combat-allocation')fixtures.combat=structuredClone(state);
  const choices=legalCommands(getPlayerView(state,actor));
  for(const type of ['research','build','move','colonize','trade','pass','end-action','finish-upkeep']){
   const key=`workflow-${type}`;
   if(!fixtures[key]&&choices.some(c=>c.command.type===type))fixtures[key]=structuredClone(state);
  }
  if(!fixtures['workflow-influence']&&choices.some(c=>c.command.type==='influence'&&c.command.removeSectorIds.length&&c.command.addSectorIds.length))fixtures['workflow-influence']=structuredClone(state);
  if(!fixtures['workflow-diplomacy']&&state.pendingDecision?.kind==='diplomacy-window'&&state.pendingDecision.eligibleSeatIds.length)fixtures['workflow-diplomacy']=structuredClone(state);
  const selected=chooseAiCommand(getPlayerView(state,actor),steps+123);
  if(!selected)throw new Error(`No review candidate at ${steps}`);
  const result=processGameCommand(state,actor,selected.command);
  if(!result.ok)throw new Error(`Review step ${steps}: ${result.error.message}`);
  // Pure rules leave transport revisions unchanged; advance the review journal once per accepted command.
  result.state.revision=state.revision+1;
  const commandId=`review-${steps}`;
  publicHistory.push(projectHistoryEntry({actor,request:{commandId,expectedRevision:state.revision,command:selected.command},receipt:{commandId,revision:result.state.revision,eventCount:result.events.length},events:result.events},state.seats,state.round,state));
  state=result.state;steps++;
 }
 if(state.phase!=='finished')throw new Error('Review game did not finish.');
 fixtures.scoring=structuredClone(state);
 for(const key of ['exploration-ancients','ancients','ancient-combat'])if(!fixtures[key])throw new Error(`Seed 106 did not produce required ${key}; existing fixtures were not overwritten.`);
 if(!fixtures.combat)throw new Error('Review seed contained no manual combat allocation.');
 const pinnedState=fixtures.pinned;
 const pinnedSeat=pinnedState.seats.find(seat=>pinnedState.ships.some(ship=>ship.owner===seat.id&&ship.type!=='starbase'&&movableShipCount(seat.id,ship.sectorId,pinnedState.ships.map(s=>({id:s.id,owner:s.owner,sectorId:s.sectorId,kind:s.type,movement:0})),movementAbilities(seat))===0));
 const pinnedShip=pinnedState.ships.find(ship=>ship.owner===pinnedSeat.id&&ship.type!=='starbase'&&movableShipCount(pinnedSeat.id,ship.sectorId,pinnedState.ships.map(s=>({id:s.id,owner:s.owner,sectorId:s.sectorId,kind:s.type,movement:0})),movementAbilities(pinnedSeat))===0);
 await writeFile('coding_agents/second_dawn_review_fixture_targets.json',JSON.stringify({seed:106,engineCommands:steps,pinnedSector:pinnedState.sectors.find(s=>s.id===pinnedShip.sectorId).tileId,pinnedFaction:pinnedSeat.faction,ancientExamples},null,2));
 await writeFile('src/second-dawn-game/reviewFixtures.json',JSON.stringify(fixtures));
 const reviewHistory=Object.fromEntries(Object.entries(fixtures).map(([key,fixture])=>[key,publicHistory.filter(entry=>entry.revision<=fixture.revision).slice(-100).reverse()]));
 for(const [key,entries] of Object.entries(reviewHistory)){
  if(new Set(entries.map(entry=>entry.revision)).size!==entries.length||entries.some(entry=>entry.revision>fixtures[key].revision)||(fixtures[key].revision>0&&entries[0]?.revision!==fixtures[key].revision))throw Error(`Invalid review history for ${key}`);
 }
 await writeFile('src/second-dawn-game/reviewHistory.json',JSON.stringify(reviewHistory));
 console.log(`Generated ${Object.keys(fixtures).length} isolated engine-state fixtures from ${steps} actual engine commands.`);
}finally{await server.close();}
