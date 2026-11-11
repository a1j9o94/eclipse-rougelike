import BoardShell from './board/BoardShell';
import { useBoardInspection } from './board/useBoardInspection';
import BoardInspector from './board/BoardInspector';
import BoardWorkspace from './board/BoardWorkspace';
import { deriveBlueprintStats, effectiveBlueprintParts } from '../../shared/eclipse/blueprints';
import ShipPartStats from './ShipPartStats';
import EncounterWorkspace from './board/EncounterWorkspace';
import BoardBlueprintWorkspace from './board/BoardBlueprintWorkspace';
import BoardHeader from './board/BoardHeader';
import BoardRoster from './board/BoardRoster';
import { humanize } from './board/boardLabels';
import { useBoardActionResults } from './board/useBoardActionResults';
import { useBoardCommands, directTurnActions } from './board/useBoardCommands';
import { useBoardNavigation } from './board/useBoardNavigation';
import { useBoardMap, useBoardDecisionMap } from './board/useBoardMap';
import { useEncounterPresentation } from './board/useEncounterPresentation';
import MinorSpeciesMarket from './MinorSpeciesMarket';
import CombatAutomationControl from './CombatAutomationControl';
import type { CombatAutomationStatus } from '../../shared/eclipse/combatAutomation';
import ActivityDock, { type DraftActivity } from './ActivityDock';
import ActionIcon from './ActionIcon';
import CommitBar from './CommitBar';
import { ACTION_ENTRIES } from './actionRegistry';
import { DecisionMapContext } from './decisionMapContext';
import { galaxyPoint } from './galaxyGeometry';
import { CommitContext } from './commitContext';
import UpkeepSettlement from './UpkeepSettlement';
import { needsUpkeep, upkeepReadyCount } from './upkeepParticipation';
import FactionAbilityControls from './FactionAbilityControls';
import { useCombatVolleySounds } from './sound/useCombatVolleySounds';
import { useGameSoundFeedback } from './sound/useGameSoundFeedback';
import ChoiceWorkspace from './ChoiceWorkspace';
import AutoPassControl from './AutoPassControl';
import SectorDecks from './SectorDecks';
import ReputationSummary from './ReputationSummary';
import { useAutomaticReputation } from './useAutomaticReputation';
import { choiceLabel } from './choiceLabels';
import TurnOrderStrip from './TurnOrderStrip';
import { passButtonLabel } from '../../shared/eclipse/passing';
import { type AiDifficulty } from '../../shared/eclipse/aiConfig';
import EmpireOverview from './EmpireOverview';
import GameSettingsPanel from './GameSettingsPanel';
import { DiceRollScopeContext, useMotionEnabled, useFollowAiEnabled } from './presentationSettings';
import { PublicInspectionProvider, usePublicInspection } from './PublicInspectionContext';
import PublicInspectionModal from './PublicInspectionModal';
import ScoreWorkspace from './ScoreWorkspace';
import MovementBattlePreview from './MovementBattlePreview';
import FleetInspection from './FleetInspection';
import { addBuildItem, emptyBuildOrder } from './buildPlanning';
import { empireBuildOptions } from './empireBuildOptions';
import type { MovementRoutePreview } from './movementPlanning';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { previewCommand } from '../../shared/eclipse/commandPreview';
import { getFaction } from '../../shared/eclipse/catalog';
import type { GameCommand, PlayerView } from '../../shared/eclipse/types';
import { canPlanNextTurn, nextTurnPlanningView, queuedActionSummary } from './queuedActionPlanning';
import { type QueuedAction } from '../../shared/eclipse/queuedActions';
import { legalCommands, publicBlueprint } from '../../shared/eclipse/legal';
import { connectionBetween, movableShipCount } from '../../shared/eclipse/geometry';
import { mapSector, movementAbilities } from '../../shared/eclipse/rulesState';
import type { TechnologyId } from '../../shared/eclipse/technologies';
import DecisionPanel from './DecisionPanel';
import GalaxyBoard from './GalaxyBoard';
import SectorPlanets from './SectorPlanets';
import SectorFleet from './SectorFleet';
import ActionEconomy from './ActionEconomy';
import HistoryPanel, { type HistoryRollbackControl } from './HistoryPanel';
import AiActionPanel from './AiActionPanel';
import AiActivityBar from './AiActivityBar';
import { useAiPresentation } from './useAiPresentation';
import type { HistoryFeed } from '../second-dawn-session/useMatchHistory';
import TradePanel from './TradePanel';
import InfluencePlanner from './InfluencePlanner';
import ColonizationPlanner from './ColonizationPlanner';
import ExploreOdds from './ExploreOdds';
import './upkeepColonyReview.css';
import { ChoiceCards } from './DecisionChoicePrimitives';
import BuildPlanner from './BuildPlanner';
import MovementPlanner from './MovementPlanner';
import FundingPlanSelector from './FundingPlanSelector';
import { fundedCandidates } from './fundedCandidates';
import { fundingOptions } from '../../shared/eclipse/funding';
import { CombatPlayback } from './BattleOverview';
import DiplomacyPanel from './DiplomacyPanel';
import { runningScore } from './runningScore';
import { shipClassName } from './shipLabels';
import type { BlueprintShipType, ShipBlueprint } from '../../shared/eclipse/blueprints';
import '../second-dawn/second-dawn.css';
import './game.css';
import { useMobileLayout } from './mobileLayout';
import MobileNavigation, { type MobileDestination } from './MobileNavigation';
import MobileActionPicker, { type MobileActionOption } from './MobileActionPicker';
import './mobileBoard.css';
import './choiceWorkspace.css';
import './actionRail.css';
import './visualPlay.css';
import { ActionDraftProvider, type SavedQueuedActionReceipt } from './ActionDraftProvider';
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import ActionDraftNotice from './ActionDraftNotice';
import ResearchWorkspace from './ResearchWorkspace';
export interface CommandCandidate {
  command: GameCommand;
  label: string;
  description: string;
}
interface Props {
  combatAutomation?: CombatAutomationStatus | null;
  onCombatAutomation?: (enabled: boolean) => void;
  matchId?: string;
  lastAcceptedCommand?: { revision: number; type: GameCommand['type'] };
  lastQueuedCommand?: SavedQueuedActionReceipt;
  queuedAction?: QueuedAction | null;
  onQueue?: (command: GameCommand | null) => void;
  activityRecap?: ReactNode;
  recapOpen?: boolean;
  playerNames?: Record<string, string>;
  turnClock?: ReactNode;
  menuLabel?: string;
  reviewMode?: boolean;
  initialSectorId?: string;
  history?: HistoryFeed;
  historyRollback?: HistoryRollbackControl;
  interactionBlockedReason?: string;
  showCombatOdds?: boolean;
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

export default function SecondDawnBoard(props: Props) {
  return (
    <DiceRollScopeContext.Provider
      value={`${props.matchId ?? 'preview'}:${props.view.viewerSeatId}`}
    >
      <ActionDraftProvider
        matchId={props.matchId}
        viewerSeatId={props.view.viewerSeatId}
        revision={props.view.revision}
        lastAcceptedCommand={props.lastAcceptedCommand}
        lastQueuedCommand={props.lastQueuedCommand}
      >
        <PublicInspectionProvider>
          <SecondDawnBoardContent {...props} />
        </PublicInspectionProvider>
      </ActionDraftProvider>
    </DiceRollScopeContext.Provider>
  );
}
function SecondDawnBoardContent({
  view,
  matchId,
  combatAutomation,
  onCombatAutomation,
  candidates: liveCandidates,
  connected,
  busy,
  status,
  onSubmit: submitAuthoritative,
  onQueue,
  queuedAction,
  lastQueuedCommand,
  onMenu,
  onHome,
  onPlayAgain,
  aiDifficulty = 'normal',
  aiThinking = false,
  aiTakeover = false,
  aiFailure,
  onRetryAi,
  reviewMode = false,
  initialSectorId,
  history,
  historyRollback,
  interactionBlockedReason,
  showCombatOdds = false,
  turnClock,
  menuLabel = 'Game menu',
  playerNames = {},
  activityRecap,
  lastAcceptedCommand,
  recapOpen = false,
}: Props) {
  const compact = useMobileLayout();
  const {
    mobileSheet,
    setMobileSheet,
    mobileActionsOpen,
    setMobileActionsOpen,
    mobileActionMode,
    setMobileActionMode,
    aiDismissed,
    setAiDismissed,
    reviewAi,
    setReviewAi,
    historyOpen,
    setHistoryOpen,
    boardToolsOpen,
    setBoardToolsOpen,
    empireMapSeat,
    setEmpireMapSeat,
    upkeepBrowsing,
    setUpkeepBrowsing,
    screen,
    setScreen,
    inspectorOpen,
    setInspectorOpen,
    restoreChoiceFocus,
    showDecisionMap,
    browseGalaxy,
    returnToChoice,
    browseTechnologies,
  } = useBoardNavigation(view, initialSectorId);
  const queueMode = !!onQueue && canPlanNextTurn(view);
  const planningView = useMemo(
    () => (queueMode ? nextTurnPlanningView(view) : view),
    [view, queueMode],
  );
  const candidates = useMemo(
    () => (queueMode ? legalCommands(planningView) : liveCandidates),
    [queueMode, planningView, liveCandidates],
  );
  useAutomaticReputation(view, connected, busy || !!interactionBlockedReason, submitAuthoritative);
  const {
    reputationSummaryId,
    setDismissedReputationId,
    playback,
    combatNotice,
    knownShips,
    battleContext,
    battleMapEncounterId,
    setBattleMapEncounterId,
    encounterId,
    reputationSummaryVisible,
    combatReputationVisible,
    dismissCombatReputation,
  } = useEncounterPresentation(view, screen, history);
  const publicInspection = usePublicInspection();
  const draftGuard = useActionDraftGuard();
  const { onSubmit, submittedResearch, submittedTurnHandoff } = useBoardCommands({
    scope: `${matchId ?? 'preview'}:${view.viewerSeatId}`,
    view,
    queueMode,
    interactionBlockedReason,
    lastAcceptedCommand,
    draftGuard,
    sound: { submitted: (command) => sound.submitted(command), rejected: () => sound.rejected() },
    submitAuthoritative,
    onQueue,
  });

  const [followAi, setFollowAi] = useFollowAiEnabled();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [buildStage, setBuildStage] = useState<'catalog' | 'placement'>('catalog');
  const [motionEnabled, changeMotion] = useMotionEnabled();
  const aiPresentation = useAiPresentation(view, history?.entries ?? [], motionEnabled);
  useEffect(() => {
    setReviewAi(false);
  }, [aiPresentation.actor?.id, setReviewAi]);
  const showAiPanel =
    (!needsUpkeep(view) || reviewAi) &&
    followAi &&
    !aiDismissed &&
    !!aiPresentation.action &&
    (!!aiPresentation.actor || reviewAi) &&
    !view.pendingDecision;
  const changeFollowAi = (enabled: boolean) => {
    setFollowAi(enabled);
    setAiDismissed(false);
    if (!compact && screen === 'Galaxy') {
      if (enabled && aiPresentation.action && (aiPresentation.actor || reviewAi)) {
        setInspectorOpen(true);
        openedForAi.current = true;
      } else if (!enabled && showAiPanel) {
        setInspectorOpen(false);
        openedForAi.current = false;
      }
    }
    if (!enabled) setReviewAi(false);
  };

  const [buildOpen, setBuildOpen] = useActionDraftState('buildOpen', false);
  const [buildOrder, setBuildOrder] = useActionDraftState('buildOrder', emptyBuildOrder);
  const [buildHereSector, setBuildHereSector] = useState<string | null>(null);
  const [buildTargets, setBuildTargets] = useState<readonly string[]>([]);
  const [buildPlacement, setBuildPlacement] = useState<{ sectorId: string; serial: number } | null>(
    null,
  );
  const browsingUpkeep = view.phase === 'upkeep' && upkeepBrowsing;
  const [inspectSector, setInspectSector] = useState<string | null>(null);
  const [inspectDiplomacy, setInspectDiplomacy] = useState<string | null>(null);
  const [movementDraft] = useActionDraftState('movement', { source: null, ids: [] });
  const [moveRoutePreviews, setMoveRoutePreviews] = useState<readonly MovementRoutePreview[]>([]);
  const [moveOpen, setMoveOpen] = useActionDraftState('moveOpen', false);
  const [moveSource, setMoveSource] = useActionDraftState('moveSource', null);
  const [moveTarget, setMoveTarget] = useActionDraftState('moveTarget', null);
  const [moveTargets, setMoveTargets] = useState<string[]>([]);
  const [influenceTargets, setInfluenceTargets] = useState<string[]>([]);
  const [colonyTargets, setColonyTargets] = useState<readonly string[]>([]);
  const [economyFocusRequest, setEconomyFocusRequest] = useState(0);
  const spatialDecision =
    !!view.pendingDecision &&
    ['exploration', 'control', 'bankruptcy', 'portal-placement', 'colonization'].includes(
      view.pendingDecision.kind,
    );
  const spatialDecisionOpen = spatialDecision && screen === 'Decision';
  const desktopInspectorVisible =
    spatialDecisionOpen || (inspectorOpen && (screen === 'Galaxy' || historyOpen));
  const pendingId = view.pendingDecision?.id;
  const {
    selected,
    setSelected,
    camera,
    setCamera,
    fitRequest,
    setFitRequest,
    fixedFit,
    setFixedFit,
  } = useBoardMap(view, initialSectorId);
  const diplomacyDecision =
    view.pendingDecision?.kind === 'diplomacy' || view.pendingDecision?.kind === 'diplomacy-window';
  const inspectingGalaxy =
    !!publicInspection?.active ||
    browsingUpkeep ||
    empireMapSeat !== null ||
    Boolean(planningView.pendingDecision) ||
    view.phase === 'finished';
  const previousUiReceipt = useRef(lastAcceptedCommand);
  useEffect(() => {
    if (previousUiReceipt.current === lastAcceptedCommand) return;
    const previousReceipt = previousUiReceipt.current;
    previousUiReceipt.current = lastAcceptedCommand;
    if (
      lastAcceptedCommand &&
      lastAcceptedCommand.type !== 'set-auto-pass' &&
      (!previousReceipt || lastAcceptedCommand.revision > previousReceipt.revision) &&
      !submittedTurnHandoff.current
    )
      submittedTurnHandoff.current = {
        receipt: previousReceipt,
        revision: previousReceipt?.revision ?? -1,
        type: lastAcceptedCommand.type,
      };
    if (lastAcceptedCommand?.type === 'end-action') {
      setMoveOpen(false);
      setBuildOpen(false);
      setMoveTargets([]);
    }
  }, [lastAcceptedCommand, setMoveOpen, setBuildOpen, submittedTurnHandoff]);

  useEffect(() => {
    const pending = submittedTurnHandoff.current;
    if (
      !pending ||
      !lastAcceptedCommand ||
      lastAcceptedCommand.revision <= pending.revision ||
      lastAcceptedCommand.type !== pending.type ||
      view.revision < lastAcceptedCommand.revision
    )
      return;
    if (pendingId || view.phase === 'finished') {
      submittedTurnHandoff.current = null;
      return;
    }
    const controlOwner = view.waitingFor?.owner ?? view.activeSeatId;
    submittedTurnHandoff.current = null;
    if (
      lastAcceptedCommand.type !== 'finish-upkeep' &&
      ((controlOwner === view.viewerSeatId && view.phase !== 'upkeep') || needsUpkeep(view))
    )
      return;
    if (!['pass', 'end-action', 'finish-upkeep'].includes(lastAcceptedCommand.type)) return;
    // Explicit turn completion returns to the galaxy; action results remain in context.
    setAiDismissed(false);
    setReviewAi(false);
    setScreen('Galaxy');
    setInspectorOpen(false);
    if (compact) {
      setMobileSheet('closed');
      setMobileActionMode(false);
    }
  }, [
    compact,
    lastAcceptedCommand,
    pendingId,
    setScreen,
    view.activeSeatId,
    view.phase,
    view.revision,
    view.viewerSeatId,
    view.waitingFor,
    view,
    submittedTurnHandoff,
    setAiDismissed,
    setReviewAi,
    setInspectorOpen,
    setMobileSheet,
    setMobileActionMode,
  ]);

  useEffect(() => {
    if (!pendingId && screen === 'Decision') setScreen('Galaxy');
  }, [pendingId, screen, setScreen]);
  useEffect(() => {
    if (view.phase === 'finished') {
      setScreen('Scoring');
      setMobileSheet('closed');
      setMobileActionMode(false);
    }
  }, [view.phase, setScreen, setMobileSheet, setMobileActionMode]);
  const shownPendingId = useRef<string | undefined>(undefined);
  const activityIdentity = encounterId ?? pendingId;
  useEffect(() => {
    if (shownPendingId.current === activityIdentity) return;
    shownPendingId.current = activityIdentity;
    if (
      publicInspection?.active ||
      inspectSector ||
      (!['Galaxy', 'Decision'].includes(screen) && lastAcceptedCommand?.revision !== view.revision)
    )
      return;
    if (pendingId) {
      setScreen('Decision');
      setSelected(
        view.pendingDecision && 'sectorId' in view.pendingDecision
          ? (view.pendingDecision.sectorId ?? null)
          : null,
      );
      setInspectorOpen(spatialDecision);
      setMobileSheet(spatialDecision ? 'expanded' : 'closed');
      setMobileActionsOpen(false);
      setMobileActionMode(false);
      setHistoryOpen(false);
    }
  }, [
    activityIdentity,
    pendingId,
    setScreen,
    setSelected,
    setHistoryOpen,
    spatialDecision,
    view.pendingDecision,
    publicInspection?.active,
    inspectSector,
    screen,
    lastAcceptedCommand?.revision,
    view.revision,
    setInspectorOpen,
    setMobileSheet,
    setMobileActionsOpen,
    setMobileActionMode,
  ]);
  const previousRecapOpen = useRef(false);
  useEffect(() => {
    if (view.phase === 'finished') {
      previousRecapOpen.current = recapOpen;
      return;
    }
    if (recapOpen && !previousRecapOpen.current && !pendingId) {
      setScreen('Activity');
      setMobileSheet('closed');
      setMobileActionMode(false);
    } else if (!recapOpen && previousRecapOpen.current) {
      setScreen(pendingId ? 'Decision' : 'Galaxy');
      setMobileSheet('closed');
    }
    previousRecapOpen.current = recapOpen;
  }, [recapOpen, pendingId, setScreen, view.phase, setMobileSheet, setMobileActionMode]);
  useEffect(() => {
    if (compact && showAiPanel && screen === 'Galaxy') {
      setMobileSheet('peek');
      setMobileActionsOpen(false);
    }
  }, [
    compact,
    showAiPanel,
    screen,
    aiPresentation.action?.revision,
    setMobileSheet,
    setMobileActionsOpen,
  ]);
  const presentedAiAction = useRef<number | null>(null);
  const openedForAi = useRef(false);
  useEffect(() => {
    const revision = aiPresentation.action?.revision;
    if (revision === undefined || presentedAiAction.current === revision) return;
    // Consume each public entry once, even while the player is inspecting elsewhere.
    presentedAiAction.current = revision;
    if (
      !compact &&
      showAiPanel &&
      screen === 'Galaxy' &&
      !historyOpen &&
      !empireMapSeat &&
      !inspectSector &&
      !publicInspection?.active
    ) {
      setInspectorOpen(true);
      openedForAi.current = true;
    }
  }, [
    aiPresentation.action?.revision,
    compact,
    showAiPanel,
    screen,
    historyOpen,
    empireMapSeat,
    inspectSector,
    publicInspection?.active,
    setInspectorOpen,
  ]);
  useEffect(() => {
    if (!aiPresentation.actor && openedForAi.current && !reviewAi) {
      openedForAi.current = false;
      if (!aiDismissed) setInspectorOpen(false);
    }
  }, [aiPresentation.actor, reviewAi, aiDismissed, setInspectorOpen]);
  const sound = useGameSoundFeedback({
    revision: view.revision,
    connected,
    busy,
    status,
    receipt: lastAcceptedCommand,
    aiEntry: aiPresentation.action,
    aiVisible:
      showAiPanel &&
      !settingsOpen &&
      screen === 'Galaxy' &&
      !empireMapSeat &&
      !inspectSector &&
      !publicInspection?.active &&
      !reviewAi,
    reviewing: historyOpen || recapOpen,
  });

  useCombatVolleySounds({
    volleys: !view.battle && !combatNotice.visible && playback ? playback.volleys : [],
    eligible: !!playback && sound.combatLive(playback.revision),
    awaitingDice: false,
    skipped: false,
  });
  const [action, setAction] = useActionDraftState(
    'action',
    view.actionProgress?.owner === view.viewerSeatId ? view.actionProgress.action : 'explore',
  );
  const [otherDraft, setOtherDraft] = useActionDraftState('commandDraft', null);
  const [researchDraft, setResearchDraft] = useActionDraftState('researchDraft', null);
  const {
    buildResult,
    setBuildResult,
    pendingBuild,
    movementResult,
    setMovementResult,
    pendingMove,
    acquiredResearch,
  } = useBoardActionResults({
    scope: `${matchId ?? 'preview'}:${view.viewerSeatId}`,
    view,
    lastAcceptedCommand,
    lastQueuedCommand,
    setBuildOpen,
    setMoveOpen,
    setMoveTarget,
    setResearchDraft,
    submittedResearch,
  });
  const [exploreDraft, setExploreDraft] = useActionDraftState('exploreDraft', null);
  const [influenceDraft] = useActionDraftState('influenceDraft', null);
  const [colonizationDraft] = useActionDraftState('colonization', {});
  const [factionDraft] = useActionDraftState('factionDraft', null);
  const [auxiliaryActivity, setAuxiliaryActivity] = useState<'faction' | 'guild-trade' | null>(
    null,
  );
  const plannedColonies = Object.entries(colonizationDraft).map(([key, resource]) => {
    const separator = key.lastIndexOf(':');
    return { sectorId: key.slice(0, separator), squareId: key.slice(separator + 1), resource };
  });
  const otherDraftAction =
    otherDraft?.command.type === 'trade-and-act'
      ? otherDraft.command.action.type
      : otherDraft?.command.type;
  const draft = auxiliaryActivity
    ? null
    : action === 'research'
      ? researchDraft
      : action === 'explore'
        ? exploreDraft
        : otherDraftAction === action
          ? otherDraft
          : null;
  const setDraft =
    action === 'research'
      ? setResearchDraft
      : action === 'explore'
        ? setExploreDraft
        : setOtherDraft;
  const [researchSelection, setResearchSelection] = useActionDraftState('researchSelection', null);
  const [editing, setEditing] = useActionDraftState('editing', null);
  const [blueprintDrafts, setBlueprintDrafts] = useState<{
    revision: number;
    drafts: Partial<Record<BlueprintShipType, ShipBlueprint>>;
  }>({ revision: view.revision, drafts: {} });
  const rememberBlueprintDraft = useCallback(
    (draft: ShipBlueprint) => {
      setBlueprintDrafts((current) => ({
        revision: view.revision,
        drafts: {
          ...(current.revision === view.revision ? current.drafts : {}),
          [draft.shipType]: draft,
        },
      }));
    },
    [view.revision],
  );
  const [playerId, setPlayerId] = useActionDraftState('playerId', view.viewerSeatId);
  const inspectionTargets = useBoardInspection({
    view,
    inspectionActive: publicInspection?.active,
    screen,
    camera,
    selected,
    inspectorOpen,
    mobileSheet,
    setScreen,
    setCamera,
    setSelected,
    setInspectorOpen,
    setMobileSheet,
  });
  const {
    publishDecisionMap,
    mapDecision,
    activeDecisionMap,
    retreatMapActive,
    decisionMapView,
    focusDecisionSector,
  } = useBoardDecisionMap({ view, compact, spatialDecision, fixedFit, setSelected, setCamera });
  const desktopRestored = useRef(false);
  useEffect(() => {
    if (compact || desktopRestored.current) return;
    desktopRestored.current = true;
    if (draft && screen === 'Galaxy') setInspectorOpen(true);
  }, [compact, draft, screen, setInspectorOpen]);
  const mobileRestored = useRef(false);
  useEffect(() => {
    if (!compact || mobileRestored.current) return;
    mobileRestored.current = true;
    if (!pendingId && (draft || moveOpen || ['influence', 'colonize'].includes(action))) {
      setMobileActionMode(true);
      setMobileSheet(action === 'research' ? 'closed' : 'peek');
    }
  }, [compact, pendingId, draft, moveOpen, action, setMobileActionMode, setMobileSheet]);

  const restoreDetailsFocus = useRef(false);
  const workspaceRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (restoreChoiceFocus.current && screen === 'Galaxy') {
      restoreChoiceFocus.current = false;
      workspaceRef.current
        ?.closest('main')
        ?.querySelector<HTMLButtonElement>(
          '.dg-upkeep-return,button.dg-pending-return,.dg-mobile-pending',
        )
        ?.focus({ preventScroll: true });
    }
  }, [restoreChoiceFocus, screen]);
  useLayoutEffect(() => {
    if (restoreDetailsFocus.current && !desktopInspectorVisible) {
      restoreDetailsFocus.current = false;
      const root = workspaceRef.current?.closest('main');
      (
        root?.querySelector<HTMLButtonElement>('button[aria-controls="sector-details"]') ??
        root?.querySelector<HTMLButtonElement>('.dg-history-toggle')
      )?.focus({ preventScroll: true });
    }
  }, [desktopInspectorVisible]);
  const inspectorRef = useRef<HTMLElement>(null);
  const mobileSheetBodyRef = useRef<HTMLDivElement>(null);
  const actionPanelRef = useRef<HTMLDivElement>(null);
  const [actionFocus, setActionFocus] = useState(0);
  useLayoutEffect(() => {
    if (workspaceRef.current) workspaceRef.current.scrollTop = 0;
  }, [screen, editing, playerId]);
  const own = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const liveScores = view.seats.map((seat) => runningScore(view, seat.id).breakdown);
  const ownScore = liveScores.find((score) => score.playerId === own.id)!;
  const inspectedPlayer = view.seats.find((s) => s.id === playerId) ?? own;
  const sector = view.sectors.find((s) => s.id === selected);
  const blocked = !connected || busy || !!interactionBlockedReason;
  const finishUpkeep = (command: GameCommand) => {
    if (command.type !== 'finish-upkeep' || blocked) return;
    onSubmit(command);
  };
  const funded = useMemo(() => fundedCandidates(planningView), [planningView]);
  const purchases = [...candidates, ...funded];
  const available = purchases.filter(
    (c) => (c.command.type === 'trade-and-act' ? c.command.action.type : c.command.type) === action,
  );
  const draftPreview = draft ? previewCommand(planningView, draft.command) : null;
  const isLegalDraft = (choice: CommandCandidate | null) =>
    !!choice &&
    (purchases.some(
      (candidate) => JSON.stringify(candidate.command) === JSON.stringify(choice.command),
    ) ||
      (choice.command.type === 'trade-and-act' &&
        fundingOptions(planningView, choice.command.action).some(
          (option) => JSON.stringify(option.command) === JSON.stringify(choice.command),
        )));
  const stillLegal = isLegalDraft(draft);
  const faction = (id: string) => {
    const seat = view.seats.find((s) => s.id === id);
    return seat ? getFaction(seat.faction) : undefined;
  };

  useEffect(() => {
    if (
      view.activeSeatId === view.viewerSeatId &&
      !view.actionProgress &&
      action === 'end-action'
    ) {
      setAction('explore');
      setDraft(null);
    }
  }, [
    view.activeSeatId,
    view.viewerSeatId,
    view.round,
    view.actionProgress,
    action,
    setAction,
    setDraft,
  ]);
  const researchReadOnly =
    !!planningView.pendingDecision ||
    !!planningView.waitingFor ||
    view.phase !== 'action' ||
    own.passed ||
    planningView.activeSeatId !== own.id ||
    (!!planningView.actionProgress && planningView.actionProgress.action !== 'research');
  const activate = (type: GameCommand['type']) => {
    setAuxiliaryActivity(null);
    setBoardToolsOpen(false);
    if (type === 'buy-minor-species') {
      setScreen('Recruitment');
      setBuildOpen(false);
      setMoveOpen(false);
      setInspectorOpen(false);
      setMobileActionMode(true);
      setMobileActionsOpen(false);
      setMobileSheet('closed');
      setHistoryOpen(false);
      return;
    }
    if (type === 'research' && researchReadOnly) {
      browseTechnologies();
      return;
    }
    setUpkeepBrowsing(false);
    setEmpireMapSeat(null);
    setInspectorOpen(
      ['explore', 'influence', 'move', 'colonize', 'build', 'end-action'].includes(type),
    );
    if (!queueMode && diplomacyDecision && type === 'explore') {
      showDecisionMap();
      return;
    }
    if (compact) {
      setMobileActionsOpen(false);
      setMobileActionMode(!directTurnActions.includes(type));
      setMobileSheet(
        ['influence', 'move', 'colonize'].includes(type)
          ? 'expanded'
          : type === 'explore'
            ? 'peek'
            : 'closed',
      );
    }
    setReviewAi(false);
    setAiDismissed(true);
    setHistoryOpen(false);
    setActionFocus((n) => n + 1);
    setAction(type);
    setBuildOpen(type === 'build');
    setMoveOpen(type === 'move');
    setMoveTargets([]);
    if (type === 'upgrade') {
      setPlayerId(own.id);
      setEditing((current) =>
        current && own.blueprints.some((bp) => bp.shipType === current)
          ? current
          : own.blueprints[0].shipType,
      );
    }
    if (type === 'build') {
      setBuildHereSector(null);
      setBuildOpen(true);
      setBuildResult('');
      setScreen('Galaxy');
      return;
    }
    if (type === 'move' && !moveSource) {
      setMoveSource(
        view.ships.some((ship) => ship.sectorId === selected && ship.owner === own.id)
          ? selected
          : (view.ships.find((ship) => ship.owner === own.id)?.sectorId ?? null),
      );
    }
    const direct = directTurnActions.includes(type)
      ? candidates.find((c) => c.command.type === type)
      : undefined;
    if (direct && !blocked) {
      if (queueMode) {
        onSubmit(direct.command);
        return;
      }
      if (type === 'end-action' && previewCommand(view, direct.command).betrayedPartners.length) {
        setOtherDraft(direct);
        setScreen('Galaxy');
        return;
      }
      if (type === 'finish-upkeep') {
        finishUpkeep(direct.command);
        return;
      }
      onSubmit(direct.command);
      setDraft(null);
      return;
    }
    setScreen(
      type === 'offer-diplomacy' || type === 'discard-reputation'
        ? 'Diplomacy'
        : type === 'trade'
          ? 'Trade'
          : type === 'research'
            ? 'Research'
            : type === 'upgrade'
              ? 'Blueprints'
              : 'Galaxy',
    );
  };
  const resumeActivity = (activity: DraftActivity) => {
    if (activity === 'recruitment') {
      setAuxiliaryActivity(null);
      setScreen('Recruitment');
      setHistoryOpen(false);
      setMobileActionMode(false);
      setMobileSheet('closed');
      return;
    }
    if (activity === 'guild-trade') {
      activate('trade');
      setAuxiliaryActivity('guild-trade');
      return;
    }
    if (activity === 'faction') {
      setAuxiliaryActivity('faction');
      setScreen('Galaxy');
      setHistoryOpen(false);
      setBuildOpen(false);
      setMoveOpen(false);
      setInspectorOpen(true);
      setEmpireMapSeat(null);
      setAiDismissed(true);
      setReviewAi(false);
      setAction('explore');
      const target =
        factionDraft?.type === 'load-factory'
          ? view.ships.find((ship) => ship.id === factionDraft.shipId)?.sectorId
          : factionDraft?.type === 'place-guild-portal'
            ? factionDraft.sectorId
            : undefined;
      if (target) setSelected(target);
      if (compact) {
        setMobileActionMode(true);
        setMobileSheet('expanded');
      }
      return;
    }
    activate(activity);
  };
  useEffect(() => {
    if (auxiliaryActivity === 'guild-trade' && screen === 'Trade')
      workspaceRef.current
        ?.querySelector<HTMLElement>('[aria-label="Guild resource exchange"]')
        ?.focus({ preventScroll: false });
  }, [auxiliaryActivity, screen]);
  const reviewUpkeep = () => {
    const candidate = candidates.find((item) => item.command.type === 'finish-upkeep');
    if (!candidate) return;
    setUpkeepBrowsing(false);
    setEmpireMapSeat(null);
    setAction('finish-upkeep');
    setOtherDraft(null);
    setScreen('Galaxy');
    setHistoryOpen(false);
    setInspectorOpen(false);
    setAiDismissed(true);
    setReviewAi(false);
    setBuildOpen(false);
    setMoveOpen(false);
    setActionFocus((n) => n + 1);
    if (compact) {
      setMobileActionsOpen(false);
      setMobileActionMode(false);
      setMobileSheet('closed');
    }
  };
  const showUpkeepReturn =
    needsUpkeep(view) &&
    !view.pendingDecision &&
    (screen !== 'Galaxy' || browsingUpkeep || action === 'colonize') &&
    candidates.some((candidate) => candidate.command.type === 'finish-upkeep');
  const canColonizeAtUpkeep =
    view.phase === 'upkeep' &&
    candidates.some(
      (candidate) =>
        candidate.command.type === 'colonize' && candidate.command.placements.length > 0,
    );
  const openUpkeepColonization = () => {
    if (blocked || !canColonizeAtUpkeep) return;
    activate('colonize');
    if (compact) setMobileSheet('expanded');
  };
  const continueAfterBattle = () => {
    dismissCombatReputation();
    if (view.phase === 'upkeep') {
      reviewUpkeep();
      return;
    }
    setScreen(view.phase === 'finished' ? 'Scoring' : 'Galaxy');
    setInspectorOpen(false);
    setMobileSheet('closed');
  };
  const combatAftermath = playback && combatNotice.visible && !combatReputationVisible && (
    <div className="dg-combat-aftermath">
      <div className="dg-combat-aftermath-heading">
        <strong>Last combat exchange</strong>
        <button onClick={combatNotice.dismiss}>Dismiss battle results</button>
      </div>
      <CombatPlayback
        soundEligible={sound.combatLive(playback.revision)}
        volleys={playback.volleys}
        view={view}
        knownShips={[...knownShips.current.values()]}
        fast={!motionEnabled}
      />
    </div>
  );
  const pendingDecisionPanel = view.pendingDecision ? (
    <DecisionPanel
      motionEnabled={motionEnabled && screen === 'Decision'}
      view={view}
      targetLabels={Object.fromEntries(
        view.ships.map((ship) => [
          ship.id,
          `${faction(ship.owner)?.name ?? humanize(ship.owner)} · ${shipClassName(ship.type, faction(ship.owner)?.id, ship.orbitalShip)} #${view.ships.filter((s) => s.owner === ship.owner && s.type === ship.type).findIndex((s) => s.id === ship.id) + 1}${ship.factoryPopulation ? ' · Materials factory' : ''}`,
        ]),
      )}
      key={view.pendingDecision.id}
      decision={view.pendingDecision}
      candidates={liveCandidates}
      reputation={view.private.reputation}
      disabled={blocked}
      onSubmit={onSubmit}
    />
  ) : null;
  const unavailableAfterPassing = (type: GameCommand['type']) =>
    own.passed && ['explore', 'influence', 'research'].includes(type);
  const actionLabel = (type: GameCommand['type']) =>
    type === 'finish-upkeep'
      ? 'Collect income'
      : type === 'trade'
        ? 'Trade'
        : type === 'pass'
          ? passButtonLabel(view)
          : type === 'end-action'
            ? ({
                move: 'Done moving',
                build: 'Done building',
                research: 'Done researching',
                upgrade: 'Done upgrading',
                explore: 'Done exploring',
                influence: 'Done shaping territory',
              }[view.actionProgress?.action ?? 'move'] ?? 'Done with action')
            : humanize(type);
  const mobileDestination: MobileDestination =
    screen === 'Galaxy' || screen === 'Decision'
      ? 'Galaxy'
      : screen === 'Players'
        ? 'Players'
        : screen === 'Activity'
          ? 'Activity'
          : 'Empire';
  const resumeSavedAction = () => {
    const keys = draftGuard.draftKeys;
    const savedCommand =
      draft?.command.type === 'trade-and-act' ? draft.command.action : draft?.command;
    const restoredAction: GameCommand['type'] =
      savedCommand?.type ??
      (keys.includes('movement') || keys.includes('movementRoutes')
        ? 'move'
        : keys.includes('buildCounts') || keys.includes('buildOrder')
          ? 'build'
          : keys.some((key) => key.startsWith('blueprint-'))
            ? 'upgrade'
            : keys.includes('influenceDraft')
              ? 'influence'
              : keys.includes('colonization')
                ? 'colonize'
                : 'trade');
    setAction(restoredAction);
    setMobileActionsOpen(false);
    setMobileActionMode(true);
    setAiDismissed(true);
    setHistoryOpen(false);
    setScreen(
      restoredAction === 'research'
        ? 'Research'
        : restoredAction === 'upgrade'
          ? 'Blueprints'
          : restoredAction === 'trade'
            ? 'Trade'
            : 'Galaxy',
    );
    if (restoredAction === 'move') setMoveOpen(true);
    if (restoredAction === 'build') setBuildOpen(true);
    if (restoredAction === 'upgrade') {
      setPlayerId(own.id);
      if (!editing)
        setEditing(
          (keys.find((key) => key.startsWith('blueprint-'))?.slice(10) ??
            'interceptor') as BlueprintShipType,
        );
    }
    setMobileSheet(
      ['explore', 'influence', 'colonize', 'move'].includes(restoredAction) ? 'expanded' : 'closed',
    );
  };
  const mobileNavigate = (destination: MobileDestination) => {
    setBoardToolsOpen(false);
    if (destination === 'Galaxy') {
      browseGalaxy();
      return;
    }
    setEmpireMapSeat(null);
    setScreen(destination);
    setHistoryOpen(false);
    setMobileActionMode(false);
    setMobileActionsOpen(false);
    setMobileSheet('closed');
    setAiDismissed(true);
    if (destination === 'Players') setPlayerId(own.id);
  };
  const mobileActionOptions: MobileActionOption[] = ACTION_ENTRIES.filter(
    (entry) => entry.type !== 'buy-minor-species' || !!view.minorSpecies,
  )
    .filter(
      (entry) =>
        entry.type !== 'offer-diplomacy' ||
        candidates.some((candidate) => candidate.command.type === entry.type),
    )
    .map(({ type, label, cue, group }) => ({
      type,
      label,
      description: cue,
      disabled:
        type === 'explore' && diplomacyDecision
          ? blocked
          : type === 'buy-minor-species'
            ? !!interactionBlockedReason
            : type === 'research'
              ? !!interactionBlockedReason
              : blocked ||
                unavailableAfterPassing(type) ||
                !!planningView.pendingDecision ||
                view.phase === 'finished' ||
                (view.phase !== 'action' && group === 'ordinary') ||
                (group === 'other' &&
                  !candidates.some((candidate) => candidate.command.type === type)),
    }));
  const currentActionHasDraft =
    Boolean(draft) ||
    (action === 'build' && buildOrder.items.length > 0) ||
    (action === 'move' && (movementDraft.ids.length > 0 || moveRoutePreviews.length > 0)) ||
    (action === 'influence' && !!influenceDraft) ||
    (action === 'colonize' && plannedColonies.length > 0) ||
    (action === 'upgrade' && draftGuard.draftKeys.some((key) => key.startsWith('blueprint-')));
  const mobileTurnType = (['end-action', 'pass'] as const).find((type) =>
    candidates.some((candidate) => candidate.command.type === type),
  );
  const onMoveSelection = useCallback(
    ({
      sourceSectorId,
      targetSectorId,
    }: {
      sourceSectorId: string | null;
      targetSectorId: string | null;
    }) => {
      setMoveSource(sourceSectorId);
      setMoveTarget(targetSectorId);
      setMoveTargets([]);
    },
    [setMoveSource, setMoveTarget],
  );
  const projectedShipSector = (id: string, original: string) => {
    let current = original;
    for (const route of moveRoutePreviews)
      if (route.status === 'valid')
        for (const path of route.paths)
          if (path.shipId === id) current = path.path.at(-1) ?? current;
    return current;
  };
  const openEconomyTracks = () => {
    setPlayerId(own.id);
    setScreen(compact ? 'Empire' : 'Players');
    setHistoryOpen(false);
    setMobileSheet('closed');
    setMobileActionMode(false);
    setMobileActionsOpen(false);
    setEmpireMapSeat(null);
    setAiDismissed(true);
    setEconomyFocusRequest((request) => request + 1);
  };
  const empireOverview = (seatId: string) => (
    <EmpireOverview
      view={view}
      planningView={planningView}
      seatId={seatId}
      focusEconomyTracks={seatId === own.id ? economyFocusRequest : 0}
      buildOrder={buildOrder}
      buildUnavailableReason={
        !connected
          ? 'Reconnect to build.'
          : busy
            ? 'Saving your last command.'
            : draftGuard.stale
              ? 'Restore the current turn before building.'
              : undefined
      }
      onBuild={(shipType) => {
        if (blocked || draftGuard.stale || seatId !== own.id) return;
        const option = empireBuildOptions(planningView, buildOrder).find(
          (option) => option.shipType === shipType,
        );
        if (!option || option.disabledReason) return;
        activate('build');
        setBuildPlacement(null);
        setBuildOrder((current) => addBuildItem(current, shipType));
      }}
      onSector={(sectorId) => {
        setInspectorOpen(true);
        setEmpireMapSeat(seatId);
        setSelected(sectorId);
        setScreen('Galaxy');
        setHistoryOpen(false);
        setAiDismissed(true);
        setMobileActionMode(false);
        setMobileSheet(compact ? 'expanded' : 'closed');
        setMobileActionsOpen(false);
      }}
      onBlueprints={(shipType) => {
        setPlayerId(seatId);
        setEditing(shipType ?? null);
        setScreen('Blueprints');
        setMobileSheet('closed');
        setMobileActionMode(false);
      }}
      onNavigate={(destination) => {
        setPlayerId(seatId);
        if (destination === 'colonize') {
          activate('colonize');
          return;
        }
        setScreen(destination);
        setMobileSheet('closed');
        setMobileActionMode(false);
        setHistoryOpen(false);
        if (destination === 'Research') setAction('research');
        if (destination === 'Trade') setAction('trade');
      }}
    />
  );
  const buildPlanner = (
    <BuildPlanner
      embedded
      compact={compact}
      onStageChange={setBuildStage}
      view={planningView}
      defaultPlacementSectorId={buildHereSector}
      sectorId={buildHereSector}
      placementRequest={buildPlacement}
      onLegalTargetsChange={setBuildTargets}
      disabled={blocked || (!!lastAcceptedCommand && lastAcceptedCommand.revision > view.revision)}
      onClose={() => {
        setBuildOpen(false);
        setBuildTargets([]);
      }}
      onSubmit={(command) => {
        const action = command.type === 'trade-and-act' ? command.action : command;
        if (!queueMode)
          pendingBuild.current = {
            scope: `${matchId ?? 'preview'}:${view.viewerSeatId}`,
            receipt: lastAcceptedCommand,
            type: command.type,
            count: action.type === 'build' ? action.builds.length : 0,
          };
        onSubmit(command);
      }}
    />
  );
  const activeActivity =
    buildOpen ||
    moveOpen ||
    ['Research', 'Blueprints', 'Trade', 'Recruitment', 'Diplomacy'].includes(screen) ||
    (screen === 'Galaxy' && inspectorOpen);
  const closeActivity = () => {
    if (needsUpkeep(view)) setAction('finish-upkeep');
    setBuildOpen(false);
    setMoveOpen(false);
    setInspectorOpen(false);
    setMobileActionMode(false);
    setMobileSheet('closed');
    setMobileActionsOpen(false);
    setScreen('Galaxy');
    setAuxiliaryActivity(null);
    setHistoryOpen(false);
  };
  const activityTools = !view.pendingDecision ? (
    <ActivityDock
      current={
        screen === 'Recruitment'
          ? 'recruitment'
          : screen === 'Diplomacy'
            ? 'offer-diplomacy'
            : (auxiliaryActivity ?? action)
      }
      editing={editing}
      disabled={blocked}
      onResume={resumeActivity}
    />
  ) : null;
  const encounterVisible =
    !!encounterId &&
    (screen === 'Decision' || screen === 'Galaxy') &&
    !empireMapSeat &&
    !(spatialDecision && battleMapEncounterId === encounterId);
  const showDecisionReturn =
    !!view.pendingDecision &&
    !encounterVisible &&
    (screen !== 'Decision' || (compact && spatialDecision && mobileSheet !== 'expanded'));
  const battleContinuation =
    view.pendingDecision && spatialDecision ? (
      <CommitBar summary="Battle complete">
        <button
          className="sd-primary"
          onClick={() => {
            setBattleMapEncounterId(encounterId ?? null);
            returnToChoice();
          }}
        >
          Continue to {choiceLabel(view.pendingDecision)}
        </button>
      </CommitBar>
    ) : !view.pendingDecision && !view.battle ? (
      <CommitBar summary="Battle complete">
        <button className="sd-primary" onClick={continueAfterBattle}>
          {view.phase === 'upkeep'
            ? 'Continue to upkeep'
            : view.phase === 'finished'
              ? 'View final scores'
              : 'Return to galaxy'}
        </button>
      </CommitBar>
    ) : null;
  return (
    <CommitContext.Provider value={queueMode}>
      <DecisionMapContext.Provider
        value={
          mapDecision
            ? {
                selectedSectorId: selected,
                selectSector: setSelected,
                focusSector: focusDecisionSector,
                setPresentation: publishDecisionMap,
              }
            : null
        }
      >
        <BoardShell
          sound={sound}
          buildStage={buildStage}
          encounterVisible={encounterVisible}
          compact={compact}
          desktopInspectorVisible={desktopInspectorVisible}
          screen={screen}
          historyOpen={historyOpen}
          buildOpen={buildOpen}
          inspectingGalaxy={inspectingGalaxy}
          spatialDecisionOpen={spatialDecisionOpen}
          moveOpen={moveOpen}
          action={action}
          hasDraft={!!draft}
          motionEnabled={motionEnabled}
        >
          <BoardHeader
            view={view}
            compact={compact}
            score={ownScore.total}
            connected={connected}
            busy={busy}
            reviewMode={reviewMode}
            aiFailure={aiFailure}
            onRetryAi={onRetryAi}
            turnClock={turnClock}
            menuLabel={menuLabel}
            boardToolsOpen={boardToolsOpen}
            historyOpen={historyOpen}
            activityTools={activityTools}
            mobileActivityTools={
              encounterVisible ? (
                <button onClick={() => setInspectSector(battleContext?.sectorId ?? null)}>
                  Inspect fleet
                </button>
              ) : (
                activityTools
              )
            }
            battleLabel={
              encounterVisible
                ? `Battle · ${view.sectors.find((sector) => sector.id === battleContext?.sectorId)?.tileId}`
                : undefined
            }
            battleControls={
              encounterVisible && onCombatAutomation ? (
                <CombatAutomationControl
                  view={view}
                  status={combatAutomation}
                  disabled={blocked}
                  onChange={onCombatAutomation}
                />
              ) : undefined
            }
            onToggleTable={() => setBoardToolsOpen((open) => !open)}
            onCloseActivity={activeActivity ? closeActivity : undefined}
            onSettings={() => setSettingsOpen(true)}
            onOpenTracks={openEconomyTracks}
            onMobileScore={() => {
              setScreen('Scoring');
              setMobileSheet('closed');
              setMobileActionMode(false);
            }}
            onScore={() => setScreen('Scoring')}
            onHistory={() => {
              setHistoryOpen((open) => !open);
              setInspectorOpen(true);
              if (screen === 'Decision') setScreen('Galaxy');
            }}
            onMenu={onMenu}
          />
          <TurnOrderStrip
            view={view}
            onInspect={(seatId) => {
              setReviewAi(false);
              setAiDismissed(true);
              setPlayerId(seatId);
              setScreen('Players');
              setBoardToolsOpen(false);
              setHistoryOpen(false);
              setMobileSheet('closed');
              setMobileActionMode(false);
              setMobileActionsOpen(false);
            }}
          />
          {queueMode && !queuedAction && (
            <p className="dg-queue-planning-hint" role="status">
              Choose your next action · will execute on your turn.
            </p>
          )}
          {queuedAction && (
            <section className="dg-next-action" aria-label="Queued next action">
              <div>
                <strong>
                  {humanize(
                    (queuedAction.command.type === 'trade-and-act'
                      ? queuedAction.command.action
                      : queuedAction.command
                    ).type,
                  )}
                  {queuedAction.status === 'pending'
                    ? ' · will execute on your turn'
                    : ' · could not execute'}
                </strong>
                {queuedActionSummary(queuedAction.command, view) && (
                  <p>{queuedActionSummary(queuedAction.command, view)}</p>
                )}
                {queuedAction.error && <p role="alert">{queuedAction.error}</p>}
              </div>
              <button type="button" disabled={!onQueue || blocked} onClick={() => onQueue?.(null)}>
                Cancel queued action
              </button>
            </section>
          )}
          {!view.pendingDecision && (
            <div className="dg-board-draft-notice">
              <ActionDraftNotice />
            </div>
          )}

          {compact && aiFailure && (
            <button
              className="dg-recovery-inline"
              disabled={!connected}
              title={aiFailure}
              onClick={onRetryAi}
            >
              AI paused · retry
            </button>
          )}
          {!compact && showUpkeepReturn && (
            <button className="dg-upkeep-return" onClick={reviewUpkeep}>
              Return to upkeep
            </button>
          )}
          {!compact && showDecisionReturn && view.pendingDecision && (
            <button
              className={
                view.pendingDecision.kind === 'bankruptcy'
                  ? 'dg-upkeep-return'
                  : 'dg-pending-return'
              }
              onClick={returnToChoice}
            >
              Return to {choiceLabel(view.pendingDecision)}
            </button>
          )}
          <div className="sd-layout">
            <aside className="sd-players" hidden={!boardToolsOpen}>
              <button className="dg-table-close" onClick={() => setBoardToolsOpen(false)}>
                Close table details
              </button>
              <BoardRoster
                view={view}
                aiDifficulty={aiDifficulty}
                playerNames={playerNames}
                scores={liveScores}
                onInspect={(seatId) => {
                  setReviewAi(false);
                  setAiDismissed(true);
                  setPlayerId(seatId);
                  setScreen('Players');
                  setBoardToolsOpen(false);
                }}
              />

              <AiActivityBar
                statusInHeader
                upkeep={
                  view.phase === 'upkeep'
                    ? needsUpkeep(view)
                      ? 'preparing'
                      : 'complete'
                    : undefined
                }
                currentAction={
                  view.actionProgress?.owner === own.id && !view.pendingDecision
                    ? view.actionProgress.budgets
                      ? `Build & move: ${view.actionProgress.budgets.build ?? 0} build · ${view.actionProgress.budgets.move ?? 0} move remaining. No extra action disc.`
                      : `Continue ${view.actionProgress.action}: ${view.actionProgress.remaining} activations remaining.`
                    : undefined
                }
                takeover={aiTakeover}
                thinking={aiThinking}
                following={followAi}
                onFollowChange={changeFollowAi}
                humanDecision={!!view.pendingDecision}
                paused={!!aiFailure}
                actor={aiPresentation.actor}
                recent={aiPresentation.recent}
                humanTurn={
                  !!view.pendingDecision ||
                  (!view.waitingFor &&
                    (view.phase === 'upkeep' ? needsUpkeep(view) : view.activeSeatId === own.id))
                }
                finished={view.phase === 'finished'}
                motionEnabled={motionEnabled}
                onMotionChange={changeMotion}
                onWatch={() => {
                  setInspectorOpen(true);
                  if (compact) setMobileSheet('peek');
                  setFollowAi(true);
                  setAiDismissed(false);
                  setReviewAi(!aiPresentation.actor);
                  setHistoryOpen(false);
                  setScreen('Galaxy');
                  if (!fixedFit) {
                    setCamera(null);
                    setFitRequest((n) => n + 1);
                  }
                }}
              >
                {view.phase === 'upkeep' && (
                  <span className="dg-upkeep-progress" role="status">
                    {upkeepReadyCount(view)}
                  </span>
                )}
                <SectorDecks view={view} />
                {((screen !== 'Galaxy' && screen !== 'Decision') || view.phase === 'upkeep') && (
                  <button className="dg-board-control" onClick={browseGalaxy}>
                    View galaxy
                  </button>
                )}
                {screen === 'Galaxy' && (
                  <>
                    {showAiPanel &&
                      !historyOpen &&
                      (compact ? mobileSheet !== 'closed' : desktopInspectorVisible) && (
                        <button
                          className="dg-board-control"
                          onClick={() => {
                            setAiDismissed(true);
                            setReviewAi(false);
                            inspectorRef.current?.focus({ preventScroll: true });
                          }}
                        >
                          Return to inspector
                        </button>
                      )}
                    {!compact && (
                      <button
                        className="dg-board-control"
                        aria-controls="sector-details"
                        aria-expanded={desktopInspectorVisible}
                        onClick={() => {
                          if (desktopInspectorVisible) {
                            restoreDetailsFocus.current = true;
                            setAiDismissed(true);
                          }
                          setInspectorOpen((open) => !open);
                        }}
                      >
                        {desktopInspectorVisible ? 'Hide' : 'Show'} sector details
                      </button>
                    )}
                    {empireMapSeat && (
                      <button
                        className="dg-board-control"
                        onClick={() => {
                          setPlayerId(empireMapSeat);
                          setScreen(compact && empireMapSeat === own.id ? 'Empire' : 'Players');
                          setEmpireMapSeat(null);
                          setMobileSheet('closed');
                        }}
                      >
                        Back to empire
                      </button>
                    )}
                  </>
                )}
              </AiActivityBar>
              <FactionAbilityControls
                objectActions={false}
                onPreview={() => setAuxiliaryActivity('faction')}
                view={planningView}
                candidates={candidates}
                disabled={blocked}
                onSubmit={onSubmit}
                onAction={activate}
                onFinish={() => activate('end-action')}
              />
              {reputationSummaryVisible && !combatReputationVisible && (
                <div className="dg-reputation-notice">
                  <ReputationSummary
                    view={view}
                    onDismiss={() => setDismissedReputationId(reputationSummaryId!)}
                  />
                </div>
              )}
              {!compact && (
                <div className="dg-board-tools">
                  {view.pendingDecision &&
                    view.pendingDecision.kind !== 'bankruptcy' &&
                    screen !== 'Decision' && (
                      <div className="dg-pending-return" role="status">
                        <span>Your choice is waiting</span>
                        <button onClick={returnToChoice}>
                          Return to {choiceLabel(view.pendingDecision)}
                        </button>
                      </div>
                    )}
                </div>
              )}
            </aside>
            <section className="sd-main" ref={workspaceRef}>
              {encounterId && (
                <EncounterWorkspace
                  key={encounterId}
                  view={view}
                  battleContext={battleContext}
                  playback={playback}
                  knownShips={[...knownShips.current.values()]}
                  visible={encounterVisible}
                  diceVisible={
                    encounterVisible && !inspectSector && !settingsOpen && !publicInspection?.active
                  }
                  compact={compact}
                  blocked={blocked}
                  motionEnabled={motionEnabled}
                  soundEligible={!!playback && sound.combatLive(playback.revision)}
                  spatialDecision={spatialDecision}
                  combatReputationVisible={combatReputationVisible}
                  pendingDecisionPanel={pendingDecisionPanel}
                  battleContinuation={battleContinuation}
                  combatAutomation={combatAutomation}
                  onCombatAutomation={onCombatAutomation}
                  opponentName={view.waitingFor ? faction(view.waitingFor.owner)?.name : undefined}
                  onInspectFleet={() => setInspectSector(battleContext?.sectorId ?? null)}
                  dismissCombatReputation={dismissCombatReputation}
                />
              )}
              {!encounterId && view.pendingDecision && !spatialDecision && (
                <ChoiceWorkspace
                  key={view.pendingDecision.id}
                  decision={view.pendingDecision}
                  open={screen === 'Decision'}
                  onMinimize={showDecisionMap}
                  tools={
                    (selected && view.pendingDecision.kind !== 'exploration') ||
                    view.pendingDecision.kind === 'discovery' ? (
                      <details className="dg-choice-inspect">
                        <summary>Inspect</summary>
                        <div>
                          {selected && (
                            <button onClick={() => setInspectSector(selected)}>
                              Sector {sector?.tileId ?? selected}
                            </button>
                          )}
                          {view.pendingDecision.kind === 'discovery' && (
                            <button onClick={browseTechnologies}>Technologies</button>
                          )}
                        </div>
                      </details>
                    ) : undefined
                  }
                >
                  {pendingDecisionPanel}
                </ChoiceWorkspace>
              )}
              <div
                className="dg-board-surface"
                hidden={encounterVisible && spatialDecision}
                inert={screen === 'Decision' && !spatialDecision && !retreatMapActive}
                aria-hidden={
                  screen === 'Decision' && !spatialDecision && !retreatMapActive ? true : undefined
                }
              >
                {screen === 'Galaxy' &&
                  !encounterId &&
                  (combatReputationVisible ? (
                    <div className="dg-combat-aftermath">
                      <ReputationSummary view={view} onDismiss={dismissCombatReputation} />
                    </div>
                  ) : (
                    combatAftermath
                  ))}
                <BoardWorkspace
                  view={view}
                  screen={screen}
                  action={action}
                  compact={compact}
                  encounterId={encounterId}
                  empireMapSeat={empireMapSeat}
                  spatialDecision={spatialDecision}
                  retreatMapActive={retreatMapActive}
                  browsingUpkeep={browsingUpkeep}
                  workspaces={{
                    Encounter: () => null,
                    Activity: () => (
                      <div className="sd-workspace dg-mobile-activity">
                        <h1>Activity</h1>
                        {activityRecap}
                        <HistoryPanel
                          rollback={historyRollback}
                          feed={
                            history ?? {
                              entries: [],
                              loading: false,
                              hasOlder: false,
                              loadingOlder: false,
                              error: null,
                              loadOlder: () => {},
                            }
                          }
                        />
                      </div>
                    ),
                    Upkeep: () => (
                      <div className="sd-workspace dg-upkeep-workspace">
                        <UpkeepSettlement
                          view={view}
                          disabled={
                            blocked ||
                            !candidates.some(
                              (candidate) => candidate.command.type === 'finish-upkeep',
                            )
                          }
                          onCollect={() => finishUpkeep({ type: 'finish-upkeep' })}
                          onColonize={canColonizeAtUpkeep ? openUpkeepColonization : undefined}
                        />
                        <button onClick={browseGalaxy}>View galaxy</button>
                      </div>
                    ),
                    Empire: () => (
                      <div className="sd-workspace dg-mobile-empire">
                        {draftGuard.draftKeys.length > 0 && !view.pendingDecision && (
                          <button className="dg-mobile-resume-draft" onClick={resumeSavedAction}>
                            Resume saved action
                          </button>
                        )}
                        {empireOverview(own.id)}
                      </div>
                    ),
                    Recruitment: () => (
                      <div className="sd-workspace">
                        <MinorSpeciesMarket
                          view={planningView}
                          disabled={blocked}
                          onSubmit={onSubmit}
                        />
                      </div>
                    ),
                    Trade: () => (
                      <div className="sd-workspace">
                        <TradePanel
                          exchangeMode={auxiliaryActivity === 'guild-trade' ? 'guild' : 'bank'}
                          onExchangeModeChange={(mode) =>
                            setAuxiliaryActivity(mode === 'guild' ? 'guild-trade' : null)
                          }
                          view={planningView}
                          candidates={candidates}
                          disabled={blocked}
                          onSubmit={onSubmit}
                        />
                      </div>
                    ),
                    Scoring: () => (
                      <ScoreWorkspace
                        view={view}
                        scores={liveScores}
                        playerNames={playerNames}
                        onInspect={(seatId, category) =>
                          publicInspection?.request({ kind: 'score', seatId, category })
                        }
                        onHome={onHome ?? onMenu}
                        onPlayAgain={onPlayAgain ?? onMenu}
                        onGalaxy={() => {
                          setScreen('Galaxy');
                          setMobileSheet('closed');
                          setMobileActionMode(false);
                        }}
                      />
                    ),
                    Diplomacy: () => (
                      <div className="sd-workspace">
                        <DiplomacyPanel
                          view={planningView}
                          candidates={candidates}
                          disabled={blocked}
                          onSubmit={onSubmit}
                        />
                      </div>
                    ),
                    Players: () => (
                      <div className="sd-workspace">
                        {empireOverview(inspectedPlayer.id)}
                        <DiplomacyPanel
                          view={planningView}
                          candidates={candidates}
                          disabled={blocked}
                          onSubmit={onSubmit}
                          inspectedSeatId={inspectedPlayer.id}
                        />
                      </div>
                    ),
                    Blueprints: () => (
                      <BoardBlueprintWorkspace
                        view={view}
                        planningView={planningView}
                        playerId={playerId}
                        editing={editing}
                        blocked={blocked}
                        blueprintDrafts={blueprintDrafts}
                        rememberBlueprintDraft={rememberBlueprintDraft}
                        onSelectOwner={(seatId) => {
                          setPlayerId(seatId);
                          setEditing(null);
                        }}
                        onSelectClass={(shipType) => {
                          setEditing(shipType);
                          if (shipType) setAction('upgrade');
                        }}
                        onEditOwn={() => {
                          setEditing(null);
                          setPlayerId(own.id);
                          activate('upgrade');
                        }}
                        onSubmit={onSubmit}
                      />
                    ),
                    Research: () => (
                      <>
                        <ResearchWorkspace
                          view={planningView}
                          purchases={researchReadOnly ? [] : purchases}
                          selected={researchSelection as TechnologyId | null}
                          draft={researchDraft}
                          disabled={blocked || researchReadOnly}
                          stale={draftGuard.stale}
                          stillLegal={isLegalDraft(researchDraft)}
                          acquired={acquiredResearch}
                          onSelect={(id, owned) => {
                            setResearchSelection(id);
                            if (compact) {
                              setMobileSheet('closed');
                              setMobileActionsOpen(false);
                              setMobileActionMode(!owned && !researchReadOnly);
                            }
                            if (inspectorRef.current) inspectorRef.current.scrollTop = 0;
                          }}
                          onDraft={(next) => {
                            if (!researchReadOnly) setResearchDraft(next);
                          }}
                          onSubmit={onSubmit}
                        />
                      </>
                    ),
                    Galaxy: () => (
                      <>
                        <div className="sd-map-heading">
                          <div>
                            <p className="sd-eyebrow">THE GALAXY</p>
                            <h1>
                              {sector ? `Sector ${sector.tileId}` : `Round ${view.round} galaxy`}
                            </h1>
                          </div>
                          <span>{view.sectors.length} sectors</span>
                        </div>
                        <GalaxyBoard
                          selectionMode={
                            !!activeDecisionMap ||
                            (!inspectingGalaxy &&
                              (buildOpen || moveOpen || ['influence', 'colonize'].includes(action)))
                          }
                          plannedInfluence={
                            !inspectingGalaxy &&
                            action === 'influence' &&
                            influenceDraft?.command.type === 'influence'
                              ? influenceDraft.command
                              : null
                          }
                          plannedColonies={
                            activeDecisionMap?.plannedColonies ??
                            (!inspectingGalaxy && action === 'colonize' ? plannedColonies : [])
                          }
                          showPrintedWormholes={activeDecisionMap?.showPrintedWormholes}
                          plannedBuilds={buildOpen && !inspectingGalaxy ? buildOrder.items : []}
                          plannedMoves={moveOpen && !inspectingGalaxy ? moveRoutePreviews : []}
                          onSelectBuildItem={(id) =>
                            setBuildOrder((current) => ({ ...current, selectedItemId: id }))
                          }
                          onInspectFleet={(id) => {
                            if (
                              spatialDecision &&
                              !view.sectors.some((sector) => sector.id === id)
                            ) {
                              setSelected(id);
                              returnToChoice();
                              return;
                            }
                            setInspectSector(id);
                            setInspectDiplomacy(null);
                          }}
                          compact={compact}
                          camera={camera ?? undefined}
                          onCameraChange={setCamera}
                          fixedFit={fixedFit}
                          onFixedFitChange={setFixedFit}
                          fitRequest={fitRequest}
                          activity={aiPresentation.activity}
                          targetLabel={
                            mapDecision
                              ? (activeDecisionMap?.targetLabel ?? 'eligible sector')
                              : buildOpen
                                ? 'legal deployment sector'
                                : moveOpen
                                  ? 'legal move destination'
                                  : action === 'colonize'
                                    ? 'available planet'
                                    : 'legal influence target'
                          }
                          view={decisionMapView}
                          candidates={
                            inspectingGalaxy
                              ? []
                              : moveOpen || action !== 'explore'
                                ? candidates.filter((c) => c.command.type !== 'explore')
                                : candidates
                          }
                          selected={selected}
                          legalTargetIds={
                            inspectionTargets.length
                              ? inspectionTargets
                              : mapDecision
                                ? (activeDecisionMap?.legalTargetIds ?? [])
                                : inspectingGalaxy
                                  ? []
                                  : buildOpen
                                    ? [...buildTargets]
                                    : moveOpen
                                      ? moveTargets
                                      : action === 'influence'
                                        ? influenceTargets
                                        : action === 'colonize'
                                          ? [...colonyTargets]
                                          : []
                          }
                          onSelect={(id) => {
                            if (spatialDecision) {
                              setSelected(id);
                              setScreen('Decision');
                              setHistoryOpen(false);
                              setInspectorOpen(true);
                              setMobileSheet('expanded');
                              setMobileActionsOpen(false);
                              return;
                            }
                            setHistoryOpen(false);
                            setSelected(id);
                            setInspectorOpen(true);
                            setReviewAi(false);
                            setAiDismissed(true);
                            if (compact) {
                              setMobileSheet(
                                action === 'influence' || (moveOpen && moveTargets.includes(id))
                                  ? 'expanded'
                                  : 'peek',
                              );
                              setMobileActionsOpen(false);
                            }
                            if (inspectingGalaxy) return;
                            if (
                              !fixedFit &&
                              compact &&
                              (moveOpen || buildOpen || ['influence', 'colonize'].includes(action))
                            ) {
                              const destination = view.sectors.find((item) => item.id === id),
                                source = moveOpen
                                  ? view.sectors.find((item) => item.id === moveSource)
                                  : undefined;
                              if (destination) {
                                const to = galaxyPoint(destination.position),
                                  from = source ? galaxyPoint(source.position) : to;
                                setCamera({
                                  center: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
                                  zoom: source ? 2 : 2.5,
                                });
                              }
                            }
                            if (buildOpen) {
                              setBuildPlacement((prior) => ({
                                sectorId: id,
                                serial: (prior?.serial ?? 0) + 1,
                              }));
                            } else if (moveOpen) {
                              if (
                                !moveSource ||
                                (!moveTargets.includes(id) &&
                                  view.ships.some(
                                    (ship) =>
                                      projectedShipSector(ship.id, ship.sectorId) === id &&
                                      ship.owner === own.id,
                                  ))
                              ) {
                                setMoveSource(id);
                                setMoveTarget(null);
                              } else setMoveTarget(id);
                            } else if (
                              action === 'build' &&
                              view.sectors.some((s) => s.id === id && s.owner === own.id)
                            )
                              setBuildOpen(true);
                          }}
                          onExplore={(candidate) => {
                            setSelected(null);
                            setReviewAi(false);
                            setAiDismissed(true);
                            setInspectorOpen(true);
                            if (compact) {
                              setMobileSheet('expanded');
                              setMobileActionMode(true);
                              setMobileActionsOpen(false);
                            }
                            setMoveOpen(false);
                            setMoveTargets([]);
                            setHistoryOpen(false);
                            setAction('explore');
                            setExploreDraft(candidate);
                            if (!fixedFit && compact && candidate.command.type === 'explore')
                              setCamera({
                                center: galaxyPoint(candidate.command.position),
                                zoom: 2.5,
                              });
                            setActionFocus((n) => n + 1);
                          }}
                        />
                        {buildResult && (
                          <p className="dg-plan-result" role="status">
                            {buildResult}
                          </p>
                        )}
                        {compact && buildOpen && !inspectingGalaxy && buildPlanner}
                      </>
                    ),
                  }}
                />
              </div>
            </section>
            <BoardInspector
              compact={compact}
              desktopInspectorVisible={desktopInspectorVisible}
              historyOpen={historyOpen}
              buildOpen={buildOpen}
              inspectingGalaxy={inspectingGalaxy}
              mobileSheet={mobileSheet}
              inspectorRef={inspectorRef}
              mobileSheetBodyRef={mobileSheetBodyRef}
              actionPanelRef={actionPanelRef}
              screen={screen}
              selected={selected}
              researchSelection={researchSelection}
              spatialDecisionOpen={spatialDecisionOpen}
              pendingId={pendingId}
              showAiPanel={showAiPanel}
              aiActionRevision={aiPresentation.action?.revision}
              actionFocus={actionFocus}
            >
              {compact && (
                <div className="dg-mobile-sheet-header">
                  <button
                    className="dg-mobile-sheet-expand"
                    aria-label={`${mobileSheet === 'expanded' ? 'Collapse' : 'Expand'} ${spatialDecisionOpen ? choiceLabel(view.pendingDecision!) : mobileActionsOpen ? 'Actions' : showAiPanel ? 'AI action' : mobileActionMode ? actionLabel(action) : screen === 'Research' ? 'Technology' : sector ? `Sector ${sector.tileId}` : 'Details'} details`}
                    onClick={() => setMobileSheet(mobileSheet === 'expanded' ? 'peek' : 'expanded')}
                  >
                    <span aria-hidden="true">{mobileSheet === 'expanded' ? '⌄' : '⌃'}</span>
                    <strong>
                      {spatialDecisionOpen
                        ? choiceLabel(view.pendingDecision!)
                        : mobileActionsOpen
                          ? 'Choose an action'
                          : showAiPanel
                            ? 'AI action'
                            : mobileActionMode
                              ? actionLabel(action)
                              : screen === 'Research'
                                ? 'Technology'
                                : sector
                                  ? `Sector ${sector.tileId}`
                                  : 'Details'}
                    </strong>
                    <small>{mobileSheet === 'expanded' ? 'Show galaxy' : 'View details'}</small>
                  </button>
                  {mobileActionsOpen && (
                    <button
                      aria-label="Close action chooser"
                      onClick={() => {
                        setMobileSheet('closed');
                        setMobileActionsOpen(false);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div
                ref={mobileSheetBodyRef}
                className={`dg-inspector-body${compact ? ' dg-mobile-sheet-body' : ''}`}
              >
                {compact && mobileActionsOpen ? (
                  <>
                    {draftGuard.draftKeys.length > 0 && !view.pendingDecision && (
                      <button className="dg-mobile-resume-draft" onClick={resumeSavedAction}>
                        Resume saved action
                      </button>
                    )}
                    <MobileActionPicker options={mobileActionOptions} onSelect={activate} />
                  </>
                ) : (
                  ''
                )}
                {spatialDecision && view.pendingDecision && (
                  <section
                    key={view.pendingDecision.id}
                    hidden={!spatialDecisionOpen || historyOpen}
                    className="dg-map-choice-controls"
                    aria-label={`${choiceLabel(view.pendingDecision)} controls`}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        showDecisionMap();
                      }
                    }}
                  >
                    <header className="dg-map-choice-header">
                      <strong>{choiceLabel(view.pendingDecision)}</strong>
                      <button
                        type="button"
                        onClick={showDecisionMap}
                        aria-label={`Minimize ${choiceLabel(view.pendingDecision)}`}
                      >
                        View map
                      </button>
                    </header>
                    {pendingDecisionPanel}
                  </section>
                )}
                <div
                  className="dg-inspector-content"
                  hidden={(spatialDecisionOpen && !historyOpen) || (compact && mobileActionsOpen)}
                >
                  {historyOpen ? (
                    <HistoryPanel
                      rollback={historyRollback}
                      feed={
                        history ?? {
                          entries: [],
                          loading: false,
                          hasOlder: false,
                          loadingOlder: false,
                          error: null,
                          loadOlder: () => {},
                        }
                      }
                    />
                  ) : showAiPanel && aiPresentation.action ? (
                    <>
                      <AiActionPanel
                        view={view}
                        entry={aiPresentation.action}
                        onInspectSector={(id) => {
                          setSelected(id);
                          setScreen('Galaxy');
                          setAiDismissed(true);
                          setReviewAi(false);
                          if (compact) setMobileSheet('peek');
                        }}
                      />
                    </>
                  ) : buildOpen && !inspectingGalaxy && screen === 'Galaxy' && !compact ? (
                    buildPlanner
                  ) : moveOpen && !inspectingGalaxy && screen === 'Galaxy' ? (
                    <>
                      <MovementPlanner
                        embedded
                        showCombatOdds={showCombatOdds}
                        onChangeSource={() => {
                          setMoveSource(null);
                          setMoveTarget(null);
                          setMoveTargets([]);
                        }}
                        onRoutePreview={setMoveRoutePreviews}
                        onSelectionChange={onMoveSelection}
                        key={moveSource}
                        view={planningView}
                        sourceSectorId={moveSource}
                        selectedTargetId={moveTarget}
                        disabled={
                          blocked ||
                          (!!lastAcceptedCommand && lastAcceptedCommand.revision > view.revision)
                        }
                        result={movementResult}
                        onDone={
                          candidates.some((candidate) => candidate.command.type === 'end-action')
                            ? () => {
                                const command: GameCommand = { type: 'end-action' };
                                if (previewCommand(view, command).betrayedPartners.length)
                                  activate('end-action');
                                else onSubmit(command);
                              }
                            : undefined
                        }
                        onTargetsChange={setMoveTargets}
                        onClose={() => {
                          setMoveOpen(false);
                          setMoveTargets([]);
                        }}
                        onSubmit={(command) => {
                          if (!queueMode)
                            pendingMove.current = {
                              scope: `${matchId ?? 'preview'}:${view.viewerSeatId}`,
                              receipt: lastAcceptedCommand,
                              type: 'move',
                              ships:
                                command.type === 'move'
                                  ? new Set(command.moves.map((move) => move.shipId)).size
                                  : 0,
                            };
                          setMovementResult('');
                          onSubmit(command);
                        }}
                      />
                    </>
                  ) : screen === 'Galaxy' && action === 'influence' && !inspectingGalaxy ? (
                    <InfluencePlanner
                      onSectorFocus={setSelected}
                      key={view.revision}
                      view={planningView}
                      candidates={candidates}
                      selectedSectorId={selected}
                      onLegalTargetIdsChange={setInfluenceTargets}
                      disabled={blocked}
                      onSubmit={onSubmit}
                    />
                  ) : screen === 'Galaxy' && action === 'colonize' && !inspectingGalaxy ? (
                    <>
                      <ColonizationPlanner
                        onColonizableSectorIdsChange={setColonyTargets}
                        onSectorFocus={setSelected}
                        view={planningView}
                        candidates={candidates}
                        selectedSectorId={selected}
                        disabled={blocked}
                        onSubmit={onSubmit}
                      />
                    </>
                  ) : (
                    <>
                      <p className="sd-eyebrow">
                        {view.phase === 'finished'
                          ? 'FINAL RESULTS'
                          : screen === 'Research'
                            ? 'TECHNOLOGY'
                            : screen === 'Blueprints'
                              ? 'SHIPYARD'
                              : screen === 'Trade'
                                ? 'RESOURCE EXCHANGE'
                                : 'SECTOR INSPECTOR'}
                      </p>
                      {screen === 'Scoring' ? (
                        <>
                          <h2>Where points come from</h2>
                          <p>
                            Select a symbol on any faction card to inspect its contribution and
                            relevant sectors.
                          </p>
                          <p>
                            {view.phase === 'finished'
                              ? 'Reputation is now revealed. Equal VP totals are ranked by remaining resources; an exact tie shares the rank.'
                              : 'Reputation stays face down and is excluded from every public total until the game ends.'}
                          </p>
                          <button
                            onClick={() => {
                              setScreen('Galaxy');
                              setMobileSheet('closed');
                            }}
                          >
                            Back to galaxy
                          </button>
                        </>
                      ) : view.pendingDecision && screen === 'Decision' ? (
                        <>
                          <h2>{humanize(view.pendingDecision.kind)}</h2>
                          <p>
                            Resolve the choice in the main panel. You can inspect technologies,
                            ships, diplomacy, and public scores before returning to Decision.
                          </p>
                          {view.battle &&
                            [
                              'combat-allocation',
                              'combat-split-damage',
                              'combat-turn',
                              'retreat',
                              'initiative-order',
                              'bombardment',
                            ].includes(view.pendingDecision.kind) && (
                              <p>
                                Battle in sector {view.battle.sectorId}. Damage and dice are saved;
                                your allocations and retreat remain under your control.
                              </p>
                            )}
                          {view.pendingDecision.kind === 'reputation' && (
                            <p>
                              Only you can see these reputation values. Choose which tiles to keep
                              before combat aftermath continues.
                            </p>
                          )}
                        </>
                      ) : screen === 'Research' ? (
                        <>
                          <h2>Research in place</h2>
                          <p>
                            Select, compare, fund, and acquire technology in the research workspace.
                          </p>
                        </>
                      ) : screen === 'Trade' ? (
                        <>
                          <h2>Resource exchange</h2>
                          <p>
                            Choose what to receive, adjust the amount, and select which resource
                            pays for it.
                          </p>
                          <p>
                            Trading does not use an action disc. Your money after trading changes
                            what you can afford at upkeep.
                          </p>
                        </>
                      ) : screen === 'Blueprints' ? (
                        <>
                          <h2>
                            {editing
                              ? `${shipClassName(editing, inspectedPlayer.faction)} loadout`
                              : 'Fleet blueprints'}
                          </h2>
                          <p>{faction(inspectedPlayer.id)?.name} · current installed parts</p>
                          {editing ? (
                            <div className="dg-current-loadout">
                              {effectiveBlueprintParts(
                                inspectedPlayer.faction,
                                publicBlueprint(
                                  inspectedPlayer.blueprints.find((bp) => bp.shipType === editing)!,
                                ),
                              ).map((part, index) => (
                                <div key={index}>
                                  <strong>
                                    {index + 1}. {part ? humanize(part) : 'Empty slot'}
                                  </strong>
                                  {part && <ShipPartStats partId={part} />}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>
                              Select any ship class above, or use All loadouts to compare the fleet.
                              Draft changes do not affect ships until confirmed.
                            </p>
                          )}
                        </>
                      ) : screen === 'Diplomacy' || screen === 'Players' ? (
                        <>
                          <h2>Diplomacy & trust</h2>
                          <p>
                            Ambassadors are public and worth 1 VP each. Reputation values remain
                            private until the game ends.
                          </p>
                          <p>
                            Ending your action with ships in a partner’s sector or with their ships
                            breaks that relationship. Passing through while unpinned is allowed. The
                            aggressor takes the traitor card: −2 VP (Rho Indi: 0 VP) and no new
                            diplomatic relations while holding it.
                          </p>
                          <p>
                            The card transfers when another player betrays a diplomatic partner.
                          </p>
                        </>
                      ) : view.phase === 'finished' && !sector ? (
                        <>
                          <h2>Scoring explained</h2>
                          <p>
                            Each civilization’s total includes controlled sectors, structures,
                            research tracks, reputation, discoveries, ambassadors, faction abilities
                            and traitor penalties.
                          </p>
                        </>
                      ) : action === 'finish-upkeep' &&
                        view.phase === 'upkeep' &&
                        !browsingUpkeep ? (
                        <>
                          <h2>Round {view.round} upkeep</h2>
                          <p>
                            Review production and your civilization’s upkeep before continuing. You
                            can convert resources first if needed.
                          </p>
                          <button type="button" onClick={browseTechnologies}>
                            Browse technologies
                          </button>
                          {canColonizeAtUpkeep && (
                            <>
                              <p>You can still populate an open planet before collecting income.</p>
                              <button
                                type="button"
                                disabled={blocked}
                                onClick={openUpkeepColonization}
                              >
                                Colonize
                              </button>
                            </>
                          )}
                        </>
                      ) : auxiliaryActivity !== 'faction' &&
                        action === 'explore' &&
                        draft?.command.type === 'explore' ? (
                        <div className="dg-frontier-preview">
                          <div className="dg-face-down-sector" aria-label="Undiscovered sector">
                            <ActionIcon kind="explore" />
                            <span>?</span>
                          </div>
                          <h2>Explore{draft.command.remote ? ' · Remote' : ''}</h2>
                          <details>
                            <summary>Sector odds</summary>
                            <ExploreOdds view={view} position={draft.command.position} />
                          </details>
                        </div>
                      ) : sector ? (
                        <>
                          <h2>Sector {sector.tileId}</h2>
                          <p>
                            {sector.owner ? faction(sector.owner)?.name : 'Uncontrolled'} ·
                            orientation {sector.rotation * 60}°
                          </p>
                          {showCombatOdds &&
                            view.ships.some(
                              (ship) => ship.sectorId === sector.id && ship.owner === own.id,
                            ) && (
                              <MovementBattlePreview
                                view={view}
                                shipIds={view.ships
                                  .filter(
                                    (ship) => ship.sectorId === sector.id && ship.owner === own.id,
                                  )
                                  .map((ship) => ship.id)}
                                targetSectorId={sector.id}
                              />
                            )}
                          <h3>Fleet</h3>
                          <SectorFleet
                            view={view}
                            sectorId={sector.id}
                            onInspect={() => {
                              setInspectSector(sector.id);
                              setInspectDiplomacy(null);
                            }}
                          />
                          {sector.owner === own.id && !inspectingGalaxy && (
                            <button
                              onClick={() => {
                                activate('build');
                                setBuildHereSector(sector.id);
                              }}
                            >
                              Build here
                            </button>
                          )}
                          {!inspectingGalaxy && (
                            <FactionAbilityControls
                              objectSectorId={sector.id}
                              globalActions={false}
                              onPreview={() => setAuxiliaryActivity('faction')}
                              view={planningView}
                              candidates={candidates}
                              disabled={blocked}
                              onSubmit={onSubmit}
                              onAction={activate}
                            />
                          )}
                          <SectorPlanets sector={sector} view={view} candidates={candidates} />
                          <h3>Connections & movement</h3>
                          <p>
                            {view.sectors
                              .filter(
                                (to) =>
                                  connectionBetween(
                                    mapSector(sector),
                                    mapSector(to),
                                    movementAbilities(own).wormholeGenerator,
                                  ) !== 'none',
                              )
                              .map(
                                (to) =>
                                  `${to.tileId} (${connectionBetween(mapSector(sector), mapSector(to), movementAbilities(own).wormholeGenerator)})`,
                              )
                              .join(', ') || 'No usable connections to explored sectors.'}
                          </p>
                          {view.ships
                            .filter((ship) => ship.owner === own.id && ship.sectorId === sector.id)
                            .map((ship) => {
                              const bp = own.blueprints.find((b) => b.shipType === ship.type);
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
                                  doesNotPin: faction(s.owner)?.id === 'spacing-guild',
                                })),
                                movementAbilities(own),
                              );
                              return (
                                <p key={ship.id}>
                                  {shipClassName(ship.type, own.faction, ship.orbitalShip)}
                                  {ship.factoryPopulation ? ' · Materials factory' : ''}:{' '}
                                  {ship.type === 'starbase'
                                    ? ship.orbitalShip
                                      ? 'Immobile Orbital'
                                      : 'Immobile starbase'
                                    : movable === 0
                                      ? 'Pinned by opposing ships; no ship can leave.'
                                      : `${stats?.movement ?? 0} range; ${movable} friendly ships may leave without exceeding pinning limits.`}
                                </p>
                              );
                            })}
                        </>
                      ) : (
                        <>
                          <h2>
                            {screen === 'Research'
                              ? 'Choose a technology'
                              : screen === 'Blueprints'
                                ? 'Prepare your fleet'
                                : 'Select a sector'}
                          </h2>
                          <p>
                            {screen === 'Research'
                              ? 'Select a technology card to inspect its effect and research cost before confirming.'
                              : screen === 'Blueprints'
                                ? 'Select a ship to compare its parts, then edit your blueprint to preview an upgrade.'
                                : 'Inspect a tile to see its planets, fleets, ownership and usable connections.'}
                          </p>
                        </>
                      )}
                      {!browsingUpkeep &&
                        view.phase !== 'finished' &&
                        screen !== 'Trade' &&
                        screen !== 'Scoring' &&
                        ['explore', 'end-action'].includes(action) &&
                        (!view.pendingDecision ||
                          (view.pendingDecision.kind === 'bankruptcy' && action === 'trade') ||
                          (action === 'discard-reputation' &&
                            ['diplomacy', 'diplomacy-window'].includes(
                              view.pendingDecision.kind,
                            ))) && (
                          <div className="dg-action-panel" ref={actionPanelRef}>
                            <ActionEconomy
                              view={planningView}
                              action={action}
                              preview={draftPreview}
                            />
                            {available.length === 0 ? (
                              <p>
                                {view.pendingDecision
                                  ? 'Finish your current decision first.'
                                  : !queueMode && view.activeSeatId !== own.id && !needsUpkeep(view)
                                    ? 'Waiting for your turn.'
                                    : 'No legal options. Check resources, technology, range, pinning, and remaining activations.'}
                              </p>
                            ) : action === 'explore' && !draft ? (
                              <p>Select a highlighted frontier hex on the galaxy to explore.</p>
                            ) : action === 'research' && researchSelection ? (
                              (() => {
                                const options = available.filter((c) => {
                                  const command =
                                    c.command.type === 'trade-and-act'
                                      ? c.command.action
                                      : c.command;
                                  return (
                                    command.type === 'research' &&
                                    command.tileId === researchSelection
                                  );
                                });
                                const selectedCommand =
                                  draft?.command.type === 'trade-and-act'
                                    ? draft.command.action
                                    : draft?.command;
                                return options.length > 1 ? (
                                  <ChoiceCards
                                    label="Research track"
                                    value={
                                      selectedCommand?.type === 'research'
                                        ? selectedCommand.track
                                        : ''
                                    }
                                    disabled={blocked}
                                    onChange={(track) =>
                                      setDraft(
                                        options.find((c) => {
                                          const command =
                                            c.command.type === 'trade-and-act'
                                              ? c.command.action
                                              : c.command;
                                          return (
                                            command.type === 'research' && command.track === track
                                          );
                                        }) ?? null,
                                      )
                                    }
                                    options={options.flatMap((c) => {
                                      const command =
                                        c.command.type === 'trade-and-act'
                                          ? c.command.action
                                          : c.command;
                                      return command.type === 'research'
                                        ? [
                                            {
                                              value: command.track,
                                              label: humanize(command.track),
                                              description: `${own.technologies[command.track].length} / 7 researched`,
                                              visual: (
                                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                                  <path
                                                    d="M4 2h12v16H4Z M7 6h6M7 10h6M7 14h6"
                                                    fill="none"
                                                    stroke="currentColor"
                                                  />
                                                </svg>
                                              ),
                                            },
                                          ]
                                        : [];
                                    })}
                                  />
                                ) : null;
                              })()
                            ) : null}
                            {draft && (
                              <>
                                {draft.command.type !== 'explore' && <h3>{draft.label}</h3>}
                                {draft.command.type === 'trade-and-act' ? (
                                  <FundingPlanSelector
                                    view={planningView}
                                    command={draft.command}
                                    disabled={blocked}
                                    onChange={(command) => setDraft({ ...draft, command })}
                                  />
                                ) : null}
                                {!!draftPreview?.betrayedPartners.length && (
                                  <p className="dg-danger">
                                    Breaks diplomacy with{' '}
                                    {draftPreview.betrayedPartners
                                      .map((id) => faction(id)?.name ?? id)
                                      .join(', ')}
                                    . You take the traitor card (
                                    {getFaction(own.faction).special?.ignoresTraitorPenalty
                                      ? '0'
                                      : '−2'}{' '}
                                    VP), return these ambassadors, and cannot form new relations
                                    while holding it.
                                  </p>
                                )}
                                <CommitBar>
                                  <button
                                    className="sd-primary"
                                    disabled={blocked || draftGuard.stale || !stillLegal}
                                    onClick={() => {
                                      if (draft.command.type === 'finish-upkeep')
                                        finishUpkeep(draft.command);
                                      else onSubmit(draft.command);
                                    }}
                                  >
                                    {draft.command.type === 'end-action'
                                      ? 'End action and break diplomacy'
                                      : draft.command.type === 'trade-and-act'
                                        ? `Convert & ${draft.command.action.type}`
                                        : draft.command.type === 'finish-upkeep'
                                          ? 'Collect income'
                                          : queueMode
                                            ? 'Queue for my turn'
                                            : draft.command.type === 'explore'
                                              ? 'Draw sector'
                                              : draft.label}
                                  </button>
                                </CommitBar>
                              </>
                            )}
                          </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            </BoardInspector>
            {!compact && !encounterVisible && (
              <nav className="dg-action-rail" aria-label="Turn actions">
                {(['ordinary', 'other'] as const).map((group) => (
                  <div
                    key={group}
                    role="group"
                    aria-label={group === 'ordinary' ? 'Ordinary actions' : 'Other actions'}
                    className={
                      group === 'ordinary' ? 'dg-action-rail-primary' : 'dg-action-rail-utility'
                    }
                  >
                    <small>{group === 'ordinary' ? 'ACTIONS' : 'OTHER ACTIONS'}</small>
                    {mobileActionOptions
                      .filter(
                        (option) =>
                          ACTION_ENTRIES.find((entry) => entry.type === option.type)?.group ===
                          group,
                      )
                      .map((option) => (
                        <button
                          key={option.type}
                          type="button"
                          aria-pressed={
                            option.type === 'buy-minor-species'
                              ? screen === 'Recruitment'
                              : action === option.type &&
                                !view.pendingDecision &&
                                view.phase === 'action'
                          }
                          disabled={option.disabled}
                          onClick={() => activate(option.type)}
                        >
                          <ActionIcon kind={option.type} />
                          {option.label}
                        </button>
                      ))}
                  </div>
                ))}
                <div className="dg-action-rail-turn">
                  <small>TURN</small>
                  {(['end-action', 'pass'] as const)
                    .filter((type) =>
                      candidates.some((candidate) => candidate.command.type === type),
                    )
                    .map((type) => (
                      <button
                        className="dg-action-rail-turn-button"
                        key={type}
                        type="button"
                        disabled={blocked}
                        onClick={() => activate(type)}
                      >
                        {queueMode ? 'Queue for my turn · ' : ''}
                        {type === 'pass' && own.passed ? 'Pass reaction' : actionLabel(type)}
                      </button>
                    ))}
                  {!candidates.some((candidate) =>
                    ['finish-upkeep', 'end-action', 'pass'].includes(candidate.command.type),
                  ) && (
                    <span className="dg-action-rail-turn-status">
                      {own.passed ? 'Passed · waiting' : 'Waiting for your turn'}
                    </span>
                  )}
                  {view.phase !== 'finished' && !own.eliminated && (
                    <AutoPassControl
                      enabled={own.autoPassUnlessAttacked ?? false}
                      paused={own.autoPassPausedRound === view.round}
                      disabled={!connected || busy}
                      disabledReason={
                        !connected
                          ? 'Reconnect to change auto-pass.'
                          : busy
                            ? 'Saving your change…'
                            : undefined
                      }
                      onChange={(enabled) => onSubmit({ type: 'set-auto-pass', enabled })}
                    />
                  )}
                </div>
              </nav>
            )}
          </div>

          <PublicInspectionModal view={view} sharedMap />
          {settingsOpen && (
            <GameSettingsPanel
              onHistory={() => {
                setSettingsOpen(false);
                setHistoryOpen(true);
                setInspectorOpen(true);
                if (compact) {
                  setScreen('Activity');
                  setMobileSheet('closed');
                  setMobileActionMode(false);
                }
              }}
              onGameMenu={() => {
                setSettingsOpen(false);
                onMenu();
              }}
              motionEnabled={motionEnabled}
              onMotionChange={changeMotion}
              followAi={followAi}
              onFollowAiChange={changeFollowAi}
              autoPass={
                view.phase !== 'finished' && !own.eliminated
                  ? {
                      enabled: own.autoPassUnlessAttacked ?? false,
                      paused: own.autoPassPausedRound === view.round,
                      disabled: blocked,
                      disabledReason:
                        interactionBlockedReason ??
                        (!connected
                          ? 'Reconnect to change auto-pass.'
                          : busy
                            ? 'Saving your change…'
                            : undefined),
                      onChange: (enabled) => onSubmit({ type: 'set-auto-pass', enabled }),
                    }
                  : undefined
              }
              onClose={() => setSettingsOpen(false)}
            />
          )}
          {inspectSector && (
            <FleetInspection
              abilities={
                !inspectingGalaxy ? (
                  <FactionAbilityControls
                    objectSectorId={inspectSector}
                    globalActions={false}
                    onPreview={() => setAuxiliaryActivity('faction')}
                    view={planningView}
                    candidates={candidates}
                    disabled={blocked}
                    onSubmit={onSubmit}
                    onAction={activate}
                  />
                ) : undefined
              }
              showCombatOdds={showCombatOdds}
              view={view}
              sectorId={inspectSector}
              selectedShipIds={
                movementDraft.ids.length
                  ? movementDraft.ids
                  : [...new Set(moveRoutePreviews.flatMap((route) => route.draft.shipIds))]
              }
              onClose={() => {
                setInspectSector(null);
                setInspectDiplomacy(null);
              }}
              onDiplomacy={setInspectDiplomacy}
              diplomacy={
                inspectDiplomacy ? (
                  <DiplomacyPanel
                    view={planningView}
                    candidates={candidates}
                    inspectedSeatId={inspectDiplomacy}
                    disabled={blocked}
                    onSubmit={onSubmit}
                  />
                ) : undefined
              }
            />
          )}
          {compact &&
            status &&
            !/^(Saved|Saving|Applied to the isolated|Engine fixture review)/.test(status) && (
              <div className="dg-mobile-feedback" role="status" aria-live="polite">
                {status}
              </div>
            )}
          {compact && (
            <MobileNavigation
              selected={mobileDestination}
              onSelect={mobileNavigate}
              onActions={
                !view.pendingDecision &&
                view.phase !== 'finished' &&
                (view.phase === 'upkeep'
                  ? needsUpkeep(view)
                  : view.activeSeatId === own.id || queueMode) &&
                !mobileActionMode
                  ? () => {
                      setMobileActionsOpen(true);
                      setMobileSheet('expanded');
                      setHistoryOpen(false);
                      setAiDismissed(true);
                    }
                  : undefined
              }
              onTurn={
                (!mobileActionMode ||
                  (mobileTurnType === 'end-action' &&
                    action === planningView.actionProgress?.action &&
                    !currentActionHasDraft)) &&
                mobileTurnType
                  ? {
                      label: `${queueMode ? 'Queue for my turn · ' : ''}${mobileTurnType === 'pass' && own.passed ? 'Pass reaction' : actionLabel(mobileTurnType)}`,
                      disabled: blocked,
                      submit: () => activate(mobileTurnType),
                    }
                  : undefined
              }
              afterPass={
                view.phase === 'action' && !own.eliminated ? (
                  <AutoPassControl
                    enabled={own.autoPassUnlessAttacked ?? false}
                    paused={own.autoPassPausedRound === view.round}
                    disabled={!connected || busy}
                    disabledReason={
                      !connected
                        ? 'Reconnect to change auto-pass.'
                        : busy
                          ? 'Saving your change…'
                          : undefined
                    }
                    onChange={(enabled) => onSubmit({ type: 'set-auto-pass', enabled })}
                  />
                ) : undefined
              }
              pending={showUpkeepReturn || showDecisionReturn}
              pendingLabel={
                showUpkeepReturn
                  ? 'Return to upkeep'
                  : view.pendingDecision
                    ? `Return to ${choiceLabel(view.pendingDecision)}`
                    : undefined
              }
              onDecision={showUpkeepReturn ? reviewUpkeep : returnToChoice}
              onBack={closeActivity}
            />
          )}
        </BoardShell>
      </DecisionMapContext.Provider>
    </CommitContext.Provider>
  );
}
