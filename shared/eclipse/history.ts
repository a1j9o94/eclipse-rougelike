import {getMinorSpecies,type MinorSpeciesId} from './minorSpecies';
import { getFaction, type CivilizationColor, type FactionId } from "./catalog";
import { blueprintDefinition } from "./blueprints";
import { isShipPartId, type ShipPartId } from "./parts";
import { TECHNOLOGIES, type TechnologyId } from "./technologies";
import type { Blueprint, CombatRetreat, GameCommand, GameEvent, GameState, JournalEntry, Phase, Seat, Sector, Ship, ShipType } from "./types";

/** Exact public event written only by the authoritative room-timeout job. */
export const TIMEOUT_AI_HISTORY_MARKER = "Normal AI completed this choice after the turn timer expired.";

export type BuildComponent = ShipType | 'orbital' | 'monolith';
export interface PublicUpgradeChange {
  shipType: ShipType;
  slot: number | 'outside';
  before: ShipPartId | null;
  after: ShipPartId | null;
}
export interface PublicCombatRetreat extends CombatRetreat {
  ownerName: string;
  ownerFaction?: FactionId;
}
/** References to accepted, public action results. Never a pending choice or hidden draw. */
export type PublicActionPresentation =
  | { kind: 'minor-species'; minorSpeciesId: MinorSpeciesId }
  | { kind: 'research'; technologyId: TechnologyId }
  | { kind: 'upgrade'; shipTypes: ShipType[]; changes?: PublicUpgradeChange[] }
  | { kind: 'build'; sectorIds: string[]; components: { type: BuildComponent; count: number }[] }
  | { kind: 'move'; sectorIds: string[]; shipIds: string[] }
  | { kind: 'influence'; sectorIds: string[] }
  | { kind: 'colonize'; sectorIds: string[] }
  | { kind: 'explore'; sectorIds: string[] };

export interface HistoryPublicContext {
  sectors: readonly Pick<Sector, 'id' | 'tileId'>[];
  ships: readonly Pick<Ship, 'id' | 'type'>[];
}

export interface HistoryPriorPosition extends Pick<GameState, 'phase' | 'actionTurnSerial'> {
  seats: readonly Pick<Seat, 'id' | 'blueprints'>[];
}

export interface PublicHistoryEntry {
  rollbackAvailable?: boolean;
  rollbackRecoverable?:boolean;
  rollbackUnavailableReason?: string;
  supersededAtRevision?: number;
  revision: number;
  actorSeatId: string;
  actorName: string;
  actorFaction?: FactionId;
  actorColor?: CivilizationColor;
  round: number | null;
  phase?: Phase;
  actionTurnSerial?: number;
  summary: string;
  details: string[];
  presentation?: PublicActionPresentation;
  combatVolley?: NonNullable<GameEvent["combatVolley"]>;
  combatVolleys?: NonNullable<GameEvent["combatVolley"]>[];
  combatRetreats?: PublicCombatRetreat[];
}
export interface PublicHistoryPage {
  entries: PublicHistoryEntry[];
  nextBeforeRevision: number | null;
}
function actionSummary(command: GameCommand): string {
  switch (command.type) {
    case 'start-mixed-action': return `Started a ${command.action === 'build' ? 'Build' : 'Move'} action with mixed activations`;
    case 'load-factory': return 'Populated an interceptor factory';
    case 'place-guild-portal': return 'Deployed a Guild portal';
    case 'guild-offer': return `Offered ${command.amount} ${command.give} for ${command.receive}`;
    case 'accept-guild-offer': return `Exchanged ${command.amount} resources through the Guild`;
    case 'cancel-guild-offer': return 'Withdrew a Guild offer';
    case 'reverse-engineer': return 'Reverse engineered an observed component';
    case "trade-and-act":
      return `Converted resources · ${actionSummary(command.action)}`;
    case "explore":
      return "Explored a frontier";
    case "influence":
      return "Changed influence";
    case "research-development": return `Acquired ${command.developmentId === 'quantum-labs' ? 'Quantum Labs' : 'Ancient Labs'}`;
    case "quantum-research": return `Researched ${TECHNOLOGIES.find(t => t.id === command.tileId)?.name ?? 'technology'} in Quantum Labs`;
    case 'place-shrine': return `Placed a ${command.row} Shrine`;
    case "research":
      return `Researched ${TECHNOLOGIES.find((t) => t.id === command.tileId)?.name ?? "a technology"}`;
    case "upgrade":
      return "Upgraded ship blueprints";
    case "build":
      return `Built ${command.builds.length} component${command.builds.length === 1 ? "" : "s"}`;
    case "move": {
      const shipCount = new Set(command.moves.flatMap(move => [move.shipId,...(move.escorts??[])])).size;
      return `Moved ${shipCount} ship${shipCount === 1 ? "" : "s"}${command.moves.length > shipCount ? ` · ${command.moves.length} activations` : ''}`;
    }
    case "set-auto-pass":
      return command.enabled ? "Enabled auto-pass unless attacked" : "Disabled auto-pass unless attacked";
    case "pass":
      return "Passed";
    case "end-action":
      return "Ended the action";
    case "finish-upkeep":
      return "Completed upkeep";
    case "trade":
      return `Gained ${command.amount} ${command.to} by trading ${command.from}`;
    case "convert-colony-ship":
      return `Converted a colony ship to ${command.resource}`;
    case "buy-activation":
      return `Bought an additional ${command.action} activation`;
    case "colonize":
      return `Colonized ${command.placements.length} planet space${command.placements.length === 1 ? "" : "s"}`;
    case "buy-minor-species":
      return `Recruited Minor Species · ${getMinorSpecies(command.minorSpeciesId).name}`;
    case "offer-diplomacy":
      return "Offered diplomatic relations";
    case "discard-reputation":
      return "Returned reputation tiles";
    case "resolve": {
      // The acquired technology is public once this command is accepted. Other
      // choice payloads include private draws/kept reputation and remain opaque.
      if (command.choice.kind === "free-technology") {
        const technologyId = command.choice.technologyId;
        return `Received ${TECHNOLOGIES.find((technology) => technology.id === technologyId)?.name ?? "a technology"} from discovery`;
      }
      return command.choice.kind === "reputation"
        ? "Selected reputation"
        : `Resolved ${command.choice.kind.replaceAll("-", " ")}`;
    }
  }
}

function upgradeChanges(faction: FactionId, before: readonly Blueprint[], after: readonly Blueprint[]): PublicUpgradeChange[] {
  const part = (id: string | null | undefined): ShipPartId | null => id && isShipPartId(id) ? id : null;
  return after.flatMap(next => {
    const prior = before.find(blueprint => blueprint.shipType === next.shipType);
    if (!prior) return [];
    const { shipType } = next;
    const printed = blueprintDefinition(faction, shipType).preprinted;
    const changed = printed.flatMap<PublicUpgradeChange>((defaultPart, slot) => {
      const before = part(prior.parts[slot] ?? defaultPart);
      const after = part(next.parts[slot] ?? defaultPart);
      return before === after ? [] : [{ shipType, slot, before, after }];
    });
    const oldOutside = (prior.outsideParts ?? []).filter(isShipPartId);
    const newOutside = (next.outsideParts ?? []).filter(isShipPartId);
    for (const before of oldOutside) {
      if (!newOutside.includes(before)) changed.push({ shipType, slot: 'outside', before, after: null });
    }
    for (const after of newOutside) {
      if (!oldOutside.includes(after)) changed.push({ shipType, slot: 'outside', before: null, after });
    }
    return changed;
  });
}

function actionPresentation(command: GameCommand, context?: HistoryPublicContext, faction?: FactionId, priorBlueprints?: readonly Blueprint[]): PublicActionPresentation | undefined {
  const knownSectors = new Set(context?.sectors.map(sector => sector.id) ?? []);
  const sectors = (ids: readonly string[]): string[] => [...new Set(ids)].filter(id => knownSectors.has(id));
  switch (command.type) {
    case 'trade-and-act': return actionPresentation(command.action, context, faction, priorBlueprints);
    case 'buy-minor-species': return { kind: 'minor-species', minorSpeciesId: command.minorSpeciesId };
    case 'quantum-research':
    case 'research': {
      const technology = TECHNOLOGIES.find(tech => tech.id === command.tileId);
      return technology ? { kind: 'research', technologyId: technology.id } : undefined;
    }
    case 'upgrade': return {
      kind: 'upgrade',
      shipTypes: [...new Set(command.blueprints.map(blueprint => blueprint.shipType))],
      ...(faction && priorBlueprints ? { changes: upgradeChanges(faction, priorBlueprints, command.blueprints) } : {}),
    };
    case 'build': {
      const counts = new Map<BuildComponent, number>();
      for (const build of command.builds) counts.set(build.component, (counts.get(build.component) ?? 0) + 1);
      return { kind: 'build', sectorIds: sectors(command.builds.map(build => build.sectorId)), components: [...counts].map(([type, count]) => ({ type, count })) };
    }
    case 'move': {
      const knownShips = new Set(context?.ships.map(ship => ship.id) ?? []);
      return { kind: 'move', sectorIds: sectors(command.moves.flatMap(move => move.path)), shipIds: [...new Set(command.moves.flatMap(move => [move.shipId,...(move.escorts??[])]))].filter(id => knownShips.has(id)) };
    }
    case 'influence': return { kind: 'influence', sectorIds: sectors([...command.removeSectorIds, ...command.addSectorIds]) };
    case 'colonize': return { kind: 'colonize', sectorIds: sectors(command.placements.map(placement => placement.sectorId)) };
    case 'resolve': {
      // Acquired technologies and placed sectors are public after acceptance.
      // Hidden draws, kept discoveries and reputation selections stay opaque.
      const choice = command.choice;
      if (choice.kind === 'free-technology') {
        const technology = TECHNOLOGIES.find(tech => tech.id === choice.technologyId);
        return technology ? { kind: 'research', technologyId: technology.id } : undefined;
      }
      if (choice.kind === 'exploration' && !choice.drawAnother && choice.tileId !== null) {
        const sector = context?.sectors.find(candidate => candidate.tileId === choice.tileId);
        return sector ? { kind: 'explore', sectorIds: [sector.id] } : undefined;
      }
      if (choice.kind === 'colonization') return { kind: 'colonize', sectorIds: sectors(choice.placements.map(placement => placement.sectorId)) };
      return undefined;
    }
    default: return undefined;
  }
}

/** Public-only journal projection. Never return raw commands, decision IDs or private events. */
export function projectHistoryEntry(
  entry: JournalEntry,
  seats: readonly Pick<Seat, "id" | "faction" | "pieceColor">[],
  round?: number,
  context?: HistoryPublicContext,
  prior?: HistoryPriorPosition,
): PublicHistoryEntry {
  const seat = seats.find((candidate) => candidate.id === entry.actor);
  const events = entry.events.filter((event) => event.visibility === "public");
  const roundEvent = events.find(
    (event) =>
      event.type === "phase" &&
      /^Round \d+: action phase\.$/.test(event.message),
  );
  const inferred = roundEvent
    ? Number(/^Round (\d+):/.exec(roundEvent.message)?.[1])
    : null;
  const submittedCommand = entry.request.command;
  const command =
    submittedCommand.type === "trade-and-act"
      ? submittedCommand.action
      : submittedCommand;
  const sectorName = (id: string) =>
    context?.sectors.find((s) => s.id === id)?.tileId ?? "an explored sector";
  const effects: string[] = [];
  if (command.type === "build")
    effects.push(
      ...command.builds.map(
        (build) =>
          `Built ${build.component} in sector ${sectorName(build.sectorId)}.`,
      ),
    );
  if (command.type === "move")
    effects.push(
      ...command.moves.map(
        (move) =>
          `Moved ${context?.ships.find((ship) => ship.id === move.shipId)?.type ?? "ship"} to sector ${sectorName(move.path[move.path.length - 1])}.`,
      ),
    );
  const names = new Map(seats.map((s) => [s.id, getFaction(s.faction).name]));
  const namedMessage = (message: string) =>
    message.replace(/[A-Za-z0-9_-]+/g, (token) => names.get(token) ?? token);
  const timeoutAiTakeover = events.some(
    (event) =>
      event.type === "action" &&
      event.visibility === "public" &&
      event.message === TIMEOUT_AI_HISTORY_MARKER,
  );
  const presentation = actionPresentation(submittedCommand, context, seat?.faction, prior?.seats.find(s => s.id === entry.actor)?.blueprints);
  const combatVolleys = events.flatMap(event=>event.combatVolley?[event.combatVolley]:[]);
  const combatVolley = combatVolleys[0];
  const combatRetreats = events.flatMap<PublicCombatRetreat>(event => {
    if (!event.combatRetreat) return [];
    const owner = seats.find(candidate => candidate.id === event.combatRetreat!.owner);
    return [{
      ...event.combatRetreat,
      ownerName: names.get(event.combatRetreat.owner) ?? 'Fleet',
      ...(owner ? { ownerFaction: owner.faction } : {}),
    }];
  });
  const retreat = command.type === 'resolve' && (command.choice.kind === 'combat-turn' ? command.choice.retreatTo : command.choice.kind === 'retreat' ? command.choice.destinationId : null);
  const retreatTile = retreat ? context?.sectors.find(sector => sector.id === retreat)?.tileId : undefined;
  const summary = retreat ? `Declared retreat${retreatTile ? ` toward sector ${retreatTile}` : ''}` : actionSummary(submittedCommand);
  return {
    revision: entry.receipt.revision,
    actorSeatId: entry.actor,
    actorName: seat ? getFaction(seat.faction).name : "Civilization",
    ...(seat ? { actorFaction: seat.faction, actorColor: seat.pieceColor ?? getFaction(seat.faction).color } : {}),
    round: round ?? inferred,
    ...(prior ? { phase: prior.phase } : {}),
    ...(prior?.phase === 'action' ? { actionTurnSerial: prior.actionTurnSerial ?? 0 } : {}),
    summary: `${timeoutAiTakeover ? "AI takeover · " : ""}${summary}`,
    details: [
      ...effects,
      ...events.map((event) => namedMessage(event.message)),
    ],
    ...(presentation ? { presentation } : {}),
    ...(combatVolley ? { combatVolley, combatVolleys } : {}),
    ...(combatRetreats.length ? { combatRetreats } : {}),
  };
}
