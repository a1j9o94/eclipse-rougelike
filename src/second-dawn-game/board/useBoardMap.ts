import type { DraftValues } from '../actionDraftStorage';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import { useActionDraftState } from '../actionDraftContext';
import { useFixedFitEnabled } from '../presentationSettings';
import type { DecisionMapPresentation } from '../decisionMapContext';
import { galaxyPoint } from '../galaxyGeometry';

/** Camera and decision targeting stay independent of workspace navigation. */
export function useBoardMap(view: PlayerView, initialSectorId?: string) {
  const [fitRequest, setFitRequest] = useState(0);
  const [fixedFit, setFixedFit] = useFixedFitEnabled();

  const [selected, setSelected] = useActionDraftState('selectedSector', initialSectorId ?? null);

  const [camera, setCamera] = useActionDraftState('camera', null);
  const explorationPosition =
    view.pendingDecision?.kind === 'exploration' ? view.pendingDecision.position : null;
  const lastExplorationPosition = useRef(explorationPosition);
  useEffect(() => {
    if (explorationPosition) lastExplorationPosition.current = explorationPosition;
  }, [explorationPosition]);
  const newlyPlacedSector = lastExplorationPosition.current
    ? view.sectors.find(
        (sector) =>
          sector.position.q === lastExplorationPosition.current?.q &&
          sector.position.r === lastExplorationPosition.current?.r,
      )?.id
    : undefined;
  useEffect(() => {
    if (newlyPlacedSector) {
      setSelected(newlyPlacedSector);
      lastExplorationPosition.current = null;
    }
  }, [newlyPlacedSector, setSelected]);
  const decisionSector =
    view.pendingDecision && 'sectorId' in view.pendingDecision
      ? view.pendingDecision.sectorId
      : undefined;
  useEffect(() => {
    if (decisionSector) setSelected(decisionSector);
  }, [decisionSector, setSelected]);
  return {
    selected,
    setSelected,
    camera,
    setCamera,
    fitRequest,
    setFitRequest,
    fixedFit,
    setFixedFit,
  };
}

interface DecisionMapOptions {
  view: PlayerView;
  compact: boolean;
  spatialDecision: boolean;
  fixedFit: boolean;
  setSelected: Dispatch<SetStateAction<string | null>>;
  setCamera: Dispatch<SetStateAction<DraftValues['camera']>>;
}
/** Runs after choice-navigation and inspection effects, preserving their selection precedence. */
export function useBoardDecisionMap({
  view,
  compact,
  spatialDecision,
  fixedFit,
  setSelected,
  setCamera,
}: DecisionMapOptions) {
  const pendingId = view.pendingDecision?.id;
  const [decisionPresentation, setDecisionPresentation] = useState<{
    id: string | undefined;
    map: DecisionMapPresentation | null;
  }>({ id: undefined, map: null });
  const publishDecisionMap = useCallback(
    (map: DecisionMapPresentation | null) => setDecisionPresentation({ id: pendingId, map }),
    [pendingId],
  );
  const mapDecision =
    spatialDecision ||
    view.pendingDecision?.kind === 'combat-turn' ||
    view.pendingDecision?.kind === 'retreat';
  const activeDecisionMap =
    mapDecision && decisionPresentation.id === pendingId ? decisionPresentation.map : null;
  const retreatMapActive = activeDecisionMap?.targetLabel === 'retreat destination';
  const decisionMapView = activeDecisionMap?.view ?? view;
  const focusDecisionSector = useCallback(
    (id: string) => {
      const target = decisionMapView.sectors.find((sector) => sector.id === id);
      if (target) {
        setSelected(id);
        if (!fixedFit) setCamera({ center: galaxyPoint(target.position), zoom: compact ? 2.5 : 2 });
      }
    },
    [decisionMapView, setSelected, setCamera, compact, fixedFit],
  );
  const focusedMapDecision = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      !spatialDecision ||
      !activeDecisionMap ||
      !pendingId ||
      focusedMapDecision.current === pendingId
    )
      return;
    focusedMapDecision.current = pendingId;
    if (view.pendingDecision?.kind === 'exploration' || view.pendingDecision?.kind === 'control') {
      const id = activeDecisionMap.legalTargetIds[0];
      if (id) focusDecisionSector(id);
    }
  }, [spatialDecision, activeDecisionMap, pendingId, view.pendingDecision, focusDecisionSector]);
  return {
    publishDecisionMap,
    mapDecision,
    activeDecisionMap,
    retreatMapActive,
    decisionMapView,
    focusDecisionSector,
  };
}
