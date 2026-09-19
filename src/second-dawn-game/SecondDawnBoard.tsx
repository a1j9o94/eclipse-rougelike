import FactionAbilityControls from './FactionAbilityControls';
import {remainingAction,continuesAction} from './actionCapacity';
import {seatColor} from './factionColors';
import {useSoundscape} from './sound/useSoundscape';
import {useCombatVolleySounds} from './sound/useCombatVolleySounds';
import {useGameSoundFeedback} from './sound/useGameSoundFeedback';
import ChoiceWorkspace from './ChoiceWorkspace';
import AutoPassControl from './AutoPassControl';
import SectorDecks from './SectorDecks';
import ReputationSummary from './ReputationSummary';
import {useAutomaticReputation} from './useAutomaticReputation';
import {choiceLabel} from './choiceLabels';
import {rosterTurnOrder} from './turnOrder';
import {firstPassMoney, passButtonLabel} from '../../shared/eclipse/passing';
import {AI_DIFFICULTY_LABELS, type AiDifficulty} from '../../shared/eclipse/aiConfig';
import EmpireOverview from './EmpireOverview';
import GameSettingsPanel from './GameSettingsPanel';
import {DiceRollScopeContext} from './presentationSettings';
import {PublicInspectionProvider,usePublicInspection} from './PublicInspectionContext';
import PublicInspectionModal from './PublicInspectionModal';
import ScoreWorkspace from './ScoreWorkspace';
import MovementBattlePreview from './MovementBattlePreview';
import FleetInspection from './FleetInspection';
import {addBuildItem,emptyBuildOrder} from './buildPlanning';
import {empireBuildOptions} from './empireBuildOptions';
import type {MovementRoutePreview} from './movementPlanning';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties,ReactNode } from "react";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import { getFaction } from "../../shared/eclipse/catalog";
import {
  incomeForPopulationAway,
} from "../../shared/eclipse/tracks";
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
import {getShipPart} from "../../shared/eclipse/parts";
import type { AncientShipPartId } from "../../shared/eclipse/discoveries";
import type { TechnologyId } from "../../shared/eclipse/technologies";
import BlueprintEditor from "./BlueprintEditor";
import DecisionPanel from "./DecisionPanel";
import GalaxyBoard from "./GalaxyBoard";
import SectorPlanets from "./SectorPlanets";
import SectorFleet from "./SectorFleet";
import UpkeepSummary from "./UpkeepSummary";
import ActionEconomy from "./ActionEconomy";
import HistoryPanel,{type HistoryRollbackControl} from "./HistoryPanel";
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
import BattleOverview, {CombatPlayback} from "./BattleOverview";
import {latestCombatPlayback} from "./combatPlayback";
import {useCombatResultNotice} from './useCombatResultNotice';
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
import './choiceWorkspace.css';
import {ActionDraftProvider} from './ActionDraftProvider';
import {useActionDraftGuard,useActionDraftState} from './actionDraftContext';
import ActionDraftNotice from './ActionDraftNotice';
import ResearchWorkspace from './ResearchWorkspace';
import TurnAttentionNotice from './TurnAttentionNotice';
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
  historyRollback?:HistoryRollbackControl;
  interactionBlockedReason?:string;
  showCombatOdds?:boolean;
  aiDifficulty?: AiDifficulty;
  aiThinking?: boolean;
  aiTakeover?: boolean;
  aiFailure?: string | null;
  onRetryAi?: () => void;
  view: PlayerView;
  candidates: CommandCandidate[];
  connected: boolean;
  busy: boolean;
  status: string;
  onSubmit: (command: GameCommand) => void;
  onMenu: () => void;
  onHome?: () => void;
  onPlayAgain?: () => void;
}
const directTurnActions:GameCommand["type"][] = ["end-action","pass","finish-upkeep"];

const humanize = (text: string) =>
  text.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
export default function SecondDawnBoard(props:Props){
 useSoundscape();
 return <DiceRollScopeContext.Provider value={`${props.matchId??'preview'}:${props.view.viewerSeatId}`}><ActionDraftProvider matchId={props.matchId} viewerSeatId={props.view.viewerSeatId} revision={props.view.revision} lastAcceptedCommand={props.lastAcceptedCommand}><PublicInspectionProvider><SecondDawnBoardContent {...props}/></PublicInspectionProvider></ActionDraftProvider></DiceRollScopeContext.Provider>;
}
function SecondDawnBoardContent({
  view,
  candidates,
  connected,
  busy,
  status,
  onSubmit:submitAuthoritative,
  onMenu,
  onHome,
  onPlayAgain,
  aiDifficulty='normal',
  aiThinking=false,
  aiTakeover=false,
  aiFailure,
  onRetryAi,
  reviewMode = false,
  initialSectorId,
  history,
  historyRollback,
  interactionBlockedReason,
  showCombatOdds=false,
  turnClock,
  menuLabel='Game menu',
  playerNames={},
  activityRecap,
  lastAcceptedCommand,
  recapOpen=false,
  matchId,
}: Props) {
  const compact=useMobileLayout();
  useAutomaticReputation(view,connected,busy||!!interactionBlockedReason,submitAuthoritative);
  const reputationSummaryId=view.private.reputationSummary?.id;
  const [dismissedReputationId,setDismissedReputationId]=useState<string|null>(null);
  useEffect(()=>{if(!reputationSummaryId)return;const timer=setTimeout(()=>setDismissedReputationId(reputationSummaryId),10000);return()=>clearTimeout(timer);},[reputationSummaryId]);
  const publicInspection=usePublicInspection();
  const draftGuard=useActionDraftGuard();
  const submittedResearch=useRef<{id:TechnologyId;command:string}|null>(null);
  const submittedTurnHandoff=useRef<{receipt:Props['lastAcceptedCommand'];revision:number;type:GameCommand['type']}|null>(null);
  const onSubmit=(command:GameCommand)=>{if(interactionBlockedReason)return;if(command.type==='set-auto-pass'){submitAuthoritative(command);return;}if(draftGuard.stale&&!view.pendingDecision&&!directTurnActions.includes(command.type)){sound.rejected();return;}sound.submitted(command);submittedTurnHandoff.current={receipt:lastAcceptedCommand,revision:view.revision,type:command.type};const action=command.type==='trade-and-act'?command.action:command;if(action.type==='research')submittedResearch.current={id:action.tileId as TechnologyId,command:JSON.stringify(command)};draftGuard.markSubmitted(command);submitAuthoritative(command);};
  const [mobileSheet,setMobileSheet]=useState<'closed'|'peek'|'expanded'>('closed');
  const [mobileActionsOpen,setMobileActionsOpen]=useState(false);
  const [mobileActionMode,setMobileActionMode]=useState(false);
  const [mobileWorkspaceTop,setMobileWorkspaceTop]=useState(190);
  const [mobileBottomInset,setMobileBottomInset]=useState(62);
  const [followAi,setFollowAi]=useState(()=>{try{return localStorage.getItem('eclipse.second-dawn.follow-ai.v1')!=='off';}catch{return true;}});
  const [aiDismissed,setAiDismissed]=useState(false);
  const [reviewAi,setReviewAi]=useState(false);
  const [fitRequest,setFitRequest]=useState(0);
  const [historyOpen,setHistoryOpen] = useActionDraftState('historyOpen',false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [motionEnabled,setMotionEnabled]=useState(()=>{try{const saved=localStorage.getItem('eclipse.second-dawn.motion.v1');return saved?saved==='on':!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}});
  const aiPresentation=useAiPresentation(view,history?.entries??[],motionEnabled);
  useEffect(()=>{setReviewAi(false);},[aiPresentation.actor?.id]);
  const showAiPanel=followAi&&!aiDismissed&&!!aiPresentation.action&&(!!aiPresentation.actor||reviewAi)&&!view.pendingDecision;
  const changeFollowAi=(enabled:boolean)=>{setFollowAi(enabled);try{localStorage.setItem('eclipse.second-dawn.follow-ai.v1',enabled?'on':'off');}catch{/* Keep the session preference when storage is blocked. */}setAiDismissed(false);if(!compact&&screen==='Galaxy'){if(enabled&&aiPresentation.action&&(aiPresentation.actor||reviewAi)){setInspectorOpen(true);openedForAi.current=true;}else if(!enabled&&showAiPanel){setInspectorOpen(false);openedForAi.current=false;}}if(!enabled)setReviewAi(false);};
  function changeMotion(enabled:boolean){setMotionEnabled(enabled);try{localStorage.setItem('eclipse.second-dawn.motion.v1',enabled?'on':'off');}catch{/* The preference still applies for this session. */}}

  const [buildOpen,setBuildOpen]=useActionDraftState('buildOpen',false);
  const [buildOrder,setBuildOrder]=useActionDraftState('buildOrder',emptyBuildOrder);
  const [buildHereSector,setBuildHereSector]=useState<string|null>(null);
  const [buildTargets,setBuildTargets]=useState<readonly string[]>([]);
  const [buildPlacement,setBuildPlacement]=useState<{sectorId:string;serial:number}|null>(null);
  const [buildResult,setBuildResult]=useState('');
  const pendingBuild=useRef<{receipt:Props['lastAcceptedCommand'];type:GameCommand['type'];count:number}|null>(null);
  const [empireMapSeat,setEmpireMapSeat]=useState<string|null>(null);
  const [upkeepBrowsing,setUpkeepBrowsing]=useState(false);
  const browsingUpkeep=view.phase==='upkeep'&&upkeepBrowsing;
  const [inspectSector,setInspectSector]=useState<string|null>(null);
  const [inspectDiplomacy,setInspectDiplomacy]=useState<string|null>(null);
  const [movementDraft]=useActionDraftState('movement',{source:null,ids:[]});
  const [moveRoutePreviews,setMoveRoutePreviews]=useState<readonly MovementRoutePreview[]>([]);
  useEffect(()=>{
    const pending=pendingBuild.current;
    if(!pending||!lastAcceptedCommand||lastAcceptedCommand===pending.receipt||lastAcceptedCommand.type!==pending.type||view.revision<lastAcceptedCommand.revision)return;
    pendingBuild.current=null;setBuildResult(`${pending.count} ${pending.count===1?'piece deployed':'pieces deployed'} to your galaxy.`);
    if(!(view.phase==='action'&&view.activeSeatId===view.viewerSeatId&&!view.pendingDecision&&continuesAction(view,'build')&&remainingAction(view,'build')>0))setBuildOpen(false);
  },[lastAcceptedCommand,view,setBuildOpen]);
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
    const continuing=view.phase==='action'&&view.activeSeatId===view.viewerSeatId&&!view.pendingDecision&&continuesAction(view,'move')&&remainingAction(view,'move')>0;
    setMovementResult(`${pending.ships} ${pending.ships===1?'ship moved':'ships moved'}. ${continuing?'Choose your next ships and destination.':'Movement complete.'}`);
    if(!continuing)setMoveOpen(false);
  },[lastAcceptedCommand,view,setMoveTarget,setMoveOpen]);
  const [influenceTargets,setInfluenceTargets]=useState<string[]>([]);
  const [colonyTargets,setColonyTargets]=useState<readonly string[]>([]);
  const [selected, setSelected] = useActionDraftState('selectedSector',initialSectorId ?? null);
  const [screen, setScreen] = useActionDraftState('screen',
    view.phase === "finished" ? "Scoring" : "Galaxy",
  );
  const playback = latestCombatPlayback(view, history?.entries ?? []);
  const combatNotice=useCombatResultNotice(playback?.volleys.some(volley=>volley.targets.some(target=>target.destroyed))?playback.revision:null,view.revision,screen);
  const knownShips = useRef(new Map(view.ships.map(ship=>[ship.id,ship])));
  useEffect(()=>{for(const ship of view.ships)knownShips.current.set(ship.id,ship);},[view.ships]);
  const [inspectorOpen,setInspectorOpen]=useState(Boolean(initialSectorId)||historyOpen);
  const desktopInspectorVisible=inspectorOpen&&(screen==='Galaxy'||historyOpen);
  const pendingId = view.pendingDecision?.id;
  const diplomacyDecision = view.pendingDecision?.kind === 'diplomacy' || view.pendingDecision?.kind === 'diplomacy-window';
  const inspectingGalaxy = browsingUpkeep || empireMapSeat!==null || Boolean(view.pendingDecision) || view.phase === 'finished';
  const explorationPosition=view.pendingDecision?.kind==='exploration'?view.pendingDecision.position:null;
  const lastExplorationPosition=useRef(explorationPosition);
  useEffect(()=>{if(explorationPosition)lastExplorationPosition.current=explorationPosition;},[explorationPosition]);
  const newlyPlacedSector=lastExplorationPosition.current?view.sectors.find(sector=>sector.position.q===lastExplorationPosition.current?.q&&sector.position.r===lastExplorationPosition.current?.r)?.id:undefined;
  useEffect(()=>{if(newlyPlacedSector){setSelected(newlyPlacedSector);lastExplorationPosition.current=null;}},[newlyPlacedSector,setSelected]);
  const decisionSector=view.pendingDecision&&'sectorId' in view.pendingDecision?view.pendingDecision.sectorId:undefined;
  useEffect(()=>{if(decisionSector)setSelected(decisionSector);},[decisionSector,setSelected]);
  const previousUiReceipt=useRef(lastAcceptedCommand);
  useEffect(()=>{
    if(previousUiReceipt.current===lastAcceptedCommand)return;
    const previousReceipt=previousUiReceipt.current;
    previousUiReceipt.current=lastAcceptedCommand;
    if(lastAcceptedCommand&&lastAcceptedCommand.type!=='set-auto-pass'&&(!previousReceipt||lastAcceptedCommand.revision>previousReceipt.revision)&&!submittedTurnHandoff.current)submittedTurnHandoff.current={receipt:previousReceipt,revision:previousReceipt?.revision??-1,type:lastAcceptedCommand.type};
    if(lastAcceptedCommand?.type==='end-action'){setMoveOpen(false);setBuildOpen(false);setMoveTargets([]);}
  },[lastAcceptedCommand,setMoveOpen,setBuildOpen]);

  useEffect(()=>{
    const pending=submittedTurnHandoff.current;
    if(!pending||!lastAcceptedCommand||lastAcceptedCommand.revision<=pending.revision||lastAcceptedCommand.type!==pending.type||view.revision<lastAcceptedCommand.revision)return;
    if(pendingId||view.phase==='finished'){submittedTurnHandoff.current=null;return;}
    const controlOwner=view.waitingFor?.owner??view.activeSeatId;
    submittedTurnHandoff.current=null;
    if(controlOwner===view.viewerSeatId)return;
    // This is the one acknowledged transfer of control; later activity must not undo navigation.
    setAiDismissed(false);setReviewAi(false);setScreen('Galaxy');setInspectorOpen(false);
    if(compact){setMobileSheet('closed');setMobileActionMode(false);}
  },[compact,lastAcceptedCommand,pendingId,setScreen,view.activeSeatId,view.phase,view.revision,view.viewerSeatId,view.waitingFor]);

  useEffect(()=>{if(!pendingId&&screen==='Decision')setScreen('Galaxy');},[pendingId,screen,setScreen]);
  useEffect(()=>{if(view.phase==='finished'){setScreen('Scoring');setMobileSheet('closed');setMobileActionMode(false);}},[view.phase,setScreen]);
  const shownPendingId=useRef<string|undefined>(undefined);
  useEffect(() => { if(shownPendingId.current===pendingId)return;shownPendingId.current=pendingId;if (pendingId) {setScreen("Decision");setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(false);} }, [pendingId,setScreen]);
  const previousRecapOpen=useRef(false);
  useEffect(()=>{if(view.phase==='finished'){previousRecapOpen.current=recapOpen;return;}if(recapOpen&&!previousRecapOpen.current&&!pendingId){setScreen('Activity');setMobileSheet('closed');setMobileActionMode(false);}else if(!recapOpen&&previousRecapOpen.current){setScreen(pendingId?'Decision':'Galaxy');setMobileSheet('closed');}previousRecapOpen.current=recapOpen;},[recapOpen,pendingId,setScreen,view.phase]);
  useEffect(()=>{if(compact&&showAiPanel&&screen==='Galaxy'){setMobileSheet('peek');setMobileActionsOpen(false);}},[compact,showAiPanel,screen,aiPresentation.action?.revision]);
  const presentedAiAction=useRef<number|null>(null);
  const openedForAi=useRef(false);
  useEffect(()=>{
    const revision=aiPresentation.action?.revision;
    if(revision===undefined||presentedAiAction.current===revision)return;
    // Consume each public entry once, even while the player is inspecting elsewhere.
    presentedAiAction.current=revision;
    if(!compact&&showAiPanel&&screen==='Galaxy'&&!historyOpen&&!empireMapSeat&&!inspectSector&&!publicInspection?.active){setInspectorOpen(true);openedForAi.current=true;}
  },[aiPresentation.action?.revision,compact,showAiPanel,screen,historyOpen,empireMapSeat,inspectSector,publicInspection?.active]);
  useEffect(()=>{
    if(!aiPresentation.actor&&openedForAi.current&&!reviewAi){openedForAi.current=false;if(!aiDismissed)setInspectorOpen(false);}
  },[aiPresentation.actor,reviewAi,aiDismissed]);
  const sound=useGameSoundFeedback({revision:view.revision,connected,busy,status,receipt:lastAcceptedCommand,aiEntry:aiPresentation.action,aiVisible:showAiPanel&&!settingsOpen&&screen==='Galaxy'&&!empireMapSeat&&!inspectSector&&!publicInspection?.active&&!reviewAi,reviewing:historyOpen||recapOpen});
  useCombatVolleySounds({volleys:!view.battle&&!combatNotice.visible&&playback?playback.volleys:[],eligible:!!playback&&sound.combatLive(playback.revision),awaitingDice:false,skipped:false});
  const [action, setAction] = useActionDraftState('action',view.actionProgress?.owner===view.viewerSeatId?view.actionProgress.action:'explore');
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
  const restoreChoiceFocus=useRef(false);
  const restoreDetailsFocus=useRef(false);
  const workspaceRef = useRef<HTMLElement>(null);
  useLayoutEffect(()=>{if(restoreChoiceFocus.current&&screen==='Galaxy'){restoreChoiceFocus.current=false;workspaceRef.current?.closest('main')?.querySelector<HTMLButtonElement>('.dg-pending-return button,.dg-mobile-pending')?.focus({preventScroll:true});}},[screen]);
  useLayoutEffect(()=>{if(restoreDetailsFocus.current&&!desktopInspectorVisible){restoreDetailsFocus.current=false;const root=workspaceRef.current?.closest('main');(root?.querySelector<HTMLButtonElement>('button[aria-controls="sector-details"]')??root?.querySelector<HTMLButtonElement>('.dg-history-toggle'))?.focus({preventScroll:true});}},[desktopInspectorVisible]);
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
  useLayoutEffect(() => { if (workspaceRef.current) workspaceRef.current.scrollTop = 0; }, [screen, editing, playerId, pendingId]);
  useLayoutEffect(() => { if (inspectorRef.current) inspectorRef.current.scrollTop = 0; }, [screen, selected, researchSelection]);
  useLayoutEffect(()=>{if(!actionFocus||historyOpen)return;const inspector=inspectorRef.current,panel=actionPanelRef.current;if(inspector&&panel)inspector.scrollTop+=panel.getBoundingClientRect().top-inspector.getBoundingClientRect().top-14;},[actionFocus,historyOpen]);
  const own = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const ownedTechnologyKey=Object.values(own.technologies).flat().join('|');
  useEffect(()=>{const submitted=submittedResearch.current;if(!submitted||!lastAcceptedCommand||!['research','trade-and-act'].includes(lastAcceptedCommand.type)||!ownedTechnologyKey.split('|').includes(submitted.id))return;submittedResearch.current=null;setAcquiredResearch(submitted.id);setDraft(current=>current&&JSON.stringify(current.command)===submitted.command?null:current);},[lastAcceptedCommand,ownedTechnologyKey,setDraft]);
  const liveScores = view.seats.map(seat => runningScore(view, seat.id).breakdown);
  const ownScore = liveScores.find(score => score.playerId === own.id)!;
  const inspectedPlayer = view.seats.find((s) => s.id === playerId) ?? own;
  const sector = view.sectors.find((s) => s.id === selected);
  const blocked = !connected || busy || !!interactionBlockedReason;
  const funded = useMemo(()=>fundedCandidates(view),[view]);
  const purchases = [...candidates,...funded];
  const available = purchases.filter((c) => (c.command.type === "trade-and-act" ? c.command.action.type : c.command.type) === action);
  const draftPreview = draft ? previewCommand(view, draft.command) : null;
  const stillLegal =
    draft &&
    (purchases.some(
      (c) => JSON.stringify(c.command) === JSON.stringify(draft.command),
    ) || (draft.command.type === "trade-and-act" && funded.some(c=>JSON.stringify(c.command.action)===JSON.stringify(draft.command.type === "trade-and-act" ? draft.command.action : null)) && fundingOptions(view,draft.command.action).some(option=>JSON.stringify(option.command)===JSON.stringify(draft.command))));
  const faction = (id:string) => {const seat=view.seats.find(s=>s.id===id);return seat?getFaction(seat.faction):undefined;};
  const color = (id:string|null) => {const seat=view.seats.find(s=>s.id===id);return seat?seatColor(seat):"#66778b";};
  useEffect(()=>{if(view.activeSeatId===view.viewerSeatId&&!view.actionProgress&&action==='end-action'){setAction('explore');setDraft(null);}},[view.activeSeatId,view.viewerSeatId,view.round,view.actionProgress,action,setAction,setDraft]);
  const showDecisionMap = () => {
    restoreChoiceFocus.current=true;
    setScreen('Galaxy');setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(false);
    setReviewAi(false);setAiDismissed(true);setHistoryOpen(false);setInspectorOpen(false);
  };
  const browseGalaxy=()=>{showDecisionMap();setEmpireMapSeat(null);setUpkeepBrowsing(view.phase==='upkeep');};
  const returnToChoice=()=>{setScreen('Decision');setEmpireMapSeat(null);setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(false);setHistoryOpen(false);};
  const browseTechnologies=()=>{setScreen('Research');setEmpireMapSeat(null);setInspectorOpen(false);setHistoryOpen(false);setReviewAi(false);setAiDismissed(true);setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(false);};
  const researchReadOnly=!!view.pendingDecision||!!view.waitingFor||view.phase!=='action'||own.passed||view.activeSeatId!==own.id||!!view.actionProgress&&view.actionProgress.action!=='research';
  const activate = (type: GameCommand["type"]) => {
    if(type==='research'&&researchReadOnly){browseTechnologies();return;}
    setUpkeepBrowsing(false);
    setEmpireMapSeat(null);
    setInspectorOpen(['explore','influence','move','colonize','build','end-action'].includes(type));
    if(diplomacyDecision && type === 'explore'){showDecisionMap();return;}
    if(compact){setMobileActionsOpen(false);setMobileActionMode(!directTurnActions.includes(type));setMobileSheet(['explore','influence','move','colonize','build'].includes(type)?'peek':'closed');}
    setReviewAi(false);setAiDismissed(true);
    setHistoryOpen(false);
    setActionFocus(n=>n+1);
    setAction(type);
    setBuildOpen(type === "build");
    setMoveOpen(type === "move");
    setMoveTargets([]);setMoveTarget(null);
    if(type === "upgrade"){
      setPlayerId(own.id);
      setEditing(current=>current&&own.blueprints.some(bp=>bp.shipType===current)?current:own.blueprints[0].shipType);
    }
    if(type === "build"){
      setBuildHereSector(null);setBuildOpen(true);setBuildResult('');setScreen("Galaxy");setDraft(null);return;
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
  const reviewUpkeep=()=>{
    const candidate=candidates.find(item=>item.command.type==='finish-upkeep');
    if(!candidate)return;
    setUpkeepBrowsing(false);setEmpireMapSeat(null);setAction('finish-upkeep');setDraft(candidate);setScreen('Galaxy');setHistoryOpen(false);setInspectorOpen(true);setAiDismissed(true);setReviewAi(false);setBuildOpen(false);setMoveOpen(false);setActionFocus(n=>n+1);
    if(compact){setMobileActionsOpen(false);setMobileActionMode(true);setMobileSheet('expanded');}
  };
  const canColonizeAtUpkeep=view.phase==='upkeep'&&candidates.some(candidate=>candidate.command.type==='colonize'&&candidate.command.placements.length>0);
  const openUpkeepColonization=()=>{
    if(blocked||!canColonizeAtUpkeep)return;
    activate('colonize');
    if(compact)setMobileSheet('expanded');
  };
  const combatAftermath=playback&&combatNotice.visible&&<div className="dg-combat-aftermath">
            <div className="dg-combat-aftermath-heading"><strong>Last combat exchange</strong><button onClick={combatNotice.dismiss}>Dismiss battle results</button></div>
            <CombatPlayback soundEligible={sound.combatLive(playback.revision)} volleys={playback.volleys} view={view} knownShips={[...knownShips.current.values()]} fast={!motionEnabled}/>
          </div>;
  const pendingDecisionPanel = view.pendingDecision ? (
    <DecisionPanel
      motionEnabled={motionEnabled&&screen==='Decision'}
      view={view}
      targetLabels={Object.fromEntries(view.ships.map(ship => [
        ship.id,
        `${faction(ship.owner)?.name ?? humanize(ship.owner)} · ${humanize(ship.type)} #${view.ships.filter(s => s.owner === ship.owner && s.type === ship.type).findIndex(s => s.id === ship.id) + 1}`,
      ]))}
      key={view.pendingDecision.id}
      decision={view.pendingDecision}
      candidates={candidates}
      reputation={view.private.reputation}
      disabled={blocked}
      onSubmit={onSubmit}
    />
  ) : null;
  const unavailableAfterPassing=(type:GameCommand['type'])=>own.passed&&['explore','influence','research'].includes(type);
  const actionLabel=(type:GameCommand['type'])=>type==='trade'?'Convert':type==='pass'?passButtonLabel(view):type==='end-action'?({move:'Done moving',build:'Done building',research:'Done researching',upgrade:'Done upgrading',explore:'Done exploring',influence:'Done shaping territory'}[view.actionProgress?.action??'move']??'Done with action'):humanize(type);
  const mobileDestination:MobileDestination=screen==='Galaxy'||screen==='Decision'?'Galaxy':screen==='Players'?'Players':screen==='Activity'?'Activity':'Empire';
  const resumeSavedAction=()=>{
    const keys=draftGuard.draftKeys;
    const savedCommand=draft?.command.type==='trade-and-act'?draft.command.action:draft?.command;
    const restoredAction:GameCommand['type']=savedCommand?.type??(keys.includes('movement')||keys.includes('movementRoutes')?'move':keys.includes('buildCounts')||keys.includes('buildOrder')?'build':keys.some(key=>key.startsWith('blueprint-'))?'upgrade':keys.includes('influenceDraft')?'influence':keys.includes('colonization')?'colonize':'trade');
    setAction(restoredAction);setMobileActionsOpen(false);setMobileActionMode(true);setAiDismissed(true);setHistoryOpen(false);
    setScreen(restoredAction==='research'?'Research':restoredAction==='upgrade'?'Blueprints':restoredAction==='trade'?'Trade':'Galaxy');
    if(restoredAction==='move')setMoveOpen(true);
    if(restoredAction==='build')setBuildOpen(true);
    if(restoredAction==='upgrade'){setPlayerId(own.id);if(!editing)setEditing((keys.find(key=>key.startsWith('blueprint-'))?.slice(10)??'interceptor')as BlueprintShipType);}
    setMobileSheet(['explore','influence','colonize','move'].includes(restoredAction)?'expanded':'closed');
  };
  const mobileNavigate=(destination:MobileDestination)=>{if(destination==='Galaxy'){browseGalaxy();return;}setEmpireMapSeat(null);setScreen(destination);setHistoryOpen(false);setMobileActionMode(false);setMobileActionsOpen(false);setMobileSheet('closed');setAiDismissed(true);if(destination==='Players')setPlayerId(own.id);};
  const mobileActionOptions:MobileActionOption[]=(['explore','influence','research','upgrade','build','move','colonize','trade','offer-diplomacy','pass','end-action','finish-upkeep']as GameCommand['type'][]).filter(type=>!directTurnActions.includes(type)||candidates.some(candidate=>candidate.command.type===type)).map(type=>({type,label:actionLabel(type),description:type==='research'&&researchReadOnly?'Browse technologies & discounts':unavailableAfterPassing(type)?'Passed · only Upgrade, Build and Move reactions remain.':type==='explore'?'Choose a frontier':type==='move'?'Choose ships & destination':type==='build'?'Choose pieces, then deploy':type==='influence'?'Choose a sector to control':type==='colonize'?'Populate your planets':type==='research'?'Technologies & effects':type==='upgrade'?'Edit ship loadouts':type==='trade'?'Convert resources':type==='pass'?(firstPassMoney(view)?'Gain the first-pass bonus and start the next round.':'Finish normal actions for this round.'):'Available choices',disabled:type==='research'?!!interactionBlockedReason:blocked||unavailableAfterPassing(type)||!!view.pendingDecision||view.phase==='finished'||(view.phase!=='action'&&['explore','influence','research','upgrade','build','move'].includes(type))}));
  const onMoveSelection=useCallback(({sourceSectorId,targetSectorId}:{sourceSectorId:string|null;targetSectorId:string|null})=>{setMoveSource(sourceSectorId);setMoveTarget(targetSectorId);setMoveTargets([]);},[setMoveSource,setMoveTarget]);
  const projectedShipSector=(id:string,original:string)=>{let current=original;for(const route of moveRoutePreviews)if(route.status==='valid')for(const path of route.paths)if(path.shipId===id)current=path.path.at(-1)??current;return current;};
  const empireOverview=(seatId:string)=><EmpireOverview view={view} seatId={seatId} buildOrder={buildOrder} buildUnavailableReason={!connected?'Reconnect to build.':busy?'Saving your last command.':draftGuard.stale?'Restore the current turn before building.':undefined} onBuild={shipType=>{if(blocked||draftGuard.stale||seatId!==own.id)return;const option=empireBuildOptions(view,buildOrder).find(option=>option.shipType===shipType);if(!option||option.disabledReason)return;activate('build');setBuildPlacement(null);setBuildOrder(current=>addBuildItem(current,shipType));}} onSector={sectorId=>{setInspectorOpen(true);setEmpireMapSeat(seatId);setSelected(sectorId);setScreen('Galaxy');setHistoryOpen(false);setAiDismissed(true);setMobileActionMode(false);setMobileSheet(compact?'expanded':'closed');setMobileActionsOpen(false);}} onBlueprints={shipType=>{setPlayerId(seatId);setEditing(shipType??null);setScreen('Blueprints');setMobileSheet('closed');setMobileActionMode(false);}} onNavigate={destination=>{setPlayerId(seatId);if(destination==='colonize'){activate('colonize');return;}setScreen(destination);setMobileSheet('closed');setMobileActionMode(false);setHistoryOpen(false);if(destination==='Research')setAction('research');if(destination==='Trade')setAction('trade');}}/>;
  const buildPlanner=<BuildPlanner embedded view={view} defaultPlacementSectorId={buildHereSector} sectorId={buildHereSector} placementRequest={buildPlacement} onLegalTargetsChange={setBuildTargets} disabled={blocked||!!lastAcceptedCommand&&lastAcceptedCommand.revision>view.revision} onClose={()=>{setBuildOpen(false);setBuildTargets([]);}} onSubmit={command=>{const action=command.type==='trade-and-act'?command.action:command;pendingBuild.current={receipt:lastAcceptedCommand,type:command.type,count:action.type==='build'?action.builds.length:0};onSubmit(command);}}/>;
  return (
    <main onClickCapture={sound.capture} onClick={sound.clicked} className={`sd-app dg-app dg-tabletop${!compact&&!desktopInspectorVisible?' dg-inspector-collapsed':''}${['Players','Empire'].includes(screen)&&!historyOpen?' dg-empire-mode':''}${buildOpen&&!inspectingGalaxy&&screen==='Galaxy'?' dg-build-mode':''}${compact?' dg-mobile-board':''}${view.pendingDecision?.kind==='exploration'&&screen==='Decision'&&!historyOpen?' dg-placement-mode':''}`} data-motion={motionEnabled?'on':'off'} data-mobile-screen={compact?screen:undefined} style={compact?{"--mobile-sheet-top":`${mobileWorkspaceTop}px`,"--mobile-footer-height":`${mobileBottomInset}px`}as CSSProperties:undefined}>
      {compact?<MobileHeader view={view} connected={connected} busy={busy} score={ownScore.total} turnClock={turnClock} onMenu={onMenu} onSettings={()=>setSettingsOpen(true)} onScore={()=>{setScreen('Scoring');setMobileSheet('closed');setMobileActionMode(false);}}/>:<><header className="sd-header">
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
        <div className="sd-actions" aria-label="Available actions">
          {(
            [
              "explore", "influence", "research", "upgrade", "build", "move",
              "colonize", "trade", "offer-diplomacy",
              "pass", "end-action", "finish-upkeep",
            ] as GameCommand["type"][]
          )
            .filter((type) => ["explore", "influence", "research", "upgrade", "build", "move"].includes(type) || candidates.some((candidate) => candidate.command.type === type))
            .map((type) => (
              <button
                key={type}
                aria-pressed={action === type && !view.pendingDecision && view.phase === "action"}
                title={type==='research'&&researchReadOnly?"Browse available technologies and discounts.":diplomacyDecision && type === "explore" ? "Inspect the galaxy before responding to the ambassador exchange." : unavailableAfterPassing(type) ? "Passed this round: only Upgrade, Build and Move reactions remain." : view.pendingDecision ? "Resolve the pending decision first." : undefined}
                disabled={type==='research'?!!interactionBlockedReason:!!interactionBlockedReason || view.phase === "finished" || (unavailableAfterPassing(type)&&!(diplomacyDecision&&type==='explore')) || (directTurnActions.includes(type) && blocked) || (!(diplomacyDecision && type === "explore") && ["explore", "influence", "research", "upgrade", "build", "move"].includes(type) && (Boolean(view.pendingDecision) || view.phase !== "action"))}
                onClick={() => activate(type)}
              >
                {actionLabel(type)}
              </button>
            ))}
        </div>
        <div className="dg-save">
          {aiFailure && (
            <button disabled={!connected} title={aiFailure} onClick={onRetryAi}>
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
          <button className="dg-history-toggle" aria-pressed={historyOpen} onClick={()=>{setHistoryOpen(open=>!open);setInspectorOpen(true);if(screen==='Decision')setScreen('Galaxy');}}>History</button>
          <button onClick={()=>setSettingsOpen(true)}>Settings</button><button onClick={onMenu}>{menuLabel}</button>
        </div>
      </header></>}
      {!view.pendingDecision&&<div className="dg-board-draft-notice"><ActionDraftNotice/></div>}
      <div className="sd-layout">
        <aside className="sd-players">
          <div className="dg-turn-order-label" title="Clockwise action order. Passed players can still react; eliminated players appear last.">{view.phase==='action'?'Turn order →':'Seat order →'}</div>
          <div
            className="sd-player-list"
            role="region"
            aria-label="Civilization roster"
            aria-description={view.phase==='action'?'Current player first, followed by clockwise turns. Passed players can still react.':'Clockwise from the start player tile holder.'}
            tabIndex={0}
          >
            {rosterTurnOrder(view).map((seat) => (
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
                        ? `${AI_DIFFICULTY_LABELS[aiDifficulty]} AI`
                        : playerNames[seat.id]??"Human"}{" "}
                    ·{" "}
                    {seat.eliminated
                      ? "eliminated"
                      : seat.passed
                        ? "passed"
                        : seat.id === view.activeSeatId
                          ? "active"
                          : "waiting"}
                    {view.round<8&&view.phase!=='finished'&&seat.id===view.firstPasser&&!seat.eliminated&&<span className="dg-next-starter" title="Passed first: gained 2 money and starts the next round."> · Next round first</span>}
                  </small>
                </div>
                <span className="dg-roster-vp" title={view.phase === "finished" ? "Final victory points" : "Public victory points; reputation excluded"}>{liveScores.find(score => score.playerId === seat.id)!.total}<small>VP</small></span>
              </button>
            ))}
          </div>
          {compact&&aiFailure&&<div className="dg-mobile-ai-recovery" role="alert"><p>{aiFailure}</p><button disabled={!connected} onClick={onRetryAi}>AI paused · retry</button></div>}
          <AiActivityBar currentAction={view.actionProgress?.owner===own.id&&!view.pendingDecision?(view.actionProgress.budgets?`Build & move: ${view.actionProgress.budgets.build??0} build · ${view.actionProgress.budgets.move??0} move remaining. No extra action disc.`:`Continue ${view.actionProgress.action}: ${view.actionProgress.remaining} activations remaining.`):undefined} takeover={aiTakeover} thinking={aiThinking} following={followAi} onFollowChange={changeFollowAi} humanDecision={!!view.pendingDecision} paused={!!aiFailure} actor={aiPresentation.actor} recent={aiPresentation.recent} humanTurn={!!view.pendingDecision||(!view.waitingFor&&view.activeSeatId===own.id)} finished={view.phase==='finished'} motionEnabled={motionEnabled} onMotionChange={changeMotion} onWatch={()=>{setInspectorOpen(true);if(compact)setMobileSheet('peek');setFollowAi(true);setAiDismissed(false);setReviewAi(!aiPresentation.actor);setHistoryOpen(false);setScreen('Galaxy');setCamera(null);setFitRequest(n=>n+1);}}>
            <SectorDecks view={view}/>
            {(screen!=='Galaxy'&&screen!=='Decision'||view.phase==='upkeep')&&<button className="dg-board-control" onClick={browseGalaxy}>View galaxy</button>}
            {view.phase==='upkeep'&&(screen!=='Galaxy'||browsingUpkeep||action==='colonize')&&candidates.some(candidate=>candidate.command.type==='finish-upkeep')&&<button className="dg-board-control" onClick={reviewUpkeep}>Back to upkeep</button>}
            {view.phase!=='finished'&&!own.eliminated&&<AutoPassControl enabled={own.autoPassUnlessAttacked??false} paused={own.autoPassPausedRound===view.round} disabled={!connected||busy} disabledReason={!connected?'Reconnect to change auto-pass.':busy?'Saving your change…':undefined} onChange={enabled=>onSubmit({type:'set-auto-pass',enabled})}/>}
            {screen==='Galaxy'&&<>
              {showAiPanel&&!historyOpen&&(compact?mobileSheet!=='closed':desktopInspectorVisible)&&<button className="dg-board-control" onClick={()=>{setAiDismissed(true);setReviewAi(false);inspectorRef.current?.focus({preventScroll:true});}}>Return to inspector</button>}
              {!compact&&<button className="dg-board-control" aria-controls="sector-details" aria-expanded={desktopInspectorVisible} onClick={()=>{if(desktopInspectorVisible){restoreDetailsFocus.current=true;setAiDismissed(true);}setInspectorOpen(open=>!open);}}>{desktopInspectorVisible?'Hide':'Show'} sector details</button>}
              {empireMapSeat&&<button className="dg-board-control" onClick={()=>{setPlayerId(empireMapSeat);setScreen(compact&&empireMapSeat===own.id?'Empire':'Players');setEmpireMapSeat(null);setMobileSheet('closed');}}>Back to empire</button>}
            </>}
          </AiActivityBar><FactionAbilityControls view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit} onAction={activate} onFinish={()=>activate("end-action")}/>
          {reputationSummaryId&&reputationSummaryId!==dismissedReputationId&&view.private.reputationSummary?.round===view.round&&<div className="dg-reputation-notice"><ReputationSummary view={view} onDismiss={()=>setDismissedReputationId(reputationSummaryId)}/></div>}
          {!compact&&<div className="dg-board-tools">
            {view.pendingDecision&&screen!=='Decision'&&<div className="dg-pending-return" role="status"><span>Your choice is waiting</span><button onClick={returnToChoice}>Return to {choiceLabel(view.pendingDecision)}</button></div>}

          </div>}
        </aside>
        <section className="sd-main" ref={workspaceRef}>
          {view.pendingDecision&&<ChoiceWorkspace key={view.pendingDecision.id} decision={view.pendingDecision} open={screen==='Decision'} onMinimize={showDecisionMap}>
            {(selected&&view.pendingDecision.kind!=='exploration'||view.pendingDecision.kind==='discovery')&&<div className="dg-decision-location">{selected&&<><strong>Sector {sector?.tileId??selected}</strong><button onClick={()=>setInspectSector(selected)}>Inspect location</button></>}{view.pendingDecision.kind==='discovery'&&<button type="button" onClick={browseTechnologies}>Browse technologies</button>}</div>}
            {screen==='Decision'&&combatAftermath}
            {pendingDecisionPanel}
            {view.battle&&<BattleOverview soundEligible={!!playback&&sound.combatLive(playback.revision)} view={view} fastPlayback={!motionEnabled||screen!=='Decision'} recentVolleys={playback?.volleys.some(volley=>volley.targets.some(target=>target.destroyed))?[]:playback?.volleys??[]} knownShips={[...knownShips.current.values()]}/>}
          </ChoiceWorkspace>}
          <div className="dg-board-surface" inert={screen==='Decision'} aria-hidden={screen==='Decision'?true:undefined}>
          {screen==='Galaxy'&&combatAftermath}
          {view.battle&&!view.pendingDecision&&!empireMapSeat&&(screen==='Galaxy'||screen==='Decision')?<div className="sd-workspace">
            <p role="status">Waiting for {view.waitingFor?faction(view.waitingFor.owner)?.name??'your opponent':'your opponent'}’s combat decision.</p>
            <BattleOverview soundEligible={!!playback&&sound.combatLive(playback.revision)} view={view} fastPlayback={!motionEnabled} recentVolleys={playback?.volleys.some(volley=>volley.targets.some(target=>target.destroyed))?[]:playback?.volleys??[]} knownShips={[...knownShips.current.values()]}/>
          </div>:compact&&screen==='Activity' ? <div className="sd-workspace dg-mobile-activity"><h1>Activity</h1>{activityRecap}<HistoryPanel rollback={historyRollback} feed={history??{entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}}/></div>
          : compact&&screen==='Empire' ? <div className="sd-workspace dg-mobile-empire">{draftGuard.draftKeys.length>0&&!view.pendingDecision&&<button className="dg-mobile-resume-draft" onClick={resumeSavedAction}>Resume saved action</button>}{empireOverview(own.id)}</div>
          : screen === "Trade" ? (
            <div className="sd-workspace"><TradePanel view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit}/></div>
          ) : screen === "Scoring" ? (
            <ScoreWorkspace view={view} scores={liveScores} playerNames={playerNames} onInspect={(seatId,category)=>publicInspection?.request({kind:'score',seatId,category})} onHome={onHome??onMenu} onPlayAgain={onPlayAgain??onMenu} onGalaxy={()=>{setScreen('Galaxy');setMobileSheet('closed');setMobileActionMode(false);}}/>
          ) : screen === "Diplomacy" ? (
            <div className="sd-workspace"><DiplomacyPanel view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit}/></div>
          ) : screen === "Players" ? (
            <div className="sd-workspace">{empireOverview(inspectedPlayer.id)}<DiplomacyPanel view={view} candidates={candidates} disabled={blocked} onSubmit={onSubmit} inspectedSeatId={inspectedPlayer.id}/></div>
          ) : screen === "Blueprints" ? (
            <div className="sd-workspace">
              <p className="sd-eyebrow">PUBLIC BLUEPRINTS</p>
              <div className="dg-blueprint-heading"><h1>Ship blueprints</h1>
              <label className="dg-blueprint-owner">Civilization <select aria-label="Blueprint civilization" value={inspectedPlayer.id} onChange={event => {setPlayerId(event.target.value); setEditing(null);}}>{view.seats.map(seat => <option key={seat.id} value={seat.id}>{faction(seat.id)?.name}{seat.id === own.id ? " (you)" : ""}</option>)}</select></label></div>
              <nav className="dg-class-selector" aria-label="Ship classes">
                {inspectedPlayer.blueprints.map(bp => <button key={bp.shipType} aria-pressed={editing === bp.shipType} disabled={getFaction(inspectedPlayer.faction).componentSupply?.[bp.shipType]===0} title={getFaction(inspectedPlayer.faction).componentSupply?.[bp.shipType]===0?`${getFaction(inspectedPlayer.faction).name} does not use this ship class.`:undefined} onClick={() => {setEditing(bp.shipType); setAction("upgrade");}}>{humanize(bp.shipType)}</button>)}
                <button aria-pressed={editing === null} onClick={() => setEditing(null)}>All loadouts</button>
              </nav>
              {editing && inspectedPlayer.id === own.id && getFaction(own.faction).componentSupply?.[editing]!==0 ? (
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
                  installedAncientParts={own.blueprints.flatMap(candidate=>{const blueprint=publicBlueprint(candidate);return [...blueprint.parts,...blueprint.outsideParts];}).filter((id):id is AncientShipPartId=>id!==null&&getShipPart(id).access.kind==='ancient')}
                  capacity={
                    view.actionProgress?.action === "upgrade"
                      ? view.actionProgress.remaining
                      : own.passed
                        ? 1
                        : getFaction(own.faction)
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
                  {inspectedPlayer.blueprints.filter(bp => getFaction(inspectedPlayer.faction).componentSupply?.[bp.shipType]!==0&&(editing === null || bp.shipType === editing)).map((bp) => (
                    <section key={bp.shipType} className="dg-loadout-card">
                      <header><ShipSilhouette type={bp.shipType} faction={inspectedPlayer.faction}/><h2>{humanize(bp.shipType)}</h2></header>
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
              {(!editing || inspectedPlayer.id !== own.id) && <button
                onClick={() => {
                  setEditing(null);
                  setPlayerId(own.id);
                  activate("upgrade");
                }}
              >
                Edit your blueprint
              </button>}
              <p className="sd-muted">
                All ships of a class use the same blueprint. Your unconfirmed drafts are kept when switching classes.
              </p>
            </div>
          ) : screen === "Research" ? (
            <><ResearchWorkspace view={view} purchases={researchReadOnly?[]:purchases} selected={researchSelection as TechnologyId|null} draft={draft} disabled={blocked||researchReadOnly} stale={draftGuard.stale} stillLegal={!!stillLegal} acquired={acquiredResearch} onSelect={(id,owned)=>{setResearchSelection(id);if(compact){setMobileSheet('closed');setMobileActionsOpen(false);setMobileActionMode(!owned&&!researchReadOnly);}if(inspectorRef.current)inspectorRef.current.scrollTop=0;}} onDraft={next=>{if(!researchReadOnly)setDraft(next);}} onSubmit={onSubmit}/></>
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
              <GalaxyBoard plannedBuilds={buildOpen&&!inspectingGalaxy?buildOrder.items:[]} plannedMoves={moveOpen&&!inspectingGalaxy?moveRoutePreviews:[]} onSelectBuildItem={id=>setBuildOrder(current=>({...current,selectedItemId:id}))} onInspectFleet={id=>{setInspectSector(id);setInspectDiplomacy(null);}} compact={compact} camera={camera??undefined} onCameraChange={setCamera} fitRequest={fitRequest} activity={aiPresentation.activity} targetLabel={buildOpen?"legal deployment sector":moveOpen?"legal move destination":action==='colonize'?"available planet":"legal influence target"} view={view} candidates={inspectingGalaxy?[]:moveOpen||action!=="explore"?candidates.filter(c=>c.command.type!=="explore"):candidates} selected={selected} legalTargetIds={inspectingGalaxy?[]:buildOpen?[...buildTargets]:moveOpen?moveTargets:action==='influence'?influenceTargets:action==='colonize'?[...colonyTargets]:[]} onSelect={id=>{
                setHistoryOpen(false);setSelected(id);setInspectorOpen(true);setReviewAi(false);setAiDismissed(true);if(compact){setMobileSheet(action==='influence'||moveOpen&&moveTargets.includes(id)?'expanded':'peek');setMobileActionsOpen(false);}
                if(inspectingGalaxy)return;
                if(buildOpen){setBuildPlacement(prior=>({sectorId:id,serial:(prior?.serial??0)+1}));}
                else if(moveOpen){
                  if(!moveSource||(!moveTargets.includes(id)&&view.ships.some(ship=>projectedShipSector(ship.id,ship.sectorId)===id&&ship.owner===own.id))){setMoveSource(id);setMoveTarget(null);}
                  else setMoveTarget(id);
                } else if(action === "build" && view.sectors.some(s=>s.id===id&&s.owner===own.id)) setBuildOpen(true);
              }} onExplore={candidate => { setSelected(null);setReviewAi(false);setAiDismissed(true); setInspectorOpen(true); if(compact){setMobileSheet('expanded');setMobileActionMode(true);setMobileActionsOpen(false);} setMoveOpen(false);setMoveTargets([]);setHistoryOpen(false); setAction("explore"); setDraft(candidate); setActionFocus(n=>n+1); }} />
              {buildResult&&<p className="dg-plan-result" role="status">{buildResult}</p>}
              {compact&&buildOpen&&!inspectingGalaxy&&buildPlanner}
            </>
          )}
          </div>
        </section>
        <aside hidden={!compact&&!desktopInspectorVisible} id="sector-details" tabIndex={-1} className={`sd-inspector ${historyOpen ? "dg-inspector-history" : ""}${compact?' dg-mobile-sheet':''}`} data-sheet-state={compact?(buildOpen&&!inspectingGalaxy?'closed':mobileSheet):undefined} ref={inspectorRef} aria-label="Selection and action details">
          {compact&&<div className="dg-mobile-sheet-header"><button className="dg-mobile-sheet-expand" aria-label={`${mobileSheet==='expanded'?'Collapse':'Expand'} ${mobileActionsOpen?'Actions':showAiPanel?'AI action':mobileActionMode?actionLabel(action):screen==='Research'?'Technology':sector?`Sector ${sector.tileId}`:'Details'} details`} onClick={()=>setMobileSheet(mobileSheet==='expanded'?'peek':'expanded')}><span aria-hidden="true">{mobileSheet==='expanded'?'⌄':'⌃'}</span><strong>{mobileActionsOpen?'Choose an action':showAiPanel?'AI action':mobileActionMode?actionLabel(action):screen==='Research'?'Technology':sector?`Sector ${sector.tileId}`:'Details'}</strong><small>{mobileSheet==='expanded'?'Show galaxy':'View details'}</small></button><button aria-label="Dismiss details" onClick={()=>{setMobileSheet('closed');setMobileActionsOpen(false);setAiDismissed(true);}}>×</button></div>}
          <div ref={mobileSheetBodyRef} className={`dg-inspector-body${compact?' dg-mobile-sheet-body':''}`}>
          {compact&&mobileActionsOpen?<>{draftGuard.draftKeys.length>0&&!view.pendingDecision&&<button className="dg-mobile-resume-draft" onClick={resumeSavedAction}>Resume saved action</button>}<MobileActionPicker options={mobileActionOptions} onSelect={activate}/></>:''}
          <div className="dg-inspector-content" hidden={compact&&mobileActionsOpen}>

          {historyOpen ? <HistoryPanel rollback={historyRollback} feed={history ?? {entries:[],loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:()=>{}}}/> : showAiPanel && aiPresentation.action ? <><AiActionPanel view={view} entry={aiPresentation.action} onInspectSector={id=>{setSelected(id);setScreen('Galaxy');setAiDismissed(true);setReviewAi(false);if(compact)setMobileSheet('peek');}}/></> : buildOpen && !inspectingGalaxy && screen === "Galaxy" && !compact ? buildPlanner : moveOpen && !inspectingGalaxy && screen === "Galaxy" ? <>
            <MovementPlanner showCombatOdds={showCombatOdds} onChangeSource={()=>{setMoveSource(null);setMoveTarget(null);setMoveTargets([]);}} onRoutePreview={setMoveRoutePreviews} onSelectionChange={onMoveSelection} key={moveSource} view={view} sourceSectorId={moveSource} selectedTargetId={moveTarget} disabled={blocked||!!lastAcceptedCommand&&lastAcceptedCommand.revision>view.revision} result={movementResult} onDone={candidates.some(candidate=>candidate.command.type==='end-action')?()=>{const command:GameCommand={type:'end-action'};if(previewCommand(view,command).betrayedPartners.length)activate('end-action');else onSubmit(command);}:undefined} onTargetsChange={setMoveTargets} onClose={()=>{setMoveOpen(false);setMoveTargets([]);}} onSubmit={command=>{pendingMove.current={receipt:lastAcceptedCommand,ships:command.type==='move'?new Set(command.moves.map(move=>move.shipId)).size:0};setMovementResult('');onSubmit(command);}}/>
          </> : screen === 'Galaxy' && action === 'influence' && !inspectingGalaxy ? <InfluencePlanner onSectorFocus={setSelected} key={view.revision} view={view} candidates={candidates} selectedSectorId={selected} onLegalTargetIdsChange={setInfluenceTargets} disabled={blocked} onSubmit={onSubmit}/>
          : screen === 'Galaxy' && action === 'colonize' && !inspectingGalaxy ? <><ColonizationPlanner onColonizableSectorIdsChange={setColonyTargets} onSectorFocus={setSelected} view={view} candidates={candidates} selectedSectorId={selected} disabled={blocked} onSubmit={onSubmit}/></>
          : <>
          <p className="sd-eyebrow">
            {view.phase === "finished" ? "FINAL RESULTS" : screen === "Research" ? "TECHNOLOGY" : screen === "Blueprints" ? "SHIPYARD" : screen === "Trade" ? "RESOURCE EXCHANGE" : "SECTOR INSPECTOR"}
          </p>
          {screen === 'Scoring' ? <><h2>Where points come from</h2><p>Select a symbol on any faction card to inspect its contribution and relevant sectors.</p><p>{view.phase==='finished'?'Reputation is now revealed. Equal VP totals are ranked by remaining resources; an exact tie shares the rank.':'Reputation stays face down and is excluded from every public total until the game ends.'}</p><button onClick={()=>{setScreen('Galaxy');setMobileSheet('closed');}}>Back to galaxy</button></> : view.pendingDecision && screen === "Decision" ? (
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
            <><h2>Diplomacy & trust</h2><p>Ambassadors are public and worth 1 VP each. Reputation values remain private until the game ends.</p><p>Ending your action with ships in a partner’s sector or with their ships breaks that relationship. Passing through while unpinned is allowed. The aggressor takes the traitor card: −2 VP (Rho Indi: 0 VP) and no new diplomatic relations while holding it.</p><p>The card transfers when another player betrays a diplomatic partner.</p></>
          ) : view.phase === "finished" && !sector ? (
            <>
              <h2>Scoring explained</h2>
              <p>
                Each civilization’s total includes controlled sectors,
                structures, research tracks, reputation, discoveries,
                ambassadors, faction abilities and traitor penalties.
              </p>
            </>
          ) : action === 'finish-upkeep' && view.phase === 'upkeep' && !browsingUpkeep ? (
            <><h2>Round {view.round} upkeep</h2><p>Review production and your civilization’s upkeep before continuing. You can convert resources first if needed.</p><button type="button" onClick={browseTechnologies}>Browse technologies</button>{canColonizeAtUpkeep&&<><p>You can still populate an open planet before collecting income.</p><button type="button" disabled={blocked} onClick={openUpkeepColonization}>Colonize</button></>}</>
          ) : action === 'explore' && draft?.command.type === 'explore' ? (
            <><h2>Explore new sector</h2><p>Confirm this frontier to draw a sector, then choose its orientation.</p></>
          ) : sector ? (
            <>
              <h2>Sector {sector.tileId}</h2>
              <p>
                {sector.owner ? faction(sector.owner)?.name : "Uncontrolled"} ·
                orientation {sector.rotation * 60}°
              </p>
              {showCombatOdds&&view.ships.some(ship=>ship.sectorId===sector.id&&ship.owner===own.id)&&<MovementBattlePreview view={view} shipIds={view.ships.filter(ship=>ship.sectorId===sector.id&&ship.owner===own.id).map(ship=>ship.id)} targetSectorId={sector.id}/>}
              <h3>Fleet</h3>
              <SectorFleet view={view} sectorId={sector.id} onInspect={()=>{setInspectSector(sector.id);setInspectDiplomacy(null);}}/>{sector.owner===own.id&&!inspectingGalaxy&&<button onClick={()=>{activate('build');setBuildHereSector(sector.id);}}>Build here</button>}
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
          {!browsingUpkeep && view.phase !== "finished" && screen !== "Trade" && screen !== "Scoring" && ['explore','end-action','finish-upkeep'].includes(action) &&
            (!view.pendingDecision ||
              (view.pendingDecision.kind === "bankruptcy" &&
                action === "trade") ||
              (action === "discard-reputation" &&
                ["diplomacy", "diplomacy-window"].includes(
                  view.pendingDecision.kind,
                ))) && (
              <div className="dg-action-panel" ref={actionPanelRef}>
                <p className="sd-eyebrow">{actionLabel(action).toUpperCase()}</p>
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
                    {!!draftPreview?.betrayedPartners.length && <p className="dg-danger">Breaks diplomacy with {draftPreview.betrayedPartners.map(id => faction(id)?.name ?? id).join(", ")}. You take the traitor card ({getFaction(own.faction).special?.ignoresTraitorPenalty?'0':'−2'} VP), return these ambassadors, and cannot form new relations while holding it.</p>}
                    <button
                      className="sd-primary"
                      disabled={blocked || draftGuard.stale || !stillLegal}
                      onClick={() => {
                        onSubmit(draft.command);
                      }}
                    >
                      {draft.command.type === "end-action" ? "End action and break diplomacy" : draft.command.type === "trade-and-act" ? `Convert & ${draft.command.action.type}` : draft.command.type === "finish-upkeep" ? "Finish upkeep" : "Confirm action"}
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

      <TurnAttentionNotice view={view} matchScope={matchId??'preview'} connected={connected} suppressed={!!interactionBlockedReason||settingsOpen||historyOpen||recapOpen||!!publicInspection?.active||!!inspectSector||busy||buildOpen||moveOpen||mobileActionMode||mobileActionsOpen||screen!=='Galaxy'} onOpenTurn={()=>{setScreen('Galaxy');setAiDismissed(true);setReviewAi(false);if(compact){setMobileActionsOpen(true);setMobileSheet('expanded');}}} onReviewUpkeep={reviewUpkeep} onColonize={canColonizeAtUpkeep&&!blocked?openUpkeepColonization:undefined}/>
      <PublicInspectionModal view={view}/>
      {settingsOpen&&<GameSettingsPanel onHistory={()=>{setSettingsOpen(false);setHistoryOpen(true);setInspectorOpen(true);if(compact){setScreen("Activity");setMobileSheet("closed");setMobileActionMode(false);}}} onGameMenu={()=>{setSettingsOpen(false);onMenu();}} motionEnabled={motionEnabled} onMotionChange={changeMotion} followAi={followAi} onFollowAiChange={changeFollowAi} autoPass={view.phase!=='finished'&&!own.eliminated?{enabled:own.autoPassUnlessAttacked??false,paused:own.autoPassPausedRound===view.round,disabled:blocked,disabledReason:interactionBlockedReason??(!connected?'Reconnect to change auto-pass.':busy?'Saving your change…':undefined),onChange:enabled=>onSubmit({type:'set-auto-pass',enabled})}:undefined} onClose={()=>setSettingsOpen(false)}/>}
      {inspectSector&&<FleetInspection showCombatOdds={showCombatOdds} view={view} sectorId={inspectSector} selectedShipIds={movementDraft.ids.length?movementDraft.ids:[...new Set(moveRoutePreviews.flatMap(route=>route.draft.shipIds))]} onClose={()=>{setInspectSector(null);setInspectDiplomacy(null);}} onDiplomacy={setInspectDiplomacy} diplomacy={inspectDiplomacy?<DiplomacyPanel view={view} candidates={candidates} inspectedSeatId={inspectDiplomacy} disabled={blocked} onSubmit={onSubmit}/>:undefined}/>}
      {compact&&status&&!/^(Saved|Saving|Applied to the isolated|Engine fixture review)/.test(status)&&<div className="dg-mobile-feedback" role="status" aria-live="polite">{status}</div>}
      {compact&&<MobileNavigation selected={mobileDestination} onSelect={mobileNavigate} onActions={!view.pendingDecision&&view.phase!=='finished'&&view.activeSeatId===own.id&&!mobileActionMode?()=>{setMobileActionsOpen(true);setMobileSheet('expanded');setHistoryOpen(false);setAiDismissed(true);}:undefined} pending={!!view.pendingDecision&&screen!=='Decision'} pendingLabel={view.pendingDecision?`Return to ${choiceLabel(view.pendingDecision)}`:undefined} onDecision={returnToChoice} onConfirm={mobileActionMode&&draft&&action!=='research'?{label:draft.command.type==='trade-and-act'?'Convert & confirm':draft.command.type==='finish-upkeep'?'Finish upkeep':'Confirm',disabled:blocked||draftGuard.stale||!stillLegal,submit:()=>onSubmit(draft.command)}:undefined} onEndAction={mobileActionMode&&!draft&&candidates.some(candidate=>candidate.command.type==='end-action')?()=>activate('end-action'):undefined} actionLabel={mobileActionMode?`${actionLabel(action)}${view.actionProgress?` · ${view.actionProgress.budgets?.[action as import("../../shared/eclipse/types").Action]??view.actionProgress.remaining} left`:''}`:undefined} onBack={()=>{setMobileActionMode(false);setMobileSheet('closed');setMobileActionsOpen(false);setScreen('Galaxy');}} onDetails={mobileActionMode&&!['research','upgrade','trade'].includes(action)?()=>{if(action==='build')setBuildOpen(true);else setMobileSheet('expanded');}:undefined}/>}
    </main>
  );
}
