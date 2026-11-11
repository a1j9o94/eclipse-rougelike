import { useLayoutEffect, type ReactNode, type RefObject } from 'react';
interface BoardInspectorProps {
  children: ReactNode;
  compact: boolean;
  desktopInspectorVisible: boolean;
  historyOpen: boolean;
  buildOpen: boolean;
  inspectingGalaxy: boolean;
  mobileSheet: 'closed' | 'peek' | 'expanded';
  inspectorRef: RefObject<HTMLElement | null>;
  mobileSheetBodyRef: RefObject<HTMLDivElement | null>;
  actionPanelRef: RefObject<HTMLDivElement | null>;
  screen: string;
  selected: string | null;
  researchSelection: string | null;
  spatialDecisionOpen: boolean;
  pendingId?: string;
  showAiPanel: boolean;
  aiActionRevision?: number;
  actionFocus: number;
}
/** The same inspector stays mounted across desktop and mobile; focus/scroll belong to its view. */
export default function BoardInspector({
  children,
  compact,
  desktopInspectorVisible,
  historyOpen,
  buildOpen,
  inspectingGalaxy,
  mobileSheet,
  inspectorRef,
  mobileSheetBodyRef,
  actionPanelRef,
  screen,
  selected,
  researchSelection,
  spatialDecisionOpen,
  pendingId,
  showAiPanel,
  aiActionRevision,
  actionFocus,
}: BoardInspectorProps) {
  useLayoutEffect(() => {
    if (spatialDecisionOpen && !historyOpen) inspectorRef.current?.focus({ preventScroll: true });
  }, [spatialDecisionOpen, pendingId, historyOpen, inspectorRef]);
  useLayoutEffect(() => {
    if (compact && showAiPanel) {
      if (inspectorRef.current) inspectorRef.current.scrollTop = 0;
      if (mobileSheetBodyRef.current) mobileSheetBodyRef.current.scrollTop = 0;
    }
  }, [compact, showAiPanel, aiActionRevision, mobileSheet, inspectorRef, mobileSheetBodyRef]);
  useLayoutEffect(() => {
    if (inspectorRef.current) inspectorRef.current.scrollTop = 0;
  }, [screen, selected, researchSelection, inspectorRef]);
  useLayoutEffect(() => {
    if (!actionFocus || historyOpen) return;
    const inspector = inspectorRef.current,
      panel = actionPanelRef.current;
    if (inspector && panel)
      inspector.scrollTop +=
        panel.getBoundingClientRect().top - inspector.getBoundingClientRect().top - 14;
  }, [actionFocus, actionPanelRef, historyOpen, inspectorRef]);
  return (
    <aside
      hidden={!compact && !desktopInspectorVisible}
      id="sector-details"
      tabIndex={-1}
      className={`sd-inspector ${historyOpen ? 'dg-inspector-history' : ''}${compact ? ' dg-mobile-sheet' : ''}`}
      data-sheet-state={
        compact ? (buildOpen && !inspectingGalaxy ? 'closed' : mobileSheet) : undefined
      }
      ref={inspectorRef}
      aria-label="Selection and action details"
    >
      {children}
    </aside>
  );
}
