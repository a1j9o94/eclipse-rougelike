import {chooseAiCommand,createAiCommandEvaluator,type AiChoice} from './ai';
import {generateAiCandidates} from './aiCandidates';
import {AI_BUDGETS,type AiDifficulty} from './aiConfig';
import {sampleAiWorld} from './aiWorld';
import {finalScoreComparison, forecastFinalScores} from './aiEvaluation';
import {researchTrackVp} from './scoring';
import {gameRoundLimit} from './gameRules';
import {processGameCommand} from './engine';
import {getPlayerView} from './protocol';
import type {GameCommand,GameState,PlayerView} from './types';
import type {LegalCommandCandidate} from './legal';

export interface AiSearchOptions {difficulty:AiDifficulty;budgetMs?:number;maxNodes?:number;now?:()=>number}
interface ExpectedPoints {expectedVp:number;expectedLeaderVp:number}
export interface AiPlanForecast extends ExpectedPoints {
 source:'estimate'|'rollout';
 /** Completed terminal continuations per compared plan. */
 samples:number;
 comparedPlans:number;
 comparedPass:boolean;
}
export interface AiSearchDiagnostics {nodes:number;completedDepth:number;opponentCommands:number;elapsedMs:number;cutoff:boolean;principalVariation:GameCommand[];samples:number;forecast?:AiPlanForecast}
export interface StrategicAiChoice extends AiChoice {search:AiSearchDiagnostics}
interface Node {worlds:GameState[];first:AiChoice;value:number;path:GameCommand[];points?:ExpectedPoints}
function actionFamily(command:GameCommand):GameCommand['type'] {
 const type=command.type==='trade-and-act'?command.action.type:command.type;
 if(['research-development','quantum-research','place-shrine','reverse-engineer'].includes(type))return 'research';
 return type;
}

/** Give immediate scoring moves a place beside infrastructure and fleet options
 * when several legal commands share a family and the beam is narrow. */
function immediatePoints(view:PlayerView,command:GameCommand):number {
 const action=command.type==='trade-and-act'?command.action:command;
 if(action.type==='build')return action.builds.filter(build=>build.component==='monolith').length*3;
 if(action.type==='place-shrine')return 1;
 if(action.type==='research'){
  const seat=view.seats.find(s=>s.id===view.viewerSeatId)!;
  const count=seat.technologies[action.track].length;
  return count<7?researchTrackVp(count+1)-researchTrackVp(count):0;
 }
 return 0;
}

/** Unfinished and finished midgame branches use the same units: VP margin
 * against the strongest opponent in that world. Resource ties stay secondary. */
function projectPoints(worlds: GameState[], actor: string): { value: number; points: ExpectedPoints } | null {
 let own = 0, leader = 0, margin = 0;
 for (const world of worlds) {
  if (world.phase === 'finished') {
   const result = finalScoreComparison(world.engine?.scores ?? [], actor);
   if (!result) return null;
   own += result.expectedVp;
   leader += result.expectedLeaderVp;
   margin += result.margin;
  } else {
   const visible = getPlayerView(world, actor);
   if (!visible) return null;
   const scores = forecastFinalScores(visible);
   const mine = scores.find(score => score.seatId === actor);
   if (!mine) return null;
   const opponent = Math.max(...scores.filter(score => score.seatId !== actor).map(score => score.expectedVp));
   own += mine.expectedVp;
   leader += opponent;
   margin += mine.expectedVp - opponent;
  }
 }
 return {
  value: margin / worlds.length,
  points: { expectedVp: own / worlds.length, expectedLeaderVp: leader / worlds.length },
 };
}

/** Distinct alternatives are decisions the real player can make now, even
 * when several promising future lines start with the same command. */
function differentStarts(ranked:Node[],limit:number):Node[] {
 const result:Node[]=[],seen=new Set<string>();
 for(const node of ranked){
  const key=JSON.stringify(node.first.command);
  if(seen.has(key))continue;
  seen.add(key);result.push(node);
  if(result.length===limit)break;
 }
 return result;
}

/** Passing buys time and income in earlier rounds as well. Keep that root
 * next to the estimated leader so both receive the same terminal samples. */
function selectFinalists(ranked: Node[], previous: Node[], limit: number): Node[] {
 const alternatives = differentStarts([...ranked, ...previous], ranked.length + previous.length);
 const pass = alternatives.find(plan => plan.first.command.type === 'pass');
 if (!pass || pass === alternatives[0]) return alternatives.slice(0, limit);
 return [alternatives[0], pass, ...alternatives.slice(1).filter(plan => plan !== pass)].slice(0, limit);
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
 const isStrategic=(command:GameCommand)=>['explore','research','upgrade','build','move','influence','pass','buy-minor-species'].includes(actionFamily(command));
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
 const finalistCount=options.difficulty==='expert'&&maxNodes>=64?3:2;
 const reserve=!finalRound&&maxNodes>=12?finalistCount*samples:0;
 const treeNodes=maxNodes-reserve;
 const treeExpired=()=>clock()-started>=(reserve?budget*.65:budget);
 let finalists:Node[]=[];

 let best=fallback;
 let frontier:Node[]=[{worlds:roots,first:fallback,value:0,path:[]}];
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
 function rollout(initial:GameState,until:'next-turn'|'final-score'|'play-to-score'):GameState|null {
  let state=initial;
  const visited=new Set<string>();
  const stepLimit=until==='play-to-score'?Math.min(maxNodes*12,160*(gameRoundLimit(initial)-initial.round+1)):160;
  let turn=state.actionTurnSerial;
  for(let step=0;step<stepLimit;step++){
   if(state.actionTurnSerial!==turn){visited.clear();turn=state.actionTurnSerial;}

   if(state.phase==='finished')return state;
   const owner=state.pendingDecision?.owner??state.activeSeatId;
   if(!owner)return null;
   const ourTurn=owner===actor&&state.phase==='action'&&!state.pendingDecision&&!state.engine?.action;
   // The candidate has already been applied. The engine may skip every opponent's
   // reaction or return here immediately after a free minor-species purchase.
   if(ourTurn&&until==='next-turn')return state;
   if(until==='next-turn'?treeExpired():expired())return null;
   const signature=JSON.stringify([state.round,state.phase,state.activeSeatId,state.pendingDecision,state.seats,state.sectors,state.ships,state.engine?.action]);
   let next:GameCommand|null=ourTurn&&until==='final-score'?{type:'pass'}:policy(state,owner);
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
  return state.phase==='finished'?state:null;
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
   const evaluated=rollout(world,'final-score');
   if(!evaluated)return null;
   const result=finalScoreComparison(evaluated.engine?.scores??[],actor);
   if(!result)return null;
   values.push(result.outcome*100+result.margin);
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
  if(depth===1){const pass=ranked.find(c=>c.command.type==='pass');if(pass)add(pass);}
  if(!finalRound){
   let highest=0,scoring:AiChoice|undefined;
   for(const candidate of ranked){
    const points=immediatePoints(visible,candidate.command);
    if(points>highest){highest=points;scoring=candidate;}
   }
   if(scoring)add(scoring);
  }
  for(const candidate of ranked){
   const family=actionFamily(candidate.command);
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
  // Spread a small work budget across the live alternatives. Otherwise the first
  // few roots consume the layer and none of their two-action plans can be compared.
  const liveBranches=frontier.filter(node=>node.worlds.some(world=>world.phase!=='finished')).length;
  const perBranch=finalRound||depth===1?8:Math.max(1,Math.floor((treeNodes-search.nodes)/liveBranches));
  for(const node of frontier){
   if(node.worlds.every(s=>s.phase==='finished')){expanded.push(node);continue;}
   if(search.nodes>=treeNodes||treeExpired()){search.cutoff=true;break;}
   const representative=getPlayerView(node.worlds.find(world=>world.phase!=='finished')!,actor);
   if(representative?.phase!=='action'||representative.pendingDecision||representative.actionProgress)continue;
   const choices=depth===1?rootChoices:shortlist(representative,depth).slice(0,perBranch);
   for(const candidate of choices){
    // The final-round stopping option was settled before spending the first expansion.
    if(finalRound&&depth===1&&candidate.command.type==='pass')continue;
    if(search.nodes>=treeNodes||treeExpired()){search.cutoff=true;break;}
    search.nodes++;
    const worlds:GameState[]=[];
    for(const world of node.worlds){
     if(world.phase==='finished'){worlds.push(world);continue;}
     let next=advance(world,candidate.command);
     // After a prior hidden draw, future choices may legitimately differ by observed
     // outcome. Condition continuation on that world's seat view, not its hidden deck.
     if(!next&&depth>1&&!treeExpired()){const alternate=policy(world,actor);if(alternate)next=advance(world,alternate);}
     if(!next)break;
     worlds.push(next);
    }
    if(worlds.length!==samples)continue;
    const estimate=finalRound?null:projectPoints(worlds,actor);
    const value=finalRound?positionValue(worlds):estimate?.value;
    if(value===null||value===undefined)continue;
    const first=depth===1?candidate:node.first;
    expanded.push({worlds,first,value,path:[...node.path,candidate.command],points:estimate?.points});
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
   finalists=selectFinalists(expanded,finalists,finalistCount);
   if(leader.points)search.forecast={...leader.points,source:'estimate',samples:0,comparedPlans:differentStarts(expanded,expanded.length).length,comparedPass:expanded.some(plan=>plan.first.command.type==='pass')};
   if(!search.cutoff)search.completedDepth=Math.min(depth,leader.path.length);
  }
  // Give a prerequisite one follow-up before pruning it for its immediate cost.
  // Later layers retain alternative first moves for a paired score comparison.
  frontier=finalRound?expanded.slice(0,beamWidth):depth===1?expanded:differentStarts(expanded,beamWidth);
  if(search.cutoff)break outer;
 }
 // Finish the strongest distinct plans under the same continuation policy.
 // Every seat now plays on. Passing our remaining turns would systematically
 // undervalue investments whose returns arrive in a later round.
 if(reserve&&finalists.length>=2&&!expired()){
  const scored:Node[]=[];
  for(const plan of finalists){
   const finishes:GameState[]=[];
   for(const world of plan.worlds){
    if(search.nodes>=maxNodes||expired())break;
    search.nodes++;
    const terminal=rollout(world,'play-to-score');
    if(!terminal)break;
    finishes.push(terminal);
   }
   // Keep only alternatives that finished in every assigned world.
   if(finishes.length!==samples){search.cutoff=true;break;}
   const projection=projectPoints(finishes,actor);
   if(!projection)break;
   scored.push({...plan,...projection});
  }
  if(scored.length>=2){
   scored.sort((a,b)=>b.value-a.value||(b.points!.expectedVp-a.points!.expectedVp));
   const winner=scored[0];
   best={...winner.first,evaluation:winner.value};
   search.principalVariation=winner.path;
   search.forecast={...winner.points!,source:'rollout',samples,comparedPlans:scored.length,comparedPass:scored.some(plan=>plan.first.command.type==='pass')};
  }
 }
 if(expired())search.cutoff=true;
 return finish(best);
}

/** Public candidate type retained here for downstream instrumentation without engine state. */
export type AiSearchCandidate=LegalCommandCandidate;
