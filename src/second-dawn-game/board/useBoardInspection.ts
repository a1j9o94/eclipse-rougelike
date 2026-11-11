import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { PlayerView } from '../../../shared/eclipse/types';
import type { DraftValues } from '../actionDraftStorage';
import {
  historySectorIds,
  scoreInspection,
  type PublicInspectionRequest,
} from '../publicInspection';
interface BoardInspectionOptions {
  view: PlayerView;
  inspectionActive: PublicInspectionRequest | null | undefined;
  screen: string;
  camera: DraftValues['camera'];
  selected: string | null;
  inspectorOpen: boolean;
  mobileSheet: 'closed' | 'peek' | 'expanded';
  setScreen: Dispatch<SetStateAction<string>>;
  setCamera: Dispatch<SetStateAction<DraftValues['camera']>>;
  setSelected: Dispatch<SetStateAction<string | null>>;
  setInspectorOpen: Dispatch<SetStateAction<boolean>>;
  setMobileSheet: Dispatch<SetStateAction<'closed' | 'peek' | 'expanded'>>;
}
/** Coordinator above navigation and map: snapshot once, restore both when public inspection ends. */
export function useBoardInspection({
  view,
  inspectionActive,
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
}: BoardInspectionOptions) {
  const inspectionReturn = useRef<{
    screen: string;
    camera: DraftValues['camera'];
    selected: string | null;
    inspector: boolean;
    sheet: 'closed' | 'peek' | 'expanded';
  } | null>(null);
  const inspectionUi = useRef({
    screen,
    camera,
    selected,
    inspector: inspectorOpen,
    sheet: mobileSheet,
  });
  inspectionUi.current = { screen, camera, selected, inspector: inspectorOpen, sheet: mobileSheet };
  const inspectionTargets = inspectionActive
    ? inspectionActive.kind === 'history'
      ? historySectorIds(inspectionActive.entry)
      : scoreInspection(view, inspectionActive.seatId, inspectionActive.category).sectorIds
    : [];
  useEffect(() => {
    if (inspectionActive) {
      if (!inspectionReturn.current) inspectionReturn.current = inspectionUi.current;
      setScreen('Galaxy');
      setInspectorOpen(false);
      setMobileSheet('closed');
    } else if (inspectionReturn.current) {
      const saved = inspectionReturn.current;
      inspectionReturn.current = null;
      setScreen(saved.screen);
      setCamera(saved.camera);
      setSelected(saved.selected);
      setInspectorOpen(saved.inspector);
      setMobileSheet(saved.sheet);
    }
  }, [inspectionActive, setCamera, setInspectorOpen, setMobileSheet, setScreen, setSelected]);
  return inspectionTargets;
}
