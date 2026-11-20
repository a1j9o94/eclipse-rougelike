import {chooseAiCommand,createAiCommandEvaluator,type AiChoice} from './ai';
import {generateAiCandidates} from './aiCandidates';
import {AI_BUDGETS,type AiDifficulty} from './aiConfig';
import {sampleAiWorld} from './aiWorld';
import {evaluateStrategicPosition} from './aiEvaluation';
import {gameRoundLimit} from './gameRules';
import {processGameCommand} from './engine';
import {getPlayerView} from './protocol';
import type {GameCommand,GameState,PlayerView} from './types';
import type {LegalCommandCandidate} from './legal';

export interface AiSearchOptions {difficulty:AiDifficulty;budgetMs?:number;maxNodes?:number;now?:()=>number}
export interface AiSearchDiagnostics {nodes:number;completedDepth:number;opponentCommands:number;elapsedMs:number;cutoff:boolean;principalVariation:GameCommand[];samples:number}
export interface StrategicAiChoice extends AiChoice {search:AiSearchDiagnostics}
interface Node {worlds:GameState[];first:AiChoice;value:number;path:GameCommand[]}
function actionFamily(command:GameCommand,finalRound:boolean):GameCommand['type'] {
 const type=command.type==='trade-and-act'?command.action.type:command.type;
 if(finalRound&&['research-development','quantum-research','place-shrine','reverse-engineer'].includes(type))return 'research';
 return type;
}

/** Receding-horizon search. Its ONLY input is the same allowlisted view a human receives.
 * Fixed work limits make tests reproducible; the server additionally supplies a deadline.
 * Individual commands remain authoritative and are revalidated before any persisted change.
 */
export function chooseStrategicAiCommand(view:PlayerView,simulationSeed:number,options:AiSearchOptions):StrategicAiChoice|null {
 const limits=AI_BUDGETS[options.difficulty],clock=options.now??(()=>performance.now());
 const started=clock(),budget=Math.max(0,Math.min(limits.budgetMs,options.budgetMs??limits.budgetMs));
 const maxNodes=Math.max(0,Math.min(limits.maxNodes,Math.floor(options.maxNodes??limits.maxNodes)));
 const fallback=chooseAiCommand(view,simulationSeed);if(!fallback)return null;
 const finalRound=view.round>=gameRoundLimit(view);
 const isStrategic=(command:GameCommand)=>['explore','research','upgrade','build','move','influence','pass','buy-minor-species'].includes(actionFamily(command,finalRound));
 const search:AiSearchDiagnostics={nodes:0,completedDepth:0,opponentCommands:0,elapsedMs:0,cutoff:false,principalVariation:[],samples:0};
 const expired=()=>clock()-started>=budget;
 const finish=(choice:AiChoice):StrategicAiChoice=>({...choice,search:{...search,elapsedMs:Math.max(0,clock()-started)}});
 if(options.difficulty==='normal'||view.phase!=='action'||view.pendingDecision||view.actionProgress||view.waitingFor||view.activeSeatId!==view.viewerSeatId||!isStrategic(fallback.command))return finish(fallback);
 // On an ordinary final turn only Influence has independently justified its full
 // cost in the fast policy. Other paid actions need a complete comparison with Pass.
 const unsearchedFinalChoice=(pass?:AiChoice):StrategicAiChoice=>{
  search.cutoff=true;
  if(fallback.command.type==='influence'||fallback.command.type==='pass')return finish(fallback);
  return finish(pass??{command:{type:'pass'},label:'Pass',description:'Pass for this turn.',evaluation:0});
 };
 if(!maxNodes||expired())return finalRound?unsearchedFinalChoice():finish(fallback);
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
 function rollout(initial:GameState,until:'next-turn'|'final-score'):GameState|null {
  let state=initial;
  const visited=new Set<string>();
  for(let step=0;step<160;step++){
   if(state.phase==='finished')return state;
   const owner=state.pendingDecision?.owner??state.activeSeatId;
   if(!owner)return null;
   const ourTurn=owner===actor&&state.phase==='action'&&!state.pendingDecision&&!state.engine?.action;
   // The candidate has already been applied. The engine may skip every opponent's
   // reaction or return here immediately after a free minor-species purchase.
   if(ourTurn&&until==='next-turn')return state;
   if(expired())return null;
   const signature=JSON.stringify([state.round,state.phase,state.activeSeatId,state.pendingDecision,state.seats,state.sectors,state.ships,state.engine?.action]);
   let next:GameCommand|null=ourTurn?{type:'pass'}:policy(state,owner);
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
 function advance(world:GameState,command:GameCommand):GameState|null {
  if(expired())return null;
  const first=processGameCommand(world,actor,command);
  return first.ok?rollout(first.state,'next-turn'):null;
 }
 // Evaluate both alternatives on the same sampled worlds. A partially settled
 // sample is never mixed with real score sheets or accepted as a projected result.
 function positionValue(worlds:GameState[]):number|null {
  const values:number[]=[];
  for(const world of worlds){
   const evaluated=finalRound?rollout(world,'final-score'):world;
   if(!evaluated)return null;
   const visible=getPlayerView(evaluated,actor);
   if(!visible)return null;
   values.push(evaluateStrategicPosition(visible,actor));
  }
  return values.reduce((a,b)=>a+b,0)/samples*.85+Math.min(...values)*.15;
 }
 function shortlist(visible:PlayerView,depth:number,fast=chooseAiCommand(visible,simulationSeed)):AiChoice[]{
  const evaluate=createAiCommandEvaluator(visible);
  const ranked=generateAiCandidates(visible).filter(c=>isStrategic(c.command)).map(c=>({...c,evaluation:evaluate(c.command)})).filter(c=>Number.isFinite(c.evaluation)).sort((a,b)=>b.evaluation-a.evaluation);
  const chosen:AiChoice[]=[],families=new Set<string>(),keys=new Set<string>();
  const add=(candidate:AiChoice)=>{const key=JSON.stringify(candidate.command);if(!keys.has(key)){keys.add(key);chosen.push(candidate);}};
  // Include the combat-aware fast policy even when cheap ranking disagrees.
  if(fast&&isStrategic(fast.command))add(fast);
  if(finalRound&&depth===1){const pass=ranked.find(c=>c.command.type==='pass');if(pass)add(pass);}
  for(const candidate of ranked){
   const family=actionFamily(candidate.command,finalRound);
   if(!families.has(family)){families.add(family);add(candidate);}
  }
  for(const candidate of ranked){if(chosen.length>=8)break;add(candidate);}
  return chosen.slice(0,depth===1?8:options.difficulty==='expert'?5:3);
 }
 const rootChoices=shortlist(view,1,fallback);
 let bestSettledValue=-Infinity;
 if(finalRound){
  const pass=rootChoices.find(choice=>choice.command.type==='pass');
  const baseline=positionValue(roots);
  if(!pass||baseline===null)return unsearchedFinalChoice(pass);
  bestSettledValue=baseline;
  best={...pass,evaluation:baseline};
  search.principalVariation=[pass.command];
 }
 outer:for(let depth=1;depth<=limits.depth;depth++){
  const expanded:Node[]=[];
  if(frontier.every(node=>node.worlds.every(s=>s.phase==='finished')))break;
  for(const node of frontier){
   if(node.worlds.every(s=>s.phase==='finished')){expanded.push(node);continue;}
   const representative=getPlayerView(node.worlds.find(world=>world.phase!=='finished')!,actor);
   if(representative?.phase!=='action'||representative.pendingDecision||representative.actionProgress)continue;
   const choices=depth===1?rootChoices:shortlist(representative,depth);
   for(const candidate of choices){
    // The final-round stopping option was settled before spending the first expansion.
    if(finalRound&&depth===1&&candidate.command.type==='pass')continue;
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
    const projected=positionValue(worlds);
    if(projected===null)continue;
    const first=depth===1?candidate:node.first;
    // A small bounded prior keeps an uncertain short rollout from overriding a
    // well-supported tactical/economic choice for a negligible projected gain.
    const policyPrior=Math.max(-20,Math.min(20,first.evaluation-fallback.evaluation))*.12;
    const value=finalRound?projected:projected+policyPrior;
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
  if(finalRound){
   // Each completed final plan is directly comparable even if another branch
   // times out later. An equal score keeps the shorter plan, including passing.
   if(leader.value>bestSettledValue){
    bestSettledValue=leader.value;
    best={...leader.first,evaluation:leader.value};search.principalVariation=leader.path;
   }
   if(!search.cutoff)search.completedDepth=depth;
  }else if(!search.cutoff||search.completedDepth===0){
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
