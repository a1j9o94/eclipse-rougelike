import {chooseAiCommand,evaluateAiCommand,type AiChoice} from './ai';
import {generateAiCandidates} from './aiCandidates';
import {AI_BUDGETS,type AiDifficulty} from './aiConfig';
import {sampleAiWorld} from './aiWorld';
import {evaluateStrategicPosition} from './aiEvaluation';
import {strategicCommandAdjustment} from './aiStrategy';
import {processGameCommand} from './engine';
import {getPlayerView} from './protocol';
import type {GameCommand,GameState,PlayerView} from './types';
import type {LegalCommandCandidate} from './legal';

export interface AiSearchOptions {difficulty:AiDifficulty;budgetMs?:number;maxNodes?:number;now?:()=>number}
export interface AiSearchDiagnostics {nodes:number;completedDepth:number;opponentCommands:number;elapsedMs:number;cutoff:boolean;principalVariation:GameCommand[];samples:number}
export interface StrategicAiChoice extends AiChoice {search:AiSearchDiagnostics}
interface Node {worlds:GameState[];first:AiChoice;value:number;path:GameCommand[]}
const actionType=(command:GameCommand)=>command.type==='trade-and-act'?command.action.type:command.type;
const isStrategic=(command:GameCommand)=>['explore','research','upgrade','build','move','influence','pass'].includes(actionType(command));

/** Receding-horizon search. Its ONLY input is the same allowlisted view a human receives.
 * Fixed work limits make tests reproducible; the server additionally supplies a deadline.
 * Individual commands remain authoritative and are revalidated before any persisted change.
 */
export function chooseStrategicAiCommand(view:PlayerView,simulationSeed:number,options:AiSearchOptions):StrategicAiChoice|null {
 const limits=AI_BUDGETS[options.difficulty],clock=options.now??(()=>performance.now());
 const started=clock(),budget=Math.max(0,Math.min(limits.budgetMs,options.budgetMs??limits.budgetMs));
 const maxNodes=Math.max(0,Math.min(limits.maxNodes,Math.floor(options.maxNodes??limits.maxNodes)));
 const fallback=chooseAiCommand(view,simulationSeed);if(!fallback)return null;
 const search:AiSearchDiagnostics={nodes:0,completedDepth:0,opponentCommands:0,elapsedMs:0,cutoff:false,principalVariation:[],samples:0};
 const expired=()=>clock()-started>=budget;
 const finish=(choice:AiChoice):StrategicAiChoice=>({...choice,search:{...search,elapsedMs:Math.max(0,clock()-started)}});
 if(!maxNodes||expired()||view.phase!=='action'||view.pendingDecision||view.actionProgress||view.waitingFor||view.activeSeatId!==view.viewerSeatId||!isStrategic(fallback.command))return finish(fallback);
 const actor=view.viewerSeatId,beamWidth=options.difficulty==='expert'?4:2;
 const samples=options.difficulty==='expert'?3:2;
 const roots=Array.from({length:samples},(_,i)=>sampleAiWorld(view,(simulationSeed+Math.imul(i+1,2654435761))>>>0));
 search.samples=samples;
 let best=fallback;
 let frontier:Node[]=[{worlds:roots,first:fallback,value:evaluateStrategicPosition(view,actor),path:[]}];
 // Cache equal observable decision points, bounded by this invocation's work limit.
 const policyCache=new Map<string,GameCommand>();
 let policyCacheCharacters=0;
 function policy(state:GameState,owner:string):GameCommand|null {
  const visible=getPlayerView(state,owner);if(!visible)return null;
  const key=JSON.stringify(visible),cached=policyCache.get(key);if(cached)return cached;
  let policySeed=simulationSeed>>>0;
  for(let i=0;i<key.length;i++)policySeed=Math.imul(policySeed^key.charCodeAt(i),16777619)>>>0;
  const choice=chooseAiCommand(visible,policySeed);
  if(choice&&policyCache.size<128&&policyCacheCharacters+key.length<1_000_000){policyCache.set(key,choice.command);policyCacheCharacters+=key.length;}
  return choice?.command??null;
 }
 function advance(world:GameState,command:GameCommand):GameState|null {
  if(expired())return null;
  const first=processGameCommand(world,actor,command);if(!first.ok)return null;
  let state=first.state,left=false;
  const visited=new Set<string>();
  // Resolve this action's choices/activations, then real opponent turns. Chance events
  // use the hypothetical engine RNG; each policy gets its own filtered information.
  for(let step=0;step<160;step++){
   if(state.phase==='finished')return state;
   const owner=state.pendingDecision?.owner??state.activeSeatId;
   if(!owner)return state;
   if(owner!==actor||state.phase!=='action')left=true;
   if(left&&owner===actor&&state.phase==='action'&&!state.pendingDecision&&!state.engine?.action)return state;
   if(expired())return null;
   const signature=JSON.stringify([state.round,state.phase,state.activeSeatId,state.pendingDecision,state.seats,state.sectors,state.ships,state.engine?.action]);
   let next=policy(state,owner);
   if(visited.has(signature)){
    // A cycling policy must not produce an artificially favorable stalled projection.
    // End a legal activation chain or pass a normal turn in the hypothetical rollout.
    next=state.pendingDecision?null:state.engine?.action?{type:'end-action'}:state.phase==='action'?{type:'pass'}:null;
   }
   visited.add(signature);
   if(!next)return null;
   const result=processGameCommand(state,owner,next);
   if(!result.ok)return null;
   if(owner!==actor)search.opponentCommands++;
   state=result.state;
  }
  return null;
 }
 function shortlist(visible:PlayerView,depth:number):AiChoice[]{
  const ranked=generateAiCandidates(visible).filter(c=>isStrategic(c.command)).map(c=>({...c,evaluation:evaluateAiCommand(visible,c.command)+strategicCommandAdjustment(visible,c.command)})).sort((a,b)=>b.evaluation-a.evaluation);
  const chosen:AiChoice[]=[],families=new Set<string>(),keys=new Set<string>();
  const add=(candidate:AiChoice)=>{const key=JSON.stringify(candidate.command);if(!keys.has(key)){keys.add(key);chosen.push(candidate);}};
  // Include the combat-aware fast policy even when cheap ranking disagrees.
  const fast=chooseAiCommand(visible,simulationSeed);if(fast&&isStrategic(fast.command))add({...fast,evaluation:fast.evaluation+strategicCommandAdjustment(visible,fast.command)});
  for(const candidate of ranked)if(!families.has(actionType(candidate.command))){families.add(actionType(candidate.command));add(candidate);}
  for(const candidate of ranked){if(chosen.length>=8)break;add(candidate);}
  return chosen.slice(0,depth===1?8:options.difficulty==='expert'?5:3);
 }
 outer:for(let depth=1;depth<=limits.depth;depth++){
  const expanded:Node[]=[];
  if(frontier.every(node=>node.worlds.every(s=>s.phase==='finished')))break;
  for(const node of frontier){
   if(node.worlds.every(s=>s.phase==='finished')){expanded.push(node);continue;}
   const representative=getPlayerView(node.worlds[0],actor)!;
   if(representative.phase!=='action'||representative.pendingDecision||representative.actionProgress)continue;
   const choices=shortlist(representative,depth);
   for(const candidate of choices){
    if(search.nodes>=maxNodes||expired()){search.cutoff=true;break;}
    search.nodes++;
    const worlds:GameState[]=[];
    for(const world of node.worlds){
     if(world.phase==='finished'){worlds.push(world);continue;}
     let next=advance(world,candidate.command);
     // After a prior hidden draw, future choices may legitimately differ by observed
     // outcome. Condition continuation on that world's seat view, not its hidden deck.
     if(!next&&depth>1&&!expired()){const alternate=policy(world,actor);if(alternate)next=advance(world,alternate);}
     if(!next)break;
     worlds.push(next);
    }
    if(worlds.length!==samples)continue;
    const values=worlds.map(world=>evaluateStrategicPosition(getPlayerView(world,actor)!,actor));
    const first=depth===1?candidate:node.first;
    // A small bounded prior keeps an uncertain short rollout from overriding a
    // well-supported tactical/economic choice for a negligible projected gain.
    const policyPrior=Math.max(-20,Math.min(20,first.evaluation-fallback.evaluation))*.12;
    const value=values.reduce((a,b)=>a+b,0)/samples*.85+Math.min(...values)*.15+policyPrior;
    expanded.push({worlds,first,value,path:[...node.path,candidate.command]});
   }
   if(search.cutoff)break;
  }
  if(!expanded.length)break;
  expanded.sort((a,b)=>b.value-a.value||b.first.evaluation-a.first.evaluation);
  // Results are compared at equal completed horizons; cutoff never uses a half rollout.
  const leader=expanded[0];
  // Do not replace a fully compared horizon with the first, partially explored
  // branch of the next one. At depth one an anytime result beats no result.
  if(!search.cutoff||search.completedDepth===0){
   best={...leader.first,evaluation:leader.value};search.principalVariation=leader.path;
   if(!search.cutoff)search.completedDepth=Math.min(depth,leader.path.length);
  }
  frontier=expanded.slice(0,beamWidth);
  if(search.cutoff)break outer;
 }
 if(expired())search.cutoff=true;
 return finish(best);
}

/** Public candidate type retained here for downstream instrumentation without engine state. */
export type AiSearchCandidate=LegalCommandCandidate;
