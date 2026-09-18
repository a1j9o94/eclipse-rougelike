import { useEffect, useRef } from "react";
import { useActionDraftGuard, useActionDraftState } from './actionDraftContext';
import { BASE_COMPONENTS, getFaction } from "../../shared/eclipse/catalog";
import { capacity } from "../../shared/eclipse/rulesState";
import { fundingOptions } from "../../shared/eclipse/funding";
import { previewCommand } from "../../shared/eclipse/commandPreview";
import type { GameCommand, PlayerView } from "../../shared/eclipse/types";
import ShipSilhouette from "./ShipSilhouette";
import { StatIcon } from "./ShipPartStats";
import { TradeResourceIcon } from "./TradePanel";
import FundingPlanSelector from "./FundingPlanSelector";
import ActionEconomy from "./ActionEconomy";
import ActionDraftNotice from './ActionDraftNotice';
import "./buildPlanner.css";
export interface BuildPlannerProps {
  view: PlayerView;
  sectorId: string | null;
  disabled: boolean;
  onClose: () => void;
  onSubmit: (command: GameCommand) => void;
}
type BuildCommand = Extract<GameCommand, { type: "build" }>;
type Component = BuildCommand["builds"][number]["component"];
const TYPES: readonly Component[] = [
  "interceptor",
  "cruiser",
  "dreadnought",
  "starbase",
  "orbital",
  "monolith",
];
const name = (type: Component) => type[0].toUpperCase() + type.slice(1);
const empty = (): Record<Component, number> => ({
  interceptor: 0,
  cruiser: 0,
  dreadnought: 0,
  starbase: 0,
  orbital: 0,
  monolith: 0,
});
export default function BuildPlanner({
  view,
  sectorId,
  disabled,
  onClose,
  onSubmit,
}: BuildPlannerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const own = view.seats.find((seat) => seat.id === view.viewerSeatId);
  const owned = view.sectors.filter(
    (sector) => sector.owner === view.viewerSeatId,
  );
  const [selectedSector, setSelectedSector] = useActionDraftState('buildSector',sectorId ?? owned[0]?.id ?? "");
  const [counts, setCounts] = useActionDraftState('buildCounts',empty);
  const [selectedFunding, setSelectedFunding] = useActionDraftState('buildFunding',"");
  const draftGuard=useActionDraftGuard();
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (typeof node.showModal === "function") node.showModal();
    else node.setAttribute("open", "");
    return () => {
      if (node.open && typeof node.close === "function") node.close();
    };
  }, []);
  const sector = view.sectors.find(
    (candidate) => candidate.id === selectedSector,
  );
  if (!own) return null;
  const faction = getFaction(own.faction),
    technologies = Object.values(own.technologies).flat();
  const progress = view.actionProgress;
  const limit =
    progress?.owner === own.id && progress.action === "build"
      ? progress.remaining
      : capacity(own, "build");
  const total = TYPES.reduce((sum, type) => sum + counts[type], 0);
  const action: BuildCommand = {
    type: "build",
    builds: TYPES.flatMap((component) =>
      Array.from({ length: counts[component] }, () => ({
        sectorId: selectedSector,
        component,
      })),
    ),
  };
  const cost = action.builds.reduce(
    (sum, build) => sum + faction.constructionCosts[build.component],
    0,
  );
  const plans = total ? fundingOptions(view, action) : [];
  const funded =
    plans.find((plan) => JSON.stringify(plan.trades) === selectedFunding) ??
    plans[0];
  const command: GameCommand =
    cost > own.resources.materials && funded ? funded.command : action;
  const globalReason = own.eliminated
    ? "This civilization has been eliminated."
    : !sector || sector.owner !== own.id
      ? "Choose a sector you control."
      : view.waitingFor || view.pendingDecision
        ? "Resolve the pending decision first."
        : view.phase !== "action" || view.activeSeatId !== own.id
          ? "Wait for your action turn."
          : progress &&
              (progress.owner !== own.id || progress.action !== "build")
            ? "Finish your current action first."
            : !progress && own.influenceOnTrack < 1
              ? "No influence discs remain."
              : limit < 1
                ? "No Build activations remain."
                : null;
  const remaining = (type: Component) =>
    type === "orbital" || type === "monolith"
      ? sector?.[type]
        ? 0
        : 1
      : BASE_COMPONENTS.perColor[type] -
        view.ships.filter((ship) => ship.owner === own.id && ship.type === type)
          .length;
  const componentReason = (type: Component): string | null => {
    if (
      ["starbase", "orbital", "monolith"].includes(type) &&
      !technologies.includes(type)
    )
      return `Research ${name(type)} first.`;
    if (remaining(type) < 1)
      return type === "orbital" || type === "monolith"
        ? `This sector already has a ${type}.`
        : `All ${BASE_COMPONENTS.perColor[type]} ${type}s are deployed.`;
    return null;
  };
  const canAffordNext = (type: Component) => {
    const next: BuildCommand = {
      type: "build",
      builds: [...action.builds, { sectorId: selectedSector, component: type }],
    };
    return (
      cost + faction.constructionCosts[type] <= own.resources.materials ||
      fundingOptions(view, next).length > 0
    );
  };
  const valid =
    total > 0 &&
    !globalReason &&
    total <= limit &&
    TYPES.every(
      (type) =>
        counts[type] === 0 ||
        (!componentReason(type) && counts[type] <= remaining(type)),
    ) &&
    (cost <= own.resources.materials || !!funded);
  const preview = total && valid ? previewCommand(view, command) : null;
  return (
    <dialog
      ref={dialog}
      className="dg-build-dialog"
      aria-labelledby="build-planner-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="dg-build-header">
        <div>
          <small>SHIPYARD</small>
          <h2 id="build-planner-title">
            Build in sector {sector?.tileId ?? "—"}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close build planner"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="dg-build-body">
        <ActionDraftNotice/>
        <section className="dg-build-order" aria-label="Build order">
          <nav className="dg-build-sector" aria-label="Controlled build sectors">
            <span>Build location</span>
            <div>
              {owned.map((candidate) => {
                const fleetCount = view.ships.filter((ship) => ship.owner === own.id && ship.sectorId === candidate.id).length;
                return <button
                  key={candidate.id}
                  type="button"
                  className={selectedSector === candidate.id ? "is-selected" : ""}
                  aria-label={`Build in sector ${candidate.tileId}`}
                  aria-pressed={selectedSector === candidate.id}
                  disabled={disabled}
                  onClick={() => {
                    setSelectedSector(candidate.id);
                    setCounts(empty());
                    setSelectedFunding("");
                  }}
                >
                  <i aria-hidden="true">{candidate.tileId}</i>
                  <span><strong>Sector {candidate.tileId}</strong><small>{candidate.population.length} population · {fleetCount} ships</small></span>
                </button>;
              })}
            </div>
          </nav>
          <div className="dg-build-cards">
            {TYPES.map((type) => {
              const reason = componentReason(type);
              const quantity = counts[type];
              const unavailable =
                reason ??
                globalReason ??
                (quantity >= remaining(type)
                  ? "No more available here."
                  : total >= limit
                    ? "Activation limit reached."
                    : !canAffordNext(type)
                      ? "Not enough resources, including conversion."
                      : null);
              return (
                <article
                  key={type}
                  className={`dg-build-card ${reason ? "dg-build-unavailable" : ""}`}
                  aria-label={name(type)}
                >
                  <div className="dg-build-piece">
                    {type === "orbital" || type === "monolith" ? (
                      <StatIcon
                        kind={type === "orbital" ? "portal" : "structure"}
                      />
                    ) : (
                      <ShipSilhouette type={type} />
                    )}
                  </div>
                  <h3>{name(type)}</h3>
                  <span className="dg-build-price">
                    <TradeResourceIcon resource="materials" />
                    {faction.constructionCosts[type]}
                  </span>
                  <div className="dg-build-stepper">
                    <button
                      type="button"
                      aria-label={`Remove ${type}`}
                      disabled={disabled || quantity === 0}
                      onClick={() => {
                        setCounts((c) => ({ ...c, [type]: c[type] - 1 }));
                        setSelectedFunding("");
                      }}
                    >
                      −
                    </button>
                    <output aria-label={`${name(type)} quantity`}>
                      {quantity}
                    </output>
                    <button
                      type="button"
                      aria-label={`Add ${type}`}
                      title={unavailable ?? `Add ${type}`}
                      disabled={disabled || !!unavailable}
                      onClick={() => {
                        setCounts((c) => ({ ...c, [type]: c[type] + 1 }));
                        setSelectedFunding("");
                      }}
                    >
                      +
                    </button>
                  </div>
                  <small>
                    {reason ??
                      (type === "orbital"
                        ? "One money / science population space"
                        : type === "monolith"
                          ? "3 victory points"
                          : `${Math.max(0, remaining(type) - quantity)} unbuilt remaining`)}
                  </small>
                </article>
              );
            })}
          </div>
        </section>
        <aside
          className="dg-build-summary"
          aria-label="Build price and funding"
        >
          <div className="dg-build-total">
            <span>Total materials</span>
            <strong>
              <TradeResourceIcon resource="materials" />
              {cost}
            </strong>
            <small>
              {total} / {limit} Build activations · {Math.max(0, limit - total)}{" "}
              remaining
            </small>
          </div>
          {globalReason && <p role="status">{globalReason}</p>}
          {total > 0 && cost > own.resources.materials && funded && (
            <FundingPlanSelector
              view={view}
              command={funded.command}
              disabled={disabled}
              onChange={(choice) =>
                setSelectedFunding(JSON.stringify(choice.trades))
              }
            />
          )}
          <ActionEconomy view={view} action="build" preview={preview} />
        </aside>
      </div>
      <footer className="dg-build-footer">
        <span>
          {total
            ? `${total} component${total === 1 ? "" : "s"} · ${cost} materials`
            : "Choose ships or structures to build."}
        </span>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="sd-primary"
          disabled={disabled || draftGuard.stale || !valid}
          onClick={() => {
            if (!disabled && !draftGuard.stale && valid) onSubmit(command);
          }}
        >
          {command.type === "trade-and-act"
            ? "Convert & build"
            : "Confirm build"}
        </button>
      </footer>
    </dialog>
  );
}
