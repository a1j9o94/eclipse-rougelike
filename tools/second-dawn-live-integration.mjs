import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
const client=new ConvexHttpClient('http://127.0.0.1:3210');
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const results=[];
await mkdir('coding_agents/second_dawn_live',{recursive:true});
try{
 const {chooseAiCommand}=await server.ssrLoadModule('/shared/eclipse/ai.ts');
 for(const aiCount of [2,5]){
  const guest=await client.action(api.eclipseGuests.createGuestSession,{});
  const {matchId}=await client.mutation(api.eclipseMatches.createMatch,{...guest,aiCount});
  let commands=0,polls=0,duplicates=0;const types={},decisions={};const start=Date.now();
  while(commands<2000&&Date.now()-start<240000){
   const view=await client.query(api.eclipseMatches.getMatchView,{...guest,matchId});
   if(view.aiStatus?.status==='failed')throw Error(`AI failure: ${view.aiStatus.error}`);
   if(view.phase==='finished'){results.push({players:aiCount+1,matchId,humanController:'Agent test controller using public view',humanCommands:commands,finalRevision:view.revision,aiAndOtherCommands:view.revision-commands,polls,duplicates,actionTypes:types,decisionTypes:decisions,scores:view.scores,elapsedMs:Date.now()-start});break;}
   if(view.pendingDecision?.owner!==view.viewerSeatId&&view.activeSeatId!==view.viewerSeatId||view.waitingFor&&view.waitingFor.owner!==view.viewerSeatId){await new Promise(resolve=>setTimeout(resolve,30));polls++;continue;}
   const candidate=chooseAiCommand(view,commands+887);
   if(!candidate)throw Error(`Human has no candidate in ${view.phase}`);
   const request={...guest,matchId,commandId:`integration-${commands}`,expectedRevision:view.revision,command:candidate.command};
   const response=await client.mutation(api.eclipseMatches.submitCommand,request);
   if(!response.ok)throw Error(`Human command ${candidate.command.type}: ${response.error.message}`);
   if(commands===0){const duplicate=await client.mutation(api.eclipseMatches.submitCommand,request);if(!duplicate.ok||!duplicate.duplicate||duplicate.receipt.revision!==response.receipt.revision)throw Error('Duplicate receipt mismatch');duplicates++;}
   types[candidate.command.type]=(types[candidate.command.type]??0)+1;
   if(candidate.command.type==='resolve')decisions[candidate.command.choice.kind]=(decisions[candidate.command.choice.kind]??0)+1;
   commands++;
   if(commands%50===0)console.log(`${aiCount+1} seats: ${commands} human commands, revision ${view.revision}, round ${view.round}`);
  }
  if(results.length!==([2,5].indexOf(aiCount)+1))throw Error('Live match deadline exceeded');
  await writeFile('coding_agents/second_dawn_live/results.json',JSON.stringify({backend:'isolated anonymous local Convex',results},null,2));
  console.log(`Finished ${aiCount+1}-seat live authoritative match.`);
 }
}finally{await server.close();}
