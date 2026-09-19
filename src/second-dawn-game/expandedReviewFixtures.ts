import {createGame} from '../../shared/eclipse/setup';
import {legalCommands} from '../../shared/eclipse/legal';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {processGameCommand} from '../../shared/eclipse/engine';
import type {FactionId,CivilizationColor} from '../../shared/eclipse/catalog';
import type {GameState} from '../../shared/eclipse/types';
const factions=['rho-indi','magellan','midas','ragnarok'] as const;
const colors:CivilizationColor[]=['green','red','blue','yellow'];
/** Deterministic, isolated review games use exactly the same setup and processor as live matches. */
export function expandedReviewFixtures():Record<string,GameState>{
 const fixtures:Record<string,GameState>={};
 function opening(first:FactionId){return createGame({seed:190926,warpPortals:true,factionProfile:'expanded-v1',seats:[first,...factions.filter(f=>f!==first)].map((faction,index)=>({id:`expanded-${index}`,faction,pieceColor:colors[index],controller:'human'}))});}
 for(const faction of factions)fixtures[`faction-${faction}`]=opening(faction);
 let start=opening('ragnarok');start.seats[0].resources.materials=12;
 // Explore through the real rules so the mixed-action demo has somewhere legal to move.
 const owner=start.seats[0].id;
 const explore=legalCommands(getPlayerView(start,owner)!).find(candidate=>candidate.command.type==='explore');
 if(!explore)throw new Error('Ragnarok review needs an exploration frontier.');
 const explored=processGameCommand(start,owner,explore.command);
 if(!explored.ok)throw new Error(explored.error.message);
 start=explored.state;
 for(let step=0;start.pendingDecision&&step<12;step++){
  const actor=start.pendingDecision.owner;
  const choices=legalCommands(getPlayerView(start,actor)!);
  const choice=choices.find(c=>c.command.type==='resolve'&&c.command.choice.kind==='exploration'&&c.command.choice.tileId!==null&&!c.command.choice.drawAnother)??choices.find(c=>c.command.type==='resolve'&&c.command.choice.kind==='discovery'&&c.command.choice.option==='keep')??choices.find(c=>c.command.type==='resolve');
  if(!choice)throw new Error('Ragnarok route needs a resolvable choice.');
  const resolved=processGameCommand(start,actor,choice.command);
  if(!resolved.ok)throw new Error(resolved.error.message);
  start=resolved.state;
 }
 if(start.pendingDecision)throw new Error('Ragnarok route did not finish its choice chain.');
 start.activeSeatId=owner;
 const home=start.sectors.find(sector=>sector.owner===start.seats[0].id)!;
 const build=processGameCommand(start,start.seats[0].id,{type:'build',builds:[{sectorId:home.id,component:'interceptor'}]});
 if(!build.ok)throw new Error(`Ragnarok review setup failed: ${build.error.message}`);
 fixtures['ragnarok-mixed-action']=build.state;
 const midas=opening('midas');midas.seats[0].resources.money=8;midas.seats[0].resources.science=20;
 const research=legalCommands(getPlayerView(midas,midas.seats[0].id)!).find(candidate=>candidate.command.type==='research'&&candidate.command.tileId==='improved-hull')??legalCommands(getPlayerView(midas,midas.seats[0].id)!).find(candidate=>candidate.command.type==='research');
 if(!research)throw new Error('Midas review needs an available research purchase.');
 const researched=processGameCommand(midas,midas.seats[0].id,research.command);
 if(!researched.ok)throw new Error(researched.error.message);
 fixtures['midas-extra-activation']=researched.state;
 return fixtures;
}
