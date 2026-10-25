import ScifiDecision from './ScifiDecision';
import ReputationTile from './ReputationTile';
import CommitBar from './CommitBar';
import {combatAllocationPreview} from './combatAllocationPreview';
import { researchedTechnologyIds } from '../../shared/eclipse/technologies';
import './lessRandomDecisions.css';
import { useCallback,useState } from "react";
import type { ReactElement } from "react";
import type { LegalCommandCandidate } from "../../shared/eclipse/legal";
import type {
  PlayerView,
  DecisionChoice,
  GameCommand,
  PendingDecision,
} from "../../shared/eclipse/types";
import ExplorationDecision from "./ExplorationDecision";
import DiscoveryDecision from "./DiscoveryDecision";
import AncientPartDecision from "./AncientPartDecision";
import EconomyDecision from "./EconomyDecision";
import CombatTurnDecision from "./CombatTurnDecision";
import ColonizationPlanner from "./ColonizationPlanner";
import {
  BombardmentTargets,
  CombatVolleyAllocator,
  InitiativeQueue,
} from "./CombatDecisionVisuals";
import EclipseDieFace from "./EclipseDieFace";
import { substituteSuperJokerDice } from "../../shared/eclipse/lessRandomCombat";
import { applyLessRandomReputation, type LessRandomReputationAction } from "../../shared/eclipse/reputation";
interface Props {
  view?: PlayerView;
  targetLabels?: Record<string, string>;
  candidates?: LegalCommandCandidate[];
  decision: PendingDecision;
  reputation: number[];
  disabled: boolean;
  motionEnabled?: boolean;
  onSubmit: (command: GameCommand) => void;
}
function DicePreview({label,dice}:{label:string;dice:Extract<PendingDecision,{kind:'super-joker'}>["dice"]}){
 return <div><strong>{label}</strong><div className="dg-result-dice" role="group" aria-label={label}>{dice.map((die,index)=><span key={`${die.id}-${index}`} className={`is-${die.weaponColor??"unknown"}`} aria-label={`${die.weaponColor??"unknown"} die ${index+1}: face ${die.face}, ${die.damage} damage`}><EclipseDieFace color={die.weaponColor??"#bac0ce"} face={die.face} decorative/><small>{die.weaponColor??"unknown"} · {die.damage} damage</small></span>)}</div></div>;
}
function SuperJokerDecision({decision,view,disabled,onSubmit}:{decision:Extract<PendingDecision,{kind:'super-joker'}>;view?:PlayerView;disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const [choice,setChoice]=useState<Extract<DecisionChoice,{kind:'super-joker'}>>({kind:'super-joker',action:'accept'});
 const tableDice=decision.dice.length>=1&&decision.dice.length<=50?substituteSuperJokerDice(decision.dice):null;
 const seat=view?.seats.find(seat=>seat.id===decision.owner),colonies=seat?.faction==='lyra'?seat.colonyShipsAvailable:0;
 const valid=choice.action==='accept'||choice.action==='colony-reroll'?choice.action==='accept'||colonies>0:decision.remaining>0&&(choice.action!=='table'||!!tableDice);
 return <section className="dg-decision dg-reroll-decision"><h2>Keep or replace this roll</h2><div className="dg-joker-preview"><DicePreview label="Current volley" dice={decision.dice}/>{decision.remaining>0&&tableDice&&<DicePreview label="Super Joker table result" dice={tableDice}/>}</div>
  <div className="dg-reroll-options" role="radiogroup" aria-label="Roll options">
   <button type="button" role="radio" aria-checked={choice.action==='accept'} onClick={()=>setChoice({kind:'super-joker',action:'accept'})}>Keep current roll</button>
   {decision.remaining>0&&<><button type="button" role="radio" aria-checked={choice.action==='reroll'} onClick={()=>setChoice({kind:'super-joker',action:'reroll'})}>Roll again · 1 joker</button><button type="button" role="radio" aria-checked={choice.action==='table'} disabled={!tableDice} onClick={()=>setChoice({kind:'super-joker',action:'table'})}>Use table result</button></>}
   {colonies>0&&decision.dice.map(die=><button type="button" role="radio" key={die.id} aria-checked={choice.action==='colony-reroll'&&choice.dieId===die.id} onClick={()=>setChoice({kind:'super-joker',action:'colony-reroll',dieId:die.id})}>Reroll {die.weaponColor??'combat'} die {die.face} · 1 colony ship</button>)}
  </div>
  <CommitBar summary={choice.action==='accept'?undefined:choice.action==='colony-reroll'?'Flip 1 colony ship · new roll unknown':`Spend 1 of ${decision.remaining} jokers${choice.action==='reroll'?' · new roll unknown':''}`}><button className="sd-primary" disabled={disabled||!valid} onClick={()=>onSubmit({type:'resolve',decisionId:decision.id,choice})}>{choice.action==='accept'?'Accept roll':choice.action==='table'?'Use shown table result':choice.action==='reroll'?'Reroll all dice':'Reroll selected die'}</button></CommitBar>
 </section>;
}
function LessRandomReputationDecision({decision,view,reputation,disabled,onSubmit}:{decision:Extract<PendingDecision,{kind:'less-random-reputation'}>;view?:PlayerView;reputation:number[];disabled:boolean;onSubmit:(command:GameCommand)=>void}){
 const [actions,setActions]=useState<LessRandomReputationAction[]>([]);
 const cost=actions.reduce((sum,action)=>sum+(action.type==='add'?1:action.from),0);
 const supply=view?.lessRandom?.reputationSupply??[];
 const owned=view?.lessRandom?.reputationBySeat[decision.owner]??reputation;
 const preview=(draft:readonly LessRandomReputationAction[])=>{try{return applyLessRandomReputation(owned,supply,decision.capacity,decision.draws,draft);}catch{return null;}};
 const result=preview(actions);
 const canAdd=(action:LessRandomReputationAction)=>!disabled&&preview([...actions,action])!==null;
 const canSpendMore=preview([...actions,{type:'add'}])!==null||([1,2,3] as const).some(from=>preview([...actions,{type:'upgrade',from}])!==null);
 return <section className="dg-decision"><p className="sd-eyebrow">PUBLIC REPUTATION · {decision.draws} DRAWS</p><h2>Build your reputation</h2><p className="dg-reputation-remaining" role="status">{decision.draws-cost} draws left</p><div className="dg-reputation-draft" aria-label="Reputation draft"><span className="sr-only">Track: {(result?.kept??owned).join(', ')||'empty'}</span><div className="dg-reputation-draft-tiles">{(result?.kept??owned).map((points,index)=><ReputationTile key={index} points={points}/>)}{Array.from({length:Math.max(0,decision.capacity-(result?.kept??owned).length)},(_,i)=><span key={`empty-${i}`} className="dg-reputation-empty" aria-label="Empty reputation slot">+</span>)}</div><div className="dg-reputation-supply" aria-label="Public reputation supply">{([1,2,3,4] as const).map(points=><span key={points}><ReputationTile points={points}/><strong>×{(result?.supply??supply).filter(value=>value===points).length}</strong></span>)}</div></div><div className="dg-placement-actions"><button disabled={!canAdd({type:'add'})} onClick={()=>setActions(current=>[...current,{type:'add'}])}>Add 1 VP · 1 draw</button>{([1,2,3] as const).map(from=><button key={from} disabled={!canAdd({type:'upgrade',from})} onClick={()=>setActions(current=>[...current,{type:'upgrade',from}])}>Upgrade {from}→{from+1} · {from}</button>)}</div><CommitBar summary={`${(result?.kept??owned).reduce((sum,points)=>sum+points,0)} VP`}><button aria-label="Undo last reputation step" disabled={disabled||actions.length===0} onClick={()=>setActions(current=>current.slice(0,-1))}>↶</button><details className="dg-reputation-options"><summary aria-label="Draft options">⋯</summary><button disabled={disabled||actions.length===0} onClick={()=>setActions([])}>Reset reputation draft</button></details><button className="sd-primary" disabled={disabled||!result||canSpendMore} onClick={()=>onSubmit({type:'resolve',decisionId:decision.id,choice:{kind:'less-random-reputation',actions}})}>Confirm reputation</button></CommitBar></section>;
}
function activeNeutronBombs(view: PlayerView | undefined, decision: Extract<PendingDecision, { kind: "bombardment" }>): boolean {
  const sector = view?.sectors.find(candidate => candidate.id === decision.sectorId);
  const attacker = view?.seats.find(candidate => candidate.id === decision.owner);
  const defender = view?.seats.find(candidate => candidate.id === sector?.owner);
  const has = (seat: typeof attacker, technology: string) => seat ? researchedTechnologyIds(seat).some(id=>id===technology) : false;
  return has(attacker, "neutron-bombs") && !has(defender, "neutron-absorber");
}
/** Local state is an editable draft only. The outstanding decision lives in the authoritative view. */
export default function DecisionPanel({
  decision,
  view,
  reputation,
  disabled,
  motionEnabled = true,
  onSubmit,
  candidates = [],
  targetLabels = {},
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const neutronBombs = decision.kind === "bombardment" && activeNeutronBombs(view, decision);
  const [selected, setSelected] = useState<string[]>(() => decision.kind === "initiative-order" ? [...decision.groupIds] : neutronBombs && decision.kind === "bombardment" ? decision.squareIds.slice(0, decision.hits) : []);
  const value = (key: string, fallback = "") => values[key] ?? fallback;
  const set = useCallback((key: string, next: string) =>
    setValues((v) => ({ ...v, [key]: next })),[]);
  const volley=decision.kind==='combat-allocation'?combatAllocationPreview(view,decision,values):null;
  const toggle = (key: string) =>
    setSelected((s) =>
      s.includes(key) ? s.filter((k) => k !== key) : [...s, key],
    );
  let choice: DecisionChoice;
  let valid = true;
  let fields: ReactElement;
  switch (decision.kind) {
    case "discovery-draft":
    case "technology-reservation":
    case "reverse-engineering":
      return <ScifiDecision key={decision.id} decision={decision} disabled={disabled} onSubmit={onSubmit}/>;
    case "exploration":
      return view ? <ExplorationDecision key={`${decision.id}:${decision.drawnTileIds.join(',')}`} view={view} decision={decision} disabled={disabled} onSubmit={onSubmit}/> : <p role="alert">The galaxy view is needed to preview this exploration. Reconnect to restore it.</p>;
    case "discovery":
      return <DiscoveryDecision key={decision.id} view={view} decision={decision} disabled={disabled} onSubmit={onSubmit}/>;
    case "super-joker":
      return <SuperJokerDecision key={decision.id} decision={decision} view={view} disabled={disabled} onSubmit={onSubmit}/>;
    case "less-random-reputation":
      return <LessRandomReputationDecision key={decision.id} decision={decision} view={view} reputation={reputation} disabled={disabled} onSubmit={onSubmit}/>;
    case "ancient-part":
      return view ? <AncientPartDecision key={decision.id} view={view} decision={decision} candidates={candidates} disabled={disabled} onSubmit={onSubmit}/> : <p role="alert">Reconnect to restore your ship blueprints for this installation.</p>;
    case "control":
    case "bankruptcy":
    case "portal-placement":
    case "free-technology":
    case "population-return":
    case "resource-reward":
    case "diplomacy":
    case "diplomacy-window":
    case "reputation":
      return <EconomyDecision key={decision.id} decision={decision} view={view} candidates={candidates} reputation={reputation} disabled={disabled} onSubmit={onSubmit} />;
    case "combat-allocation": {
      const dice = decision.dice.filter((d) => d.targets.length);
      valid = dice.every((d) =>
        d.hitTargets?.length === 0
          ? true
          : d.split
            ? d.targets.every(
                (target) =>
                  Number.isInteger(Number(value(`${d.id}/${target}`, "0"))) &&
                  Number(value(`${d.id}/${target}`, "0")) >= 0,
              ) &&
              d.targets.reduce(
                (sum, target) => sum + Number(value(`${d.id}/${target}`, "0")),
                0,
              ) === d.damage
            : d.targets.includes(value(d.id)),
      );
      choice = {
        kind: "combat-allocation",
        allocations: dice.flatMap((d) =>
          d.hitTargets?.length === 0
            ? d.split ? [] : [
                {
                  dieId: d.id,
                  targetId: d.targets[0],
                },
              ]
            : d.split
              ? d.targets
                  .filter(
                    (target) => Number(value(`${d.id}/${target}`, "0")) > 0,
                  )
                  .map((target) => ({
                    dieId: d.id,
                    targetId: target,
                    damage: Number(value(`${d.id}/${target}`, "0")),
                  }))
              : value(d.id)
                ? [{ dieId: d.id, targetId: value(d.id) }]
                : [],
        ),
      };
      fields = <CombatVolleyAllocator view={view} decision={decision} targetLabels={targetLabels} values={values} setValue={set} motionEnabled={motionEnabled} />;
      break;
    }
    case "retreat":
    case "combat-turn":
      return <CombatTurnDecision key={decision.id} decision={decision} view={view} disabled={disabled} onSubmit={onSubmit}/>;
    case "bombardment":
      valid = selected.length <= decision.hits;
      choice = { kind: "bombardment", squareIds: selected };
      fields = <BombardmentTargets view={view} neutronBombs={neutronBombs} sectorId={decision.sectorId} squareIds={decision.squareIds} selected={selected} hits={decision.hits} onToggle={toggle} onSelect={setSelected} />;
      break;
    case "initiative-order":
      valid = selected.length === decision.groupIds.length;
      choice = { kind: "initiative-order", groupIds: selected };
      fields = <InitiativeQueue view={view} groupIds={decision.groupIds} selected={selected} onReorder={setSelected} disabled={disabled} />;
      break;
    case "colonization":
      return view ? <ColonizationPlanner key={decision.id} view={view} candidates={candidates} disabled={disabled} decision={decision} onSubmit={onSubmit} /> : <p role="alert">Reconnect to restore the planet board for this colonization decision.</p>;
  }
  return (
    <section className={`dg-decision ${decision.kind === "combat-allocation" ? "dg-combat-allocation" : ""}`}>
      <h2>{volley?`Assign hits · ${volley.remaining?`${volley.remaining} remaining`:'Ready'}`:decision.kind==='bombardment'?'Choose population to destroy':'Order firing groups'}</h2>
      {fields}
      <section className="dg-decision-commit" aria-label="Commit action"><CommitBar summary={volley?<span aria-live="polite">{volley.remaining?`${volley.remaining} assignment${volley.remaining===1?'':'s'} left`:volley.destroyed?`${volley.destroyed} ship${volley.destroyed===1?'':'s'} will be destroyed`:volley.damage?`${volley.damage} damage assigned`:volley.uncertainDamage?'Hit preview unknown':'No damage'}{volley.destroyed>0&&volley.targets.some(target=>target.excess>0)?` · ${volley.targets.reduce((sum,target)=>sum+target.excess,0)} excess`:''}</span>:undefined}>
      <button
        className="sd-primary"
        disabled={disabled || !valid}
        onClick={() =>
          onSubmit({ type: "resolve", decisionId: decision.id, choice })
        }
      >
        {decision.kind === "combat-allocation" ? "Resolve volley" : decision.kind === "bombardment" ? selected.length ? `Destroy ${selected.length} population` : "Spare population" : "Set firing order"}
      </button>
      </CommitBar></section>
    </section>
  );
}
