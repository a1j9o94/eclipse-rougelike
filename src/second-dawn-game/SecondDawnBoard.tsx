import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties,ReactNode } from "react";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";
import {
  incomeForPopulationAway,
} from "../../shared/eclipse/tracks";
import { TECHNOLOGIES } from "../../shared/eclipse/technologies";
import type { GameCommand, PlayerView } from "../../shared/eclipse/types";
import { publicBlueprint } from "../../shared/eclipse/legal";
import {
  connectionBetween,
  movableShipCount,
} from "../../shared/eclipse/geometry";
import { mapSector, movementAbilities } from "../../shared/eclipse/rulesState";
import {
  deriveBlueprintStats,
  effectiveBlueprintParts,
} from "../../shared/eclipse/blueprints";
import type { AncientShipPartId } from "../../shared/eclipse/discoveries";
import type { TechnologyId } from "../../shared/eclipse/technologies";
import BlueprintEditor from "./BlueprintEditor";
import { describeTechnology } from "./itemDescriptions";
import DecisionPanel from "./DecisionPanel";
import GalaxyBoard from "./GalaxyBoard";
import TechnologyStats from "./TechnologyStats";
import SectorPlanets from "./SectorPlanets";
import SectorFleet from "./SectorFleet";
import UpkeepSummary from "./UpkeepSummary";
import ActionEconomy from "./ActionEconomy";
import HistoryPanel from "./HistoryPanel";
import AiActionPanel from "./AiActionPanel";
import AiActivityBar from "./AiActivityBar";
import {useAiPresentation} from "./useAiPresentation";
import FactionSymbol from "./FactionSymbol";
import type {HistoryFeed} from "../second-dawn-session/useMatchHistory";
import TradePanel from "./TradePanel";
import InfluencePlanner from "./InfluencePlanner";
import ColonizationPlanner from "./ColonizationPlanner";
import {ChoiceCards} from "./DecisionChoicePrimitives";
import BuildPlanner from "./BuildPlanner";
import MovementPlanner from "./MovementPlanner";
import FundingPlanSelector from "./FundingPlanSelector";
import {fundedCandidates} from "./fundedCandidates";
import {fundingOptions} from "../../shared/eclipse/funding";
import BattleOverview from "./BattleOverview";
import DiplomacyPanel from "./DiplomacyPanel";
import { runningScore } from "./runningScore";
import ShipPartStats from "./ShipPartStats";
import ShipSilhouette from "./ShipSilhouette";
import type { BlueprintShipType, ShipBlueprint } from "../../shared/eclipse/blueprints";
import "../second-dawn/second-dawn.css";
import "./game.css";
import {useMobileLayout} from './mobileLayout';
import MobileNavigation,{type MobileDestination} from './MobileNavigation';
import MobileHeader from './MobileHeader';
import MobileActionPicker,{type MobileActionOption} from './MobileActionPicker';
import './mobileBoard.css';
import {ActionDraftProvider} from './ActionDraftProvider';
import {useActionDraftGuard,useActionDraftState} from './actionDraftContext';
import ActionDraftNotice from './ActionDraftNotice';
import ResearchWorkspace from './ResearchWorkspace';
export interface CommandCandidate {
  command: GameCommand;
  label: string;
  description: string;
}
interface Props {
  matchId?:string;
  lastAcceptedCommand?:{revision:number;type:GameCommand["type"]};
  activityRecap?:ReactNode;
  recapOpen?:boolean;
  playerNames?:Record<string,string>;
  turnClock?:ReactNode;
  menuLabel?:string;
  reviewMode?: boolean;
  initialSectorId?: string;
  history?: HistoryFeed;
  aiFailure?: string | null;
  onRetryAi?: () => void;
  view: PlayerView;
  candidates: CommandCandidate[];
  connected: boolean;
  busy: boolean;
  status: string;
  onSubmit: (command: GameCommand) => void;
  onMenu: () => void;
}
const colors = {
  red: "#df7e86",
  blue: "#70c8e3",
  green: "#79c9a0",
  yellow: "#e8c766",
  white: "#e3e7ed",
  black: "#a4acba",
};
const directTurnActions:GameCommand["type"][] = ["end-action","pass","finish-upkeep"];

const humanize = (text: string) =>
  text.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
export default function SecondDawnBoard(props:Props){
 return <ActionDraftProvider matchId={props.matchId} viewerSeatId={props.view.viewerSeatId} revision={props.view.revision} lastAcceptedCommand={props.lastAcceptedCommand}><SecondDawnBoardContent {...props}/></ActionDraftProvider>;
}
function SecondDawnBoardContent({
  view,
  candidates,
  connected,
  busy,
  status,
  onSubmit:submitAuthoritative,
  onMenu,
  aiFailure,
  onRetryAi,
  reviewMode = false,
  initialSectorId,
  history,
  turnClock,
  menuLabel='Game menu',
  playerNames={},
  activityRecap,
  lastAcceptedCommand,
  recapOpen=false,
}: Props) {
  const compact=useMobileLayout();
  const draftGuard=useActionDraftGuard();
  const submittedResearch=useRef<{id:TechnologyId;command:string}|null>(null);
  const onSubmit=(command:GameCommand)=>{if(draftGuard.stale&&!view.pendingDecision&&!directTurnActions.includes(command.type))return;const action=command.type==='trade-and-act'?command.action:command;if(action.type==='research')submittedResearch.current={id:action.tileId as TechnologyId,command:JSON.stringify(command)};draftGuard.markSubmitted(command);submitAuthoritative(command);};
  const [mobileSheet,setMobileSheet]=useState<'closed'|'peek'|'expanded'>('closed');
  const [mobileActionsOpen,setMobileActionsOpen]=useState(false);
  const [mobileActionMode,setMobileActionMode]=useState(false);
  const [mobileWorkspaceTop,setMobileWorkspaceTop]=useState(190);
  const [mobileBottomInset,setMobileBottomInset]=useState(62);
  const [followAi,setFollowAi]=useState(true);
  const [aiDismissed,setAiDismissed]=useState(false);
  const [reviewAi,setReviewAi]=useState(false);
  const [fitRequest,setFitRequest]=useState(0);
  const [historyOpen,setHistoryOpen] = useActionDraftState('historyOpen',false);
  const [motionEnabled,setMotionEnabled]=useState(()=>{try{const saved=localStorage.getItem('eclipse.second-dawn.motion.v1');return saved?saved==='on':!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}});
  const aiPresentation=useAiPresentation(view,history?.entries??[],motionEnabled);
  useEffect(()=>{if(!compact)setAiDismissed(false);setReviewAi(false);},[compact,aiPresentation.actor?.id]);
  const showAiPanel=followAi&&!aiDismissed&&!!aiPresentation.action&&(!!aiPresentation.actor||reviewAi)&&!view.pendingDecision;
  function changeMotion(enabled:boolean){setMotionEnabled(enabled);try{localStorage.setItem('eclipse.second-dawn.motion.v1',enabled?'on':'off');}catch{/* The preference still applies for this session. */}}

  const [buildOpen,setBuildOpen]=useActionDraftState('buildOpen',false);
  const [moveOpen,setMoveOpen]=useActionDraftState('moveOpen',false);
  const [moveSource,setMoveSource]=useActionDraftState('moveSource',null);
  const [moveTarget,setMoveTarget]=useActionDraftState('moveTarget',null);
  const [moveTargets,setMoveTargets]=useState<string[]>([]);
  const pendingMove=useRef<{receipt:Props['lastAcceptedCommand'];ships:number}|null>(null);
  const [movementResult,setMovementResult]=useState('');
  useEffect(()=>{
    const pending=pendingMove.current;
    if(!pending||!lastAcceptedCommand||lastAcceptedCommand===pending.receipt||lastAcceptedCommand.type!=='move'||view.revision<lastAcceptedCommand.revision)return;
    pendingMove.current=null;
    const continuing=view.phase==='action'&&view.activeSeatId===view.viewerSeatId&&!view.pendingDecision&&view.actionProgress?.owner===view.viewerSeatId&&view.actionProgress.action==='move'&&view.actionProgress.remaining>0;
    setMovementResult(`${pending.ships} ${pending.ships===1?'ship moved':'ships moved'}. ${continuing?'Choose your next ships and destination.':'Movement complete.'}`);
    if(!continuing)setMoveOpen(false);
  },[lastAcceptedCommand,view.revision,view.phase,view.activeSeatId,view.viewerSeatId,view.pendingDecision,view.actionProgress,setMoveTarget,setMoveOpen]);
  const [influenceTargets,setInfluenceTargets]=useState<string[]>([]);
  const [selected, setSelected] = useActionDraftState('selectedSector',initialSectorId ?? null);
  const [screen, setScreen] = useActionDraftState('screen',
    view.phase === "finished" ? "Scoring" : "Galaxy",
  );
  const pendingId = view.pendingDecision?.id;
  const previousUiReceipt=useRef(lastAcceptedCommand);
  useEffect(()=>{
    if(previousUiReceipt.current===lastAcceptedCommand)return;
    previousUiReceipt.current=lastAcceptedCommand;
    if(lastAcceptedCommand?.type==='end-action'){setMoveOpen(false);setMoveTargets([]);}
    if(!compact||!lastAcceptedCommand)return;
    // A completed human choice resumes following; manual opponent-turn inspection stays put.
    setAiDismissed(false);
    if(directTurnActions.includes(lastAcceptedCommand.type)){
      setScreen(pendingId?'Decision':'Galaxy');setMobileSheet('closed');setMobileActionMode(false);
    }
  },[compact,lastAcceptedCommand,pendingId,setScreen,setMoveOpen]);

  useEffect(()=>{if(!pendingId&&screen==='Decision')setScreen('Galaxy');if(view.phase==='finished')setScreen('Scoring');},[pendingId,screen,setScreen,view.phase]);
  useEffect(() => { if (pendingId) {setScreen("Decision");setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(false);} }, [pendingId,setScreen]);
  const previousRecapOpen=useRef(false);
  useEffect(()=>{if(recapOpen&&!previousRecapOpen.current&&!pendingId){setScreen('Activity');setMobileSheet('closed');setMobileActionMode(false);}else if(!recapOpen&&previousRecapOpen.current){setScreen(pendingId?'Decision':'Galaxy');setMobileSheet('closed');}previousRecapOpen.current=recapOpen;},[recapOpen,pendingId,setScreen]);
  useEffect(()=>{if(compact&&showAiPanel&&screen==='Galaxy'){setMobileSheet('peek');setMobileActionsOpen(false);}},[compact,showAiPanel,screen,aiPresentation.action?.revision]);
  const [action, setAction] = useActionDraftState('action','explore');
  const [draft, setDraft] = useActionDraftState('commandDraft',null);
  const [researchSelection, setResearchSelection] = useActionDraftState('researchSelection',
    null,
  );
  const [acquiredResearch,setAcquiredResearch]=useState<TechnologyId|null>(null);
  const [editing, setEditing] = useActionDraftState('editing',null);
  const [blueprintDrafts, setBlueprintDrafts] = useState<{revision: number; drafts: Partial<Record<BlueprintShipType, ShipBlueprint>>}>({revision: view.revision, drafts: {}});
  const rememberBlueprintDraft = useCallback((draft: ShipBlueprint) => {
    setBlueprintDrafts(current => ({revision: view.revision, drafts: {...(current.revision === view.revision ? current.drafts : {}), [draft.shipType]: draft}}));
  }, [view.revision]);
  const [playerId, setPlayerId] = useActionDraftState('playerId',view.viewerSeatId);
  const [camera,setCamera]=useActionDraftState('camera',null);
  const mobileRestored=useRef(false);
  useEffect(()=>{if(!compact||mobileRestored.current)return;mobileRestored.current=true;if(!pendingId&&(draft||moveOpen||['influence','colonize'].includes(action))){setMobileActionMode(true);setMobileSheet(action==='research'?'closed':'peek');}},[compact,pendingId,draft,moveOpen,action]);
  const workspaceRef = useRef<HTMLElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const mobileSheetBodyRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(compact&&showAiPanel){
      if(inspectorRef.current)inspectorRef.current.scrollTop=0;
      if(mobileSheetBodyRef.current)mobileSheetBodyRef.current.scrollTop=0;
    }
  },[compact,showAiPanel,aiPresentation.action?.revision,mobileSheet]);
  useLayoutEffect(()=>{if(!compact||!workspaceRef.current)return;const element=workspaceRef.current;const measure=()=>{const rect=element.getBoundingClientRect();if(rect.height>0){setMobileWorkspaceTop(Math.ceil(rect.top)+4);setMobileBottomInset(Math.ceil(window.innerHeight-rect.bottom));}};measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(element);window.addEventListener('resize',measure);return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};},[compact]);
  const actionPanelRef = useRef<HTMLDivElement>(null);
  const [actionFocus,setActionFocus]=useState(0);
  useLayoutEffect(() => { if (workspaceRef.current) workspaceRef.current.scrollTop = 0; }, [screen, editing, playerId]);
  useLayoutEffect(() => { if (inspectorRef.current) inspectorRef.current.scrollTop = 0; }, [screen, selected, researchSelection]);
  useLayoutEffect(()=>{if(!actionFocus||historyOpen)return;const inspector=inspectorRef.current,panel=actionPanelRef.current;if(inspector&&panel)inspector.scrollTop+=panel.getBoundingClientRect().top-inspector.getBoundingClientRect().top-14;},[actionFocus,historyOpen]);
  const own = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const ownedTechnologyKey=Object.values(own.technologies).flat().join('|');
  useEffect(()=>{const submitted=submittedResearch.current;if(!submitted||!lastAcceptedCommand||!['research','trade-and-act'].includes(lastAcceptedCommand.type)||!ownedTechnologyKey.split('|').includes(submitted.id))return;submittedResearch.current=null;setAcquiredResearch(submitted.id);setDraft(current=>current&&JSON.stringify(current.command)===submitted.command?null:current);},[lastAcceptedCommand,ownedTechnologyKey,setDraft]);
  const liveScores = view.seats.map(seat => runningScore(view, seat.id).breakdown);
  const ownScore = liveScores.find(score => score.playerId === own.id)!;
  const inspectedPlayer = view.seats.find((s) => s.id === playerId) ?? own;
  const sector = view.sectors.find((s) => s.id === selected);
  const blocked = !connected || busy;
  const funded = useMemo(()=>fundedCandidates(view),[view]);
  const purchases = [...candidates,...funded];
  const available = purchases.filter((c) => (c.command.type === "trade-and-act" ? c.command.action.type : c.command.type) === action);
  const draftPreview = draft ? previewCommand(view, draft.command) : null;
  const stillLegal =
    draft &&
    (purchases.some(
      (c) => JSON.stringify(c.command) === JSON.stringify(draft.command),
    ) || (draft.command.type === "trade-and-act" && funded.some(c=>JSON.stringify(c.command.action)===JSON.stringify(draft.command.type === "trade-and-act" ? draft.command.action : null)) && fundingOptions(view,draft.command.action).some(option=>JSON.stringify(option.command)===JSON.stringify(draft.command))));
  const faction = (id: string) =>
    BASE_FACTIONS.find(
      (f) => f.id === view.seats.find((s) => s.id === id)?.faction,
    );
  const color = (id: string | null) =>
    id && faction(id) ? colors[faction(id)!.color] : "#66778b";
  useEffect(()=>{if(view.activeSeatId===view.viewerSeatId&&!view.actionProgress&&action==='end-action'){setAction('explore');setDraft(null);}},[view.activeSeatId,view.viewerSeatId,view.round,view.actionProgress,action,setAction,setDraft]);
  const activate = (type: GameCommand["type"]) => {
    if(compact){setMobileActionsOpen(false);setMobileActionMode(!directTurnActions.includes(type));setMobileSheet(['explore','influence','move','colonize','build'].includes(type)?'peek':'closed');}
    setReviewAi(false);setAiDismissed(true);
    setHistoryOpen(false);
    setActionFocus(n=>n+1);
    setAction(type);
    setMoveOpen(type === "move");
    setMoveTargets([]);setMoveTarget(null);
    if(type === "build"){
      setSelected(view.sectors.find(s=>s.id===selected&&s.owner===own.id)?.id??view.sectors.find(s=>s.owner===own.id)?.id??null);
      setBuildOpen(!compact);setScreen("Galaxy");setDraft(null);return;
    }
    if(type === "move"){
      setMoveSource(view.ships.some(ship=>ship.sectorId===selected&&ship.owner===own.id)?selected:view.ships.find(ship=>ship.owner===own.id)?.sectorId??null);
    }
    const direct = directTurnActions.includes(type) ? candidates.find(c=>c.command.type===type) : undefined;
    if(direct && !blocked){
      if(type==='end-action' && previewCommand(view,direct.command).betrayedPartners.length){setDraft(direct);setScreen('Galaxy');return;}
      onSubmit(direct.command);setDraft(null);return;
    }
    setDraft(null);
    setScreen(
      type === "offer-diplomacy" || type === "discard-reputation" ? "Diplomacy" : type === "trade" ? "Trade" : type === "research"
        ? "Research"
        : type === "upgrade"
          ? "Blueprints"
          : "Galaxy",
    );
  };
  const mobileDestination:MobileDestination=screen==='Galaxy'||screen==='Decision'?'Galaxy':screen==='Players'?'Players':screen==='Activity'?'Activity':'Empire';
  const resumeSavedAction=()=>{
    const keys=draftGuard.draftKeys;
    const savedCommand=draft?.command.type==='trade-and-act'?draft.command.action:draft?.command;
    const restoredAction:GameCommand['type']=savedCommand?.type??(keys.includes('movement')?'move':keys.includes('buildCounts')?'build':keys.some(key=>key.startsWith('blueprint-'))?'upgrade':keys.includes('influenceDraft')?'influence':keys.includes('colonization')?'colonize':'trade');
    setAction(restoredAction);setMobileActionsOpen(false);setMobileActionMode(true);setAiDismissed(true);setHistoryOpen(false);
    setScreen(restoredAction==='research'?'Research':restoredAction==='upgrade'?'Blueprints':restoredAction==='trade'?'Trade':'Galaxy');
    if(restoredAction==='move')setMoveOpen(true);
    if(restoredAction==='build')setBuildOpen(true);
    if(restoredAction==='upgrade'){setPlayerId(own.id);if(!editing)setEditing((keys.find(key=>key.startsWith('blueprint-'))?.slice(10)??'interceptor')as BlueprintShipType);}
    setMobileSheet(['explore','influence','colonize','move'].includes(restoredAction)?'expanded':'closed');
  };
  const mobileNavigate=(destination:MobileDestination)=>{setScreen(destination);setHistoryOpen(false);setMobileActionMode(false);setMobileActionsOpen(false);setMobileSheet('closed');setAiDismissed(true);if(destination==='Players')setPlayerId(own.id);};
  const mobileActionOptions:MobileActionOption[]=(['explore','influence','research','upgrade','build','move','colonize','trade','offer-diplomacy','discard-reputation','pass','end-action','finish-upkeep']as GameCommand['type'][]).filter(type=>!directTurnActions.includes(type)||candidates.some(candidate=>candidate.command.type===type)).map(type=>({type,label:humanize(type),description:type==='explore'?'Choose a frontier':type==='move'?'Choose ships & destination':type==='build'?'Choose a sector':type==='influence'?'Control or release sectors':type==='colonize'?'Populate your planets':type==='research'?'Technologies & effects':type==='upgrade'?'Edit ship loadouts':type==='trade'?'Convert resources':type==='pass'?'Pass for this round':'Available choices',disabled:blocked||!!view.pendingDecision||view.phase==='finished'||(view.phase!=='action'&&['explore','influence','research','upgrade','build','move'].includes(type))}));
  return (
    <main className={`sd-app dg-app dg-tabletop${compact?' dg-mobile-board':''}`} data-mobile-screen={compact?screen:undefined} style={compact?{"--mobile-sheet-top":`${mobileWorkspaceTop}px`,"--mobile-footer-height":`${mobileBottomInset}px`}as CSSProperties:undefined}>
      {compact?<MobileHeader view={view} connected={connected} busy={busy} score={ownScore.total} turnClock={turnClock} onMenu={onMenu} onScore={()=>{setScreen('Scoring');setMobileSheet('closed');setMobileActionMode(false);}}/>:<header className="sd-header">
        <div className="sd-brand">
          <span className="sd-eclipse" />
          <div>
            <strong>ECLIPSE</strong>
            <small>SECOND DAWN FOR THE GALAXY</small>
          </div>
        </div>
        <div className="sd-turn">
          <small>ROUND {view.round} / 8</small>
          <strong>
            {view.phase === "finished"
              ? "Final results"
              : `${humanize(view.phase)} · ${view.pendingDecision ? "your decision" : view.waitingFor ? 'opponent decision' : view.activeSeatId === own.id ? "your turn" : "opponent turn"}`}
          </strong>
          {turnClock}
        </div>
        {(["money", "science", "materials"] as const).map((resource) => (
          <div className="sd-resource" key={resource}>
            <small>{humanize(resource)}</small>
            <strong>
              {own.resources[resource]}
              <em>
                +{incomeForPopulationAway(own.populationTracks[resource])}{" "}
                income
              </em>
            </strong>
          </div>
        ))}
        <UpkeepSummary view={view}/>
        <button className="dg-running-score" onClick={() => setScreen("Scoring")} title="Open the scoring breakdown. Reputation is excluded until game end.">
          <small>{view.phase === "finished" ? "Your final score" : "Your public VP"}</small><strong>{ownScore.total}<span>VP</span></strong>
        </button>
      </header>}
      {!view.pendingDecision&&<div className="dg-board-draft-notice"><ActionDraftNotice/></div>}
      {!compact&&<div className="sd-toolbar">
        <nav aria-label="Game screens">
          {[
            "Galaxy",
            "Research",
            "Blueprints",
            "Players",
            "Diplomacy",
            "Scoring",
            ...(view.pendingDecision ? ["Decision"] : []),
          ].map((name) => (
            <button
              key={name}
              aria-pressed={screen === name}
              onClick={() => {
                setReviewAi(false);setAiDismissed(true);
                setHistoryOpen(false);
                setMoveOpen(false);setMoveTargets([]);
                setScreen(name);
                if (name === "Research") setAction("research");
                if (name === "Blueprints") setAction("upgrade");
              }}
            >
              {name}
            </button>
          ))}
          <button className="dg-history-toggle" aria-pressed={historyOpen} onClick={()=>setHistoryOpen(open=>!open)}>History</button>
        </nav>
        <div className="dg-save">
          {aiFailure && (
            <button disabled={blocked} title={aiFailure} onClick={onRetryAi}>
              AI paused · retry
            </button>
          )}
          <span>
            {connected
              ? reviewMode
                ? "Unsaved engine fixture"
                : busy
                  ? "Saving…"
                  : `Saved · revision ${view.revision}`
              : "Disconnected · waiting to reconnect"}
          </span>
          <button onClick={onMenu}>{menuLabel}</button>
        </div>
      </div>}
      <div className="sd-layout">
        <aside className="sd-players">
          <div
            className="sd-player-list"
            role="region"
            aria-label="Civilization roster"
            tabIndex={0}
          >
            {view.seats.map((seat) => (
              <button
                className={`sd-player ${seat.id === view.activeSeatId ? "sd-active" : ""}`}
                key={seat.id}
                style={{ "--owner": color(seat.id) } as CSSProperties}
                onClick={() => {
                  setReviewAi(false);setAiDismissed(true);
                  setPlayerId(seat.id);
                  setScreen("Players");
                }}
              >
                <span className="sd-owner"><FactionSymbol faction={seat.faction}/></span>
                <div>
                  <strong>{faction(seat.id)?.name ?? seat.faction}{seat.traitor && <span className="dg-traitor-marker"> · Traitor −2</span>}</strong>
                  <small>
                    {seat.id === own.id
                      ? playerNames[seat.id]?`You · ${playerNames[seat.id]}`:"You"
                      : seat.controller === "ai"
                        ? "Normal AI"
                        : playerNames[seat.id]??"Human"}{" "}
                    ·{" "}
                    {seat.eliminated
                      ? "eliminated"
                      : seat.passed
                        ? "passed"
                        : seat.id === view.activeSeatId
                          ? "active"
                          : "waiting"}
                  </small>
                </div>
                <span className="dg-roster-vp" title={view.phase === "finished" ? "Final victory points" : "Public victory points; reputation excluded"}>{liveScores.find(score => score.playerId === seat.id)!.total}<small>VP</small></span>
              </button>
            ))}
          </div>
          {compact&&aiFailure&&<div className="dg-mobile-ai-recovery" role="alert"><p>{aiFailure}</p><button disabled={blocked} onClick={onRetryAi}>AI paused · retry</button></div>}
          <AiActivityBar following={followAi} onFollowChange={enabled=>{setFollowAi(enabled);setAiDismissed(false);if(!enabled)setReviewAi(false);}} humanDecision={!!view.pendingDecision} paused={!!aiFailure} actor={aiPresentation.actor} recent={aiPresentation.recent} humanTurn={!!view.pendingDecision||(!view.waitingFor&&view.activeSeatId===own.id)} finished={view.phase==='finished'} motionEnabled={motionEnabled} onMotionChange={changeMotion} onWatch={()=>{if(compact)setMobileSheet('peek');setFollowAi(true);setAiDismissed(false);setReviewAi(!aiPresentation.actor);setHistoryOpen(false);setScreen('Galaxy');setCamera(null);setFitRequest(n=>n+1);}}/>
        </aside>
        <section className="sd-main" ref={workspaceRef}>
          {view.pendingDecision && (screen === "Galaxy" || screen === "Decision") ? (
            <div className="sd-workspace">
              {['combat-allocation','combat-split-damage','combat-turn','retreat','initiative-order','bombardment'].includes(view.pendingDecision.kind)&&<BattleOverview view={view}/>}
              <DecisionPanel
                view={view}
                targetLabels={Object.fromEntries(
                  view.ships.map((ship) => [
                    ship.id,
                    `${faction(ship.owner)?.name ?? humanize(ship.owner)} · ${humanize(ship.type)} #${view.ships.filter((s) => s.owner === ship.owner && s.type === ship.type).findIndex((s) => s.id === ship.id) + 1}`,
                  ]),
                )}
                key={view.pendingDecision.id}
                decision={view.pendingDecision}
                candidates={candidates}
                reputation={view.private.reputation}
                disabled={blocked}
                onSubmit={onSubmit}
              />
            </div>
          ) : compact&&screen==='Activity' ? <div className="sd-workspace dg-mobile-activity"><h1>Activity</h1>{activityRecap}<HistoryPanel feed={history??{entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}}/></div>
          : compact&&screen==='Empire' ? <div className="sd-workspace dg-mobile-empire"><h1>Your empire</h1>{draftGuard.draftKeys.length>0&&!view.pendingDecision&&<button className="dg-mobile-resume-draft" onClick={resumeSavedAction}>Resume saved action</button>}<p>Research, ships and resources</p><div className="dg-mobile-empire-grid">{[{screen:'Research',label:'Research technologies',detail:'Market & researched effects'},{screen:'Blueprints',label:'Ship blueprints',detail:'Inspect or upgrade your fleet'},{screen:'Trade',label:'Trade resources',detail:'Convert money, science or materials'},{screen:'Diplomacy',label:'Diplomacy',detail:'Ambassadors & relations'},{screen:'Scoring',label:'Score breakdown',detail:'Public points & final scoring'}].map(item=><button key={item.screen} aria-label={item.label} onClick={()=>{setScreen(item.screen);setMobileSheet('closed');if(item.screen==='Research')setAction('research');if(item.screen==='Blueprints'){setAction('upgrade');setPlayerId(own.id);}}}><strong>{item.label}</strong><small>{item.detail}</small></button>)}</div></div>
          : screen === "Trade" ? (
            <div className="sd-workspace"><TradePanel view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit}/></div>
          ) : screen === "Scoring" ? (
            <div className="sd-workspace">
              <p className="sd-eyebrow">FINAL SCORING</p>
              <h1>{view.phase === "finished" ? "Final standings" : "Public victory points"}</h1>
              <p>
                {view.phase === "finished" ? "Final totals include revealed reputation. Remaining resources break ties." : "Points from the current board. Reputation is hidden and excluded for everyone until final scoring; control and diplomacy may still change."}
              </p>
              {[...liveScores]
                .sort(
                  (a, b) =>
                    b.total - a.total || b.resourceTotal - a.resourceTotal,
                )
                .map((score, rank) => (
                  <details className="dg-score" key={score.playerId}>
                    <summary>
                      {rank + 1}. {faction(score.playerId)?.name} ·{" "}
                      {score.total} points{rank === 0 && view.phase === "finished" ? " · Winner" : ""}
                    </summary>
                    <dl>
                      {Object.entries(score)
                        .filter(
                          ([key]) =>
                            !["playerId", "total", "resourceTotal"].includes(
                              key,
                            ),
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{humanize(key)}</dt>
                            <dd>{key === "reputation" && view.phase !== "finished" ? "Hidden until game end" : value}</dd>
                          </div>
                        ))}
                    </dl>
                  </details>
                ))}
            </div>
          ) : screen === "Diplomacy" ? (
            <div className="sd-workspace"><DiplomacyPanel view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit}/></div>
          ) : screen === "Players" ? (
            <div className="sd-workspace">
              <p className="sd-eyebrow">PLAYER INSPECTOR</p>
              <h1>{faction(inspectedPlayer.id)?.name}</h1>
              <p className="sd-muted">Public player board · {runningScore(view, inspectedPlayer.id).breakdown.total} {view.phase === "finished" ? "final" : "public"} VP</p>
              <dl>
                <dt>Money</dt>
                <dd>{inspectedPlayer.resources.money}</dd>
                <dt>Science</dt>
                <dd>{inspectedPlayer.resources.science}</dd>
                <dt>Materials</dt>
                <dd>{inspectedPlayer.resources.materials}</dd>
                <dt>Ambassadors</dt>
                <dd>{inspectedPlayer.ambassadors.length}</dd>
                <dt>Traitor</dt>
                <dd>{inspectedPlayer.traitor ? "Yes · −2 points" : "No"}</dd>
              </dl>
              <button onClick={() => {setEditing(null); setScreen("Blueprints");}}>
                Compare this player's ships
              </button>
              <DiplomacyPanel view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit} inspectedSeatId={inspectedPlayer.id}/>
              <h2 className="dg-player-technologies-title">Researched technologies</h2>
              <div className="dg-player-technologies">
                {Object.entries(inspectedPlayer.technologies).map(([track, ids]) => <section key={track}><h3>{humanize(track)}</h3>{ids.map(id => {
                  const tech = TECHNOLOGIES.find(t => t.id === id)!;
                  return <details key={id}><summary>{tech.name}</summary><TechnologyStats technology={tech}/><p>{describeTechnology(tech)}</p></details>;
                })}{ids.length === 0 && <p>No technologies</p>}</section>)}
              </div>
            </div>
          ) : screen === "Blueprints" ? (
            <div className="sd-workspace">
              <p className="sd-eyebrow">PUBLIC BLUEPRINTS</p>
              <div className="dg-blueprint-heading"><h1>Ship blueprints</h1>
              <label className="dg-blueprint-owner">Civilization <select aria-label="Blueprint civilization" value={inspectedPlayer.id} onChange={event => {setPlayerId(event.target.value); setEditing(null);}}>{view.seats.map(seat => <option key={seat.id} value={seat.id}>{faction(seat.id)?.name}{seat.id === own.id ? " (you)" : ""}</option>)}</select></label></div>
              <nav className="dg-class-selector" aria-label="Ship classes">
                {inspectedPlayer.blueprints.map(bp => <button key={bp.shipType} aria-pressed={editing === bp.shipType} onClick={() => {setEditing(bp.shipType); setAction("upgrade");}}>{humanize(bp.shipType)}</button>)}
                <button aria-pressed={editing === null} onClick={() => setEditing(null)}>All loadouts</button>
              </nav>
              {editing && inspectedPlayer.id === own.id ? (
                <BlueprintEditor
                  key={`${editing}-${view.revision}`}
                  view={view}
                  initialDraft={blueprintDrafts.revision === view.revision ? blueprintDrafts.drafts[editing] : undefined}
                  onDraftChange={rememberBlueprintDraft}
                  faction={own.faction}
                  blueprint={publicBlueprint(
                    own.blueprints.find((bp) => bp.shipType === editing)!,
                  )}
                  technologies={
                    Object.values(own.technologies).flat() as TechnologyId[]
                  }
                  storedParts={(own.storedParts ?? []) as AncientShipPartId[]}
                  capacity={
                    view.actionProgress?.action === "upgrade"
                      ? view.actionProgress.remaining
                      : own.passed
                        ? 1
                        : BASE_FACTIONS.find((f) => f.id === own.faction)!
                            .activations.upgrade +
                          (Object.values(own.technologies)
                            .flat()
                            .includes("pico-modulator")
                            ? 2
                            : 0)
                  }
                  disabled={
                    blocked ||
                    view.activeSeatId !== own.id ||
                    view.phase !== "action" ||
                    (!!view.actionProgress &&
                      view.actionProgress.action !== "upgrade") ||
                    (!view.actionProgress && own.influenceOnTrack === 0)
                  }
                  onSubmit={onSubmit}
                />
              ) : (
                <div className="dg-blueprints">
                  {inspectedPlayer.blueprints.filter(bp => editing === null || bp.shipType === editing).map((bp) => (
                    <section key={bp.shipType} className="dg-loadout-card">
                      <header><ShipSilhouette type={bp.shipType}/><h2>{humanize(bp.shipType)}</h2></header>
                      {(() => {
                        const stats = deriveBlueprintStats(
                          inspectedPlayer.faction,
                          publicBlueprint(bp),
                        );
                        const yours = own.blueprints.find(
                          (b) => b.shipType === bp.shipType,
                        );
                        const ownStats = yours
                          ? deriveBlueprintStats(
                              own.faction,
                              publicBlueprint(yours),
                            )
                          : null;
                        return (
                          <>
                            <p>
                              Hull {stats.hull} · move {stats.movement} ·
                              initiative {stats.initiative}
                            </p>
                            <p>
                              Computer +{stats.computer} · shield −
                              {stats.shield} · energy{" "}
                              {stats.energyProduction - stats.energyConsumption}
                            </p>
                            <p>
                              {stats.weapons
                                .map((w) => `${w.dice} ${w.color} ${w.kind}`)
                                .join(" · ") || "No weapons"}
                            </p>
                            {inspectedPlayer.id !== own.id && ownStats && (
                              <p className="dg-compare">
                                Your {bp.shipType}: hull {ownStats.hull}, move{" "}
                                {ownStats.movement}, initiative{" "}
                                {ownStats.initiative}, computer +
                                {ownStats.computer}, shield −{ownStats.shield}
                              </p>
                            )}
                          </>
                        );
                      })()}
                      {effectiveBlueprintParts(
                        inspectedPlayer.faction,
                        publicBlueprint(bp),
                      ).map((part, i) => (
                        <div className="dg-part" key={i}>
                          <strong>{part ? humanize(part) : "Empty slot"}</strong>
                          {part && <ShipPartStats partId={part}/>}
                        </div>
                      ))}
                      {publicBlueprint(bp).outsideParts.map((part, i) => (
                        <div className="dg-part" key={`outside-${i}`}>
                          <strong>{humanize(part)} · outside grid</strong><ShipPartStats partId={part}/>
                        </div>
                      ))}
                      {inspectedPlayer.id === own.id && (
                        <button
                          onClick={() => {
                            setEditing(bp.shipType);
                            setAction("upgrade");
                          }}
                        >
                          Edit {bp.shipType}
                        </button>
                      )}
                    </section>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setEditing(null);
                  setPlayerId(own.id);
                  activate("upgrade");
                }}
              >
                Edit your blueprint
              </button>
              <p className="sd-muted">
                All ships of a class use the same blueprint. Your unconfirmed drafts are kept when switching classes.
              </p>
            </div>
          ) : screen === "Research" ? (
            <ResearchWorkspace view={view} purchases={purchases} selected={researchSelection as TechnologyId|null} draft={draft} disabled={blocked} stale={draftGuard.stale} stillLegal={!!stillLegal} acquired={acquiredResearch} onSelect={(id,owned)=>{setResearchSelection(id);if(compact){setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(!owned);}if(inspectorRef.current)inspectorRef.current.scrollTop=0;}} onDraft={setDraft} onSubmit={onSubmit}/>
          ) : (
            <>
              <div className="sd-map-heading">
                <div>
                  <p className="sd-eyebrow">THE GALAXY</p>
                  <h1>
                    {sector
                      ? `Sector ${sector.tileId}`
                      : `Round ${view.round} galaxy`}
                  </h1>
                </div>
                <span>{view.sectors.length} sectors</span>
              </div>
              <GalaxyBoard compact={compact} camera={camera??undefined} onCameraChange={setCamera} fitRequest={fitRequest} activity={aiPresentation.activity} targetLabel={moveOpen?"legal move destination":"legal influence target"} view={view} candidates={moveOpen||action!=="explore"?candidates.filter(c=>c.command.type!=="explore"):candidates} selected={selected} legalTargetIds={moveOpen?moveTargets:action==='influence'?influenceTargets:[]} onSelect={id=>{
                setHistoryOpen(false);setSelected(id);setReviewAi(false);setAiDismissed(true);if(compact){setMobileSheet(moveOpen&&moveTargets.includes(id)?'expanded':'peek');setMobileActionsOpen(false);}
                if(moveOpen){
                  if(!moveSource||(!moveTargets.includes(id)&&view.ships.some(ship=>ship.sectorId===id&&ship.owner===own.id))){setMoveSource(id);setMoveTarget(null);}
                  else setMoveTarget(id);
                } else if(action === "build" && view.sectors.some(s=>s.id===id&&s.owner===own.id)) setBuildOpen(true);
              }} onExplore={candidate => { if(compact){setMobileSheet('expanded');setMobileActionMode(true);setMobileActionsOpen(false);} setMoveOpen(false);setMoveTargets([]);setHistoryOpen(false); setAction("explore"); setDraft(candidate); setActionFocus(n=>n+1); }} />
            </>
          )}
        </section>
        <aside className={`sd-inspector ${historyOpen ? "dg-inspector-history" : ""}${compact?' dg-mobile-sheet':''}`} data-sheet-state={compact?(buildOpen?'closed':mobileSheet):undefined} ref={inspectorRef} aria-label="Selection and action details">
          {compact&&<div className="dg-mobile-sheet-header"><button className="dg-mobile-sheet-expand" aria-label={`${mobileSheet==='expanded'?'Collapse':'Expand'} ${mobileActionsOpen?'Actions':showAiPanel?'AI action':mobileActionMode?humanize(action):screen==='Research'?'Technology':sector?`Sector ${sector.tileId}`:'Details'} details`} onClick={()=>setMobileSheet(mobileSheet==='expanded'?'peek':'expanded')}><span aria-hidden="true">{mobileSheet==='expanded'?'⌄':'⌃'}</span><strong>{mobileActionsOpen?'Choose an action':showAiPanel?'AI action':mobileActionMode?humanize(action):screen==='Research'?'Technology':sector?`Sector ${sector.tileId}`:'Details'}</strong><small>{mobileSheet==='expanded'?'Show galaxy':'View details'}</small></button><button aria-label="Dismiss details" onClick={()=>{setMobileSheet('closed');setMobileActionsOpen(false);setAiDismissed(true);}}>×</button></div>}
          <div ref={mobileSheetBodyRef} className={compact?'dg-mobile-sheet-body':undefined}>
          {compact&&mobileActionsOpen?<>{draftGuard.draftKeys.length>0&&!view.pendingDecision&&<button className="dg-mobile-resume-draft" onClick={resumeSavedAction}>Resume saved action</button>}<MobileActionPicker options={mobileActionOptions} onSelect={activate}/></>:''}
          <div hidden={compact&&mobileActionsOpen}>

          {historyOpen ? <HistoryPanel feed={history ?? {entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}}/> : showAiPanel && aiPresentation.action ? <><button onClick={()=>{setAiDismissed(true);setReviewAi(false);}}>Return to inspector</button><AiActionPanel view={view} entry={aiPresentation.action} onInspectSector={id=>{setSelected(id);setScreen('Galaxy');setAiDismissed(true);setReviewAi(false);if(compact)setMobileSheet('peek');}}/></> : moveOpen && screen === "Galaxy" ? <>
            <button onClick={()=>{setMoveSource(null);setMoveTarget(null);setMoveTargets([]);}}>Change departure sector</button>
            <MovementPlanner key={moveSource} view={view} sourceSectorId={moveSource} selectedTargetId={moveTarget} disabled={blocked||!!lastAcceptedCommand&&lastAcceptedCommand.revision>view.revision} result={movementResult} onDone={candidates.some(candidate=>candidate.command.type==='end-action')?()=>{const command:GameCommand={type:'end-action'};if(previewCommand(view,command).betrayedPartners.length)activate('end-action');else onSubmit(command);}:undefined} onTargetsChange={setMoveTargets} onClose={()=>{setMoveOpen(false);setMoveTargets([]);}} onSubmit={command=>{pendingMove.current={receipt:lastAcceptedCommand,ships:command.type==='move'?new Set(command.moves.map(move=>move.shipId)).size:0};setMovementResult('');onSubmit(command);}}/>
          </> : screen === 'Galaxy' && action === 'influence' && !view.pendingDecision ? <InfluencePlanner key={view.revision} view={view} candidates={candidates} selectedSectorId={selected} onLegalTargetIdsChange={setInfluenceTargets} disabled={blocked} onSubmit={onSubmit}/>
          : screen === 'Galaxy' && action === 'colonize' && !view.pendingDecision ? <ColonizationPlanner key={view.revision} view={view} candidates={candidates} selectedSectorId={selected} disabled={blocked} onSubmit={onSubmit}/>
          : <>
          <p className="sd-eyebrow">
            {view.phase === "finished" ? "FINAL RESULTS" : screen === "Research" ? "TECHNOLOGY" : screen === "Blueprints" ? "SHIPYARD" : screen === "Trade" ? "RESOURCE EXCHANGE" : "SECTOR INSPECTOR"}
          </p>
          {view.pendingDecision && screen === "Decision" ? (
            <><h2>{humanize(view.pendingDecision.kind)}</h2><p>Resolve the choice in the main panel. You can inspect technologies, ships, diplomacy, and public scores before returning to Decision.</p>{view.battle && ['combat-allocation','combat-split-damage','combat-turn','retreat','initiative-order','bombardment'].includes(view.pendingDecision.kind) && <p>Battle in sector {view.battle.sectorId}. Damage and dice are saved; your allocations and retreat remain under your control.</p>}{view.pendingDecision.kind==='reputation'&&<p>Only you can see these reputation values. Choose which tiles to keep before combat aftermath continues.</p>}</>
          ) : screen === "Research" ? (
            <><h2>Research in place</h2><p>Select, compare, fund, and acquire technology in the research workspace.</p></>
          ) : screen === "Trade" ? (
            <><h2>Resource exchange</h2><p>Choose what to receive, adjust the amount, and select which resource pays for it.</p><p>Trading does not use an action disc. Your money after trading changes what you can afford at upkeep.</p></>
          ) : screen === "Blueprints" ? (
            <>
              <h2>{editing ? `${humanize(editing)} loadout` : "Fleet blueprints"}</h2>
              <p>{faction(inspectedPlayer.id)?.name} · current installed parts</p>
              {editing ? <div className="dg-current-loadout">{effectiveBlueprintParts(inspectedPlayer.faction, publicBlueprint(inspectedPlayer.blueprints.find(bp => bp.shipType === editing)!)).map((part, index) => <div key={index}><strong>{index+1}. {part ? humanize(part) : "Empty slot"}</strong>{part && <ShipPartStats partId={part}/>}</div>)}</div> : <p>Select any ship class above, or use All loadouts to compare the fleet. Draft changes do not affect ships until confirmed.</p>}
            </>
          ) : screen === "Diplomacy" || screen === "Players" ? (
            <><h2>Diplomacy & trust</h2><p>Ambassadors are public and worth 1 VP each. Reputation values remain private until the game ends.</p><p>Ending your action with ships in a partner’s sector or with their ships breaks that relationship. Passing through while unpinned is allowed. The aggressor takes the traitor card: −2 VP and no new diplomatic relations while holding it.</p><p>The card transfers when another player betrays a diplomatic partner.</p></>
          ) : view.phase === "finished" ? (
            <>
              <h2>Scoring explained</h2>
              <p>
                Each civilization’s total includes controlled sectors,
                structures, research tracks, reputation, discoveries,
                ambassadors, faction abilities and traitor penalties.
              </p>
            </>
          ) : sector ? (
            <>
              <h2>Sector {sector.tileId}</h2>
              <p>
                {sector.owner ? faction(sector.owner)?.name : "Uncontrolled"} ·
                orientation {sector.rotation * 60}°
              </p>
              <h3>Fleet</h3>
              <SectorFleet view={view} sectorId={sector.id}/>
              <SectorPlanets sector={sector} view={view} candidates={candidates}/>
              <h3>Connections & movement</h3>
              <p>
                {view.sectors
                  .filter(
                    (to) =>
                      connectionBetween(
                        mapSector(sector),
                        mapSector(to),
                        movementAbilities(own).wormholeGenerator,
                      ) !== "none",
                  )
                  .map(
                    (to) =>
                      `${to.tileId} (${connectionBetween(mapSector(sector), mapSector(to), movementAbilities(own).wormholeGenerator)})`,
                  )
                  .join(", ") || "No usable connections to explored sectors."}
              </p>
              {view.ships
                .filter(
                  (ship) =>
                    ship.owner === own.id && ship.sectorId === sector.id,
                )
                .map((ship) => {
                  const bp = own.blueprints.find(
                    (b) => b.shipType === ship.type,
                  );
                  const stats = bp
                    ? deriveBlueprintStats(own.faction, publicBlueprint(bp))
                    : null;
                  const movable = movableShipCount(
                    own.id,
                    sector.id,
                    view.ships.map((s) => ({
                      id: s.id,
                      owner: s.owner,
                      sectorId: s.sectorId,
                      kind: s.type,
                      movement: 0,
                    })),
                    movementAbilities(own),
                  );
                  return (
                    <p key={ship.id}>
                      {humanize(ship.type)}:{" "}
                      {ship.type === "starbase"
                        ? "Immobile starbase"
                        : movable === 0
                          ? "Pinned by opposing ships; no ship can leave."
                          : `${stats?.movement ?? 0} range; ${movable} friendly ships may leave without exceeding pinning limits.`}
                    </p>
                  );
                })}
            </>
          ) : (
            <>
              <h2>{screen === "Research" ? "Choose a technology" : screen === "Blueprints" ? "Prepare your fleet" : "Select a sector"}</h2>
              <p>{screen === "Research" ? "Select a technology card to inspect its effect and research cost before confirming." : screen === "Blueprints" ? "Select a ship to compare its parts, then edit your blueprint to preview an upgrade." : "Inspect a tile to see its planets, fleets, ownership and usable connections."}</p>
            </>
          )}
          {view.phase !== "finished" && screen !== "Trade" && ['explore','end-action'].includes(action) &&
            (!view.pendingDecision ||
              (view.pendingDecision.kind === "bankruptcy" &&
                action === "trade") ||
              (action === "discard-reputation" &&
                ["diplomacy", "diplomacy-window"].includes(
                  view.pendingDecision.kind,
                ))) && (
              <div className="dg-action-panel" ref={actionPanelRef}>
                <p className="sd-eyebrow">{humanize(action).toUpperCase()}</p>
                <ActionEconomy view={view} action={action} preview={draftPreview}/>
                {available.length === 0 ? (
                  <p>
                    {view.pendingDecision
                      ? "Finish your current decision first."
                      : view.activeSeatId !== own.id
                        ? "Waiting for your turn."
                        : "No legal options. Check resources, technology, range, pinning, and remaining activations."}
                  </p>
                ) : action === 'explore' && !draft ? <p>Select a highlighted frontier hex on the galaxy to explore.</p>
                  : action === 'research' && researchSelection ? (()=>{
                    const options=available.filter(c=>{const command=c.command.type==='trade-and-act'?c.command.action:c.command;return command.type==='research'&&command.tileId===researchSelection;});
                    const selectedCommand=draft?.command.type==='trade-and-act'?draft.command.action:draft?.command;
                    return options.length>1?<ChoiceCards label="Research track" value={selectedCommand?.type==='research'?selectedCommand.track:''} disabled={blocked} onChange={track=>setDraft(options.find(c=>{const command=c.command.type==='trade-and-act'?c.command.action:c.command;return command.type==='research'&&command.track===track;})??null)} options={options.flatMap(c=>{const command=c.command.type==='trade-and-act'?c.command.action:c.command;return command.type==='research'?[{value:command.track,label:humanize(command.track),description:`${own.technologies[command.track].length} / 7 researched`,visual:<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 2h12v16H4Z M7 6h6M7 10h6M7 14h6" fill="none" stroke="currentColor"/></svg>}]:[];})}/>:null;
                  })():null}
                {draft && (
                  <>
                    <h3>{draft.label}</h3>
                    {draft.command.type === "trade-and-act" ? <FundingPlanSelector view={view} command={draft.command} disabled={blocked} onChange={command=>setDraft({...draft,command})}/> : <p>{draft.description}</p>}
                    {!!draftPreview?.betrayedPartners.length && <p className="dg-danger">Breaks diplomacy with {draftPreview.betrayedPartners.map(id => faction(id)?.name ?? id).join(", ")}. You take the traitor card (−2 VP), return these ambassadors, and cannot form new relations while holding it.</p>}
                    <button
                      className="sd-primary"
                      disabled={blocked || draftGuard.stale || !stillLegal}
                      onClick={() => {
                        onSubmit(draft.command);
                      }}
                    >
                      {draft.command.type === "end-action" ? "End action and break diplomacy" : draft.command.type === "trade-and-act" ? `Convert & ${draft.command.action.type}` : "Confirm action"}
                    </button>
                    <button onClick={() => setDraft(null)}>Cancel draft</button>
                  </>
                )}
              </div>
            )}
          </>}
          </div></div>
        </aside>
      </div>
      {buildOpen && <BuildPlanner key={`${view.revision}-${selected}`} view={view} sectorId={selected} disabled={blocked} onClose={()=>setBuildOpen(false)} onSubmit={command=>{onSubmit(command);setBuildOpen(false);}}/>}
      {!compact&&<footer className="sd-footer">
        <div className="sd-actions">
          {(
            [
              "explore",
              "influence",
              "research",
              "upgrade",
              "build",
              "move",
              "colonize",
              "trade",
              "discard-reputation",
              "offer-diplomacy",
              "pass",
              "end-action",
              "finish-upkeep",
            ] as GameCommand["type"][]
          )
            .filter(
              (type) =>
                [
                  "explore",
                  "influence",
                  "research",
                  "upgrade",
                  "build",
                  "move",
                ].includes(type) ||
                candidates.some((c) => c.command.type === type),
            )
            .map((type) => (
              <button
                key={type}
                aria-pressed={
                  action === type &&
                  !view.pendingDecision &&
                  view.phase === "action"
                }
                title={
                  view.pendingDecision
                    ? "Resolve the pending decision first."
                    : undefined
                }
                disabled={
                  view.phase === "finished" ||
                  (directTurnActions.includes(type) && blocked) ||
                  ([
                    "explore",
                    "influence",
                    "research",
                    "upgrade",
                    "build",
                    "move",
                  ].includes(type) &&
                    (Boolean(view.pendingDecision) || view.phase !== "action"))
                }
                onClick={() => activate(type)}
              >
                {humanize(type)}
              </button>
            ))}
        </div>
          <div className="sd-note">
            <small>YOUR NEXT DECISION</small>
            <p>
              {view.pendingDecision
                ? humanize(view.pendingDecision.kind)
                : view.phase === "finished"
                  ? "Review the final scoring breakdown."
                  : view.actionProgress
                    ? `${humanize(view.actionProgress.action)} · ${view.actionProgress.remaining} activations remaining`
                    : view.waitingFor
                      ? `Waiting for ${faction(view.waitingFor.owner)?.name ?? view.waitingFor.owner}: ${humanize(view.waitingFor.kind)}`
                      : view.activeSeatId === own.id
                        ? "Choose an action below."
                        : "An opponent is taking its turn."}
            </p>
            <p>
              {own.colonyShipsAvailable} colony ships · {own.influenceOnTrack}{" "}
              influence discs
            </p>
          </div>
        <div className="sd-status" role="status">
          {status ||
            (!connected
              ? "Submission is disabled until the server reconnects."
              : "Every accepted command saves automatically.")}
        </div>
      </footer>}
      {compact&&status&&!/^(Saved|Saving|Applied to the isolated|Engine fixture review)/.test(status)&&<div className="dg-mobile-feedback" role="status" aria-live="polite">{status}</div>}
      {compact&&<MobileNavigation selected={mobileDestination} onSelect={mobileNavigate} onActions={!view.pendingDecision&&view.phase!=='finished'&&view.activeSeatId===own.id&&!mobileActionMode?()=>{setMobileActionsOpen(true);setMobileSheet('expanded');setHistoryOpen(false);setAiDismissed(true);}:undefined} pending={!!view.pendingDecision&&screen!=='Decision'} onDecision={()=>{setScreen('Decision');setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(false);}} onConfirm={mobileActionMode&&draft&&action!=='research'?{label:draft.command.type==='trade-and-act'?'Convert & confirm':'Confirm',disabled:blocked||draftGuard.stale||!stillLegal,submit:()=>onSubmit(draft.command)}:undefined} onEndAction={mobileActionMode&&!draft&&candidates.some(candidate=>candidate.command.type==='end-action')?()=>activate('end-action'):undefined} actionLabel={mobileActionMode?`${humanize(action)}${view.actionProgress?` · ${view.actionProgress.remaining} left`:''}`:undefined} onBack={()=>{setMobileActionMode(false);setMobileSheet('closed');setMobileActionsOpen(false);setScreen('Galaxy');}} onDetails={mobileActionMode?()=>{if(action==='build')setBuildOpen(true);else setMobileSheet('expanded');}:undefined}/>}
    </main>
  );
}
