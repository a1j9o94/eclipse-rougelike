import { getFaction } from "../../shared/eclipse/catalog";
import { deriveBlueprintStats, neutralBlueprint } from "../../shared/eclipse/blueprints";
import { connectionBetween } from "../../shared/eclipse/geometry";
import { publicBlueprint } from "../../shared/eclipse/legal";
import { mapSector } from "../../shared/eclipse/rulesState";
import { sectorDefinition } from "../../shared/eclipse/sectors";
import type { PlayerView, Ship } from "../../shared/eclipse/types";
import ShipSilhouette from "./ShipSilhouette";
import { NeutralShipSilhouette } from "./BattleOverview";
import { PlanetIcon } from "./SectorPlanets";
import "./combatDecisionVisuals.css";

const shipNames: Record<Ship["type"], string> = {
  interceptor: "Interceptor",
  cruiser: "Cruiser",
  dreadnought: "Dreadnought",
  starbase: "Starbase",
  ancient: "Ancient",
  guardian: "Guardian",
  gcds: "GCDS",
};

function ShipArt({ type }: { type: Ship["type"] }) {
  return type === "ancient" || type === "guardian" || type === "gcds" ? (
    <NeutralShipSilhouette type={type} />
  ) : (
    <ShipSilhouette type={type} />
  );
}

function ownerName(view: PlayerView | undefined, owner: string | null) {
  const seat = view?.seats.find((candidate) => candidate.id === owner);
  if (seat) return getFaction(seat.faction).name;
  if (owner === "ancient") return "Ancients";
  if (owner === "guardian") return "Guardians";
  if (owner === "gcds") return "Galactic Center Defense System";
  return owner ?? "Uncontrolled";
}

function ShipCard({
  view,
  targetId,
  label,
  selected,
  hit,
  onClick,
}: {
  view?: PlayerView;
  targetId: string;
  label: string;
  selected: boolean;
  hit: boolean | undefined;
  onClick: () => void;
}) {
  const ship = view?.ships.find((candidate) => candidate.id === targetId);
  const ordinal = ship
    ? (view?.ships.filter((candidate) => candidate.owner === ship.owner && candidate.type === ship.type).findIndex((candidate) => candidate.id === ship.id) ?? 0) + 1
    : 0;
  const name = ship ? `${shipNames[ship.type]} #${ordinal}` : label;
  const owner = ship ? ownerName(view, ship.owner) : null;
  const seat = ship ? view?.seats.find((candidate) => candidate.id === ship.owner) : undefined;
  const blueprint = ship ? seat?.blueprints.find((candidate) => candidate.shipType === ship.type) : undefined;
  const stats = ship
    ? ship.type === "ancient" || ship.type === "guardian" || ship.type === "gcds"
      ? neutralBlueprint(`${ship.type}-standard`).stats
      : seat && blueprint
        ? deriveBlueprintStats(seat.faction, publicBlueprint(blueprint))
        : undefined
    : undefined;
  const condition = stats && ship ? `${Math.max(0, stats.hull + 1 - ship.damage)}/${stats.hull + 1} HP` : ship?.damage ? `${ship.damage} damage` : "Condition unavailable";
  return (
    <button
      type="button"
      className={`dg-combat-ship-card${selected ? " is-selected" : ""}${hit === false ? " is-miss" : ""}`}
      aria-pressed={selected}
      aria-label={`Target ${label}${hit === undefined ? "" : hit ? " · hit" : " · miss"}`}
      onClick={onClick}
    >
      {ship && <span className="dg-combat-ship-art"><ShipArt type={ship.type} /></span>}
      <span className="dg-combat-card-copy">
        <strong>{name}</strong>
        {owner && <small>{owner}</small>}
        {ship && <small>{condition}</small>}
      </span>
      <span className="dg-combat-hit-mark" aria-hidden="true">{hit === false ? "MISS" : selected ? "TARGET" : ""}</span>
    </button>
  );
}

export function CombatTargetCards({
  view,
  targetLabels,
  targets,
  hitTargets,
  selected,
  onSelect,
}: {
  view?: PlayerView;
  targetLabels: Record<string, string>;
  targets: readonly string[];
  hitTargets?: readonly string[];
  selected: string;
  onSelect: (target: string) => void;
}) {
  return (
    <div className="dg-combat-target-cards" role="group" aria-label="Legal ship targets">
      {targets.map((target) => (
        <ShipCard
          key={target}
          view={view}
          targetId={target}
          label={targetLabels[target] ?? target}
          selected={selected === target}
          hit={hitTargets ? hitTargets.includes(target) : undefined}
          onClick={() => onSelect(target)}
        />
      ))}
    </div>
  );
}

export function SplitDamageCards({
  view,
  targetLabels,
  dieNumber,
  targets,
  values,
  damage,
  onChange,
}: {
  view?: PlayerView;
  targetLabels: Record<string, string>;
  dieNumber: number;
  targets: readonly string[];
  values: Record<string, number>;
  damage: number;
  onChange: (target: string, next: number) => void;
}) {
  const allocated = targets.reduce((sum, target) => sum + (values[target] ?? 0), 0);
  return (
    <div className="dg-combat-target-cards" role="group" aria-label={`Split damage from die ${dieNumber}`}>
      {targets.map((target) => {
        const amount = values[target] ?? 0;
        const label = targetLabels[target] ?? target;
        const ship = view?.ships.find((candidate) => candidate.id === target);
        return (
          <article className={`dg-combat-split-card${amount ? " is-selected" : ""}`} key={target}>
            {ship && <span className="dg-combat-ship-art"><ShipArt type={ship.type} /></span>}
            <div><strong>{ship ? shipNames[ship.type] : label}</strong><small>{ship ? ownerName(view, ship.owner) : label}</small></div>
            <div className="dg-damage-stepper" aria-label={`Damage allocated to ${label}`}>
              <button type="button" aria-label={`Decrease damage from die ${dieNumber} to ${label}`} disabled={amount === 0} onClick={() => onChange(target, amount - 1)}>−</button>
              <output aria-label={`Damage from die ${dieNumber} to ${label}`}>{amount}</output>
              <button type="button" aria-label={`Increase damage from die ${dieNumber} to ${label}`} disabled={allocated >= damage} onClick={() => onChange(target, amount + 1)}>+</button>
            </div>
          </article>
        );
      })}
      <p className={allocated === damage ? "dg-damage-total is-complete" : "dg-damage-total"}>{allocated} / {damage} damage assigned</p>
    </div>
  );
}

function retreatSector(view: PlayerView | undefined, id: string) {
  const sector = view?.sectors.find((candidate) => candidate.id === id);
  const ships = view?.ships.filter((ship) => ship.sectorId === id) ?? [];
  const fleet = [...new Set(ships.map((ship) => shipNames[ship.type]))];
  return { sector, fleet };
}

export function RetreatCards({
  view,
  destinationIds,
  value,
  includeFight,
  forced,
  onSelect,
}: {
  view?: PlayerView;
  destinationIds: readonly string[];
  value: string | null;
  includeFight: boolean;
  forced?: boolean;
  onSelect: (destination: string | null) => void;
}) {
  return (
    <div className="dg-retreat-cards" role="group" aria-label="Battle decision">
      {includeFight && (
        <button type="button" className={`dg-fight-card${value === null ? " is-selected" : ""}`} aria-pressed={value === null} onClick={() => onSelect(null)}>
          <span className="dg-fight-emblem" aria-hidden="true" /><strong>Fight here</strong><small>Fire weapons and remain in the battle.</small>
        </button>
      )}
      {destinationIds.map((id) => {
        const { sector, fleet } = retreatSector(view, id);
        const sectorLabel = `Sector ${sector?.tileId ?? id}`;
        const origin = view?.battle ? view.sectors.find((candidate) => candidate.id === view.battle?.sectorId) : undefined;
        const viewer = view?.seats.find((candidate) => candidate.id === view.viewerSeatId);
        const hasGenerator = viewer ? Object.values(viewer.technologies).flat().includes("wormhole-generator") : false;
        const connection = origin && sector ? connectionBetween(mapSector(origin), mapSector(sector), hasGenerator) : "none";
        const connectionLabel = connection === "warp" ? "Warp portal link" : connection === "generator" ? "Wormhole generator route" : connection === "wormhole" ? "Paired wormholes" : "Connected retreat route";
        return (
          <button key={id} type="button" className={`dg-retreat-card${value === id ? " is-selected" : ""}`} aria-pressed={value === id} aria-label={`Retreat to ${sectorLabel}`} onClick={() => onSelect(id)}>
            <span className="dg-mini-hex" aria-hidden="true">{sector?.tileId ?? "?"}</span>
            <span><strong>{sectorLabel}</strong><small>{connectionLabel}</small><small>{ownerName(view, sector?.owner ?? null)} · {fleet.length ? `${fleet.join(", ")} present` : "No ships present"}</small></span>
          </button>
        );
      })}
      {forced && <p className="dg-forced-retreat">Your ships cannot fire in this stalemate. Choose a connected, controlled retreat sector.</p>}
    </div>
  );
}

export function InitiativeQueue({
  view,
  groupIds,
  selected,
  onToggle,
}: {
  view?: PlayerView;
  groupIds: readonly string[];
  selected: readonly string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="dg-initiative-queue" role="group" aria-label="Tied firing groups">
      <p>Click groups in firing order. Click a queued group again to remove it.</p>
      {groupIds.map((id) => {
        const [owner, typeValue] = id.split("/");
        const shipType = typeValue in shipNames ? typeValue as Ship["type"] : undefined;
        const order = selected.indexOf(id);
        const label = shipType ? `${ownerName(view, owner)} ${shipNames[shipType]}` : id;
        return (
          <button key={id} type="button" className={`dg-initiative-card${order >= 0 ? " is-selected" : ""}`} aria-pressed={order >= 0} aria-label={order >= 0 ? `Remove ${label} from firing order` : `Add ${label} to firing order`} onClick={() => onToggle(id)}>
            <span className="dg-initiative-order">{order >= 0 ? order + 1 : "—"}</span>
            {shipType && <span className="dg-combat-ship-art"><ShipArt type={shipType} /></span>}
            <span><strong>{label}</strong><small>{order >= 0 ? "Queued" : "Choose firing position"}</small></span>
          </button>
        );
      })}
    </div>
  );
}

export function BombardmentTargets({
  view,
  sectorId,
  squareIds,
  selected,
  hits,
  onToggle,
}: {
  view?: PlayerView;
  sectorId: string;
  squareIds: readonly string[];
  selected: readonly string[];
  hits: number;
  onToggle: (id: string) => void;
}) {
  const sector = view?.sectors.find((candidate) => candidate.id === sectorId);
  const definition = sector ? sectorDefinition(Number(sector.tileId)) : undefined;
  return (
    <div className="dg-bombardment-targets" role="group" aria-label="Population targets">
      <p>{selected.length} / {hits} population hits assigned in Sector {sector?.tileId ?? sectorId}.</p>
      <div className="dg-planet-target-grid">
        {squareIds.map((id) => {
          const cube = sector?.population.find((candidate) => candidate.squareId === id);
          const squareIndex = id.startsWith("p") ? Number(id.slice(1)) : -1;
          const advanced = squareIndex >= 0 && definition?.population[squareIndex]?.advanced;
          const name = cube ? `${cube.resource[0].toUpperCase()}${cube.resource.slice(1)}${advanced ? " advanced" : ""} population` : `${advanced ? "Advanced " : ""}population square`;
          const isSelected = selected.includes(id);
          return <button key={id} type="button" className={`dg-planet-target${isSelected ? " is-selected" : ""}`} aria-pressed={isSelected} aria-label={`Target population square ${id}`} disabled={!isSelected && selected.length >= hits} onClick={() => onToggle(id)}><span className="dg-planet-target-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><PlanetIcon resource={cube?.resource ?? "gray"} /></svg></span><strong>{name}</strong><small>{isSelected ? "Targeted" : "Available target"}</small></button>;
        })}
      </div>
    </div>
  );
}
