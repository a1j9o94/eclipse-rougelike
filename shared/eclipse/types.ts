import type { FactionId } from "./catalog";
import type { RandomState } from "./random";
import type { ScoreBreakdown } from "./scoring";

export type SeatId = string;
export type Resource = "money" | "science" | "materials";
export type Resources = Record<Resource, number>;
export type ShipType = "interceptor" | "cruiser" | "dreadnought" | "starbase";
export type Track = "military" | "grid" | "nano";
export type Action =
  | "explore"
  | "influence"
  | "research"
  | "upgrade"
  | "build"
  | "move";
export type Phase =
  | "setup"
  | "action"
  | "combat"
  | "upkeep"
  | "cleanup"
  | "finished";
export interface Coordinate {
  q: number;
  r: number;
}
export interface Blueprint {
  shipType: ShipType;
  parts: (string | null)[];
  outsideParts?: string[];
}
export interface Population {
  resource: Resource;
  squareId: string;
}
export interface Sector {
  id: string;
  tileId: string;
  position: Coordinate;
  rotation: number;
  owner: SeatId | null;
  population: Population[];
  orbital: boolean;
  monolith: boolean;
  discovery: boolean;
  portalVp?: 0 | 1 | 2 | 3;
}
export interface Ship {
  id: string;
  owner: SeatId | "ancient" | "guardian" | "gcds";
  type: ShipType | "ancient" | "guardian" | "gcds";
  sectorId: string;
  damage: number;
  arrival?: number;
}
export interface Seat {
  id: SeatId;
  faction: FactionId;
  controller: "human" | "ai";
  resources: Resources;
  populationTracks: Resources;
  influenceOnTrack: number;
  actionDiscs: Record<Action, number>;
  colonyShipsAvailable: number;
  passed: boolean;
  eliminated: boolean;
  technologies: Record<Track, string[]>;
  blueprints: Blueprint[];
  ambassadors: SeatId[];
  traitor: boolean;
  graveyard?: Resources;
  storedParts?: string[];
  ambassadorResources?: { from: SeatId; resource: Resource }[];
}
export interface PrivateSeat {
  seatId: SeatId;
  reputation: number[];
  discoveriesKept: string[];
}

interface DecisionBase {
  id: string;
  owner: SeatId;
}
/** These are persisted choices, never callbacks or component-local continuation state. */
export type PendingDecision = DecisionBase &
  (
    | {
        kind: "exploration";
        position: Coordinate;
        drawnTileIds: string[];
        canDrawAnother?: boolean;
        placements: { tileId: string; rotation: number }[];
      }
    | {
        kind: "discovery";
        tileId: string;
        options: ("keep" | "use")[];
        sectorId?: string;
      }
    | {
        kind: "colonization";
        squares: {
          sectorId: string;
          squareId: string;
          resources: Resource[];
        }[];
      }
    | {
        kind: "diplomacy-window";
        eligibleSeatIds: SeatId[];
        populationSources: Resource[];
        declinedSeatIds?: SeatId[];
      }
    | {
        kind: "diplomacy";
        proposer: SeatId;
        populationSources: Resource[];
        proposerResource?: Resource;
      }
    | {
        kind: "combat-allocation";
        battleId: string;
        dice: {
          id: string;
          face: number;
          damage: number;
          /** Optional presentation provenance; absent in saves created before UX P4. */
          computer?: number;
          sourceShipId?: string;
          sourceShipType?: Ship["type"];
          weaponKind?: "cannon" | "missile";
          weaponColor?: "yellow" | "orange" | "blue" | "red";
          targets: string[];
          hitTargets?: string[];
          split?: boolean;
        }[];
      }
    | {
        kind: "retreat";
        battleId: string;
        shipIds: string[];
        destinationIds: string[];
      }
    | { kind: "reputation"; drawn: number[]; capacity: number }
    | { kind: "bankruptcy"; shortfall: number; abandonableSectorIds: string[] }
    | {
        kind: "population-return";
        count: number;
        resources: Resource[];
        destination?: "track" | "graveyard";
      }
    | { kind: "control"; sectorId: string }
    | { kind: "free-technology"; technologyIds: string[] }
    | { kind: "resource-reward"; count: number; perChoice: number }
    | { kind: "portal-placement"; sectorIds: string[] }
    | {
        kind: "combat-turn";
        battleId: string;
        shipType: string;
        destinationIds: string[];
        forcedRetreat?: boolean;
      }
    | { kind: "initiative-order"; battleId: string; groupIds: string[] }
    | {
        kind: "bombardment";
        sectorId: string;
        hits: number;
        squareIds: string[];
      }
    | { kind: "ancient-part"; partId: string }
  );

export type DecisionChoice =
  | {
      kind: "exploration";
      tileId: string | null;
      rotation: number;
      drawAnother?: boolean;
    }
  | { kind: "discovery"; option: "keep" | "use" }
  | {
      kind: "colonization";
      placements: { sectorId: string; squareId: string; resource: Resource }[];
    }
  | { kind: "diplomacy-window"; offerTo: SeatId | null; resource: Resource }
  | { kind: "diplomacy"; accept: boolean; resource: Resource }
  | {
      kind: "combat-allocation";
      allocations: { dieId: string; targetId: string; damage?: number }[];
    }
  | { kind: "retreat"; destinationId: string | null }
  | { kind: "reputation"; kept: number[] }
  | { kind: "bankruptcy"; abandonSectorId: string }
  | { kind: "population-return"; resources: Resource[] }
  | { kind: "control"; accept: boolean }
  | { kind: "free-technology"; technologyId: string; track: Track }
  | { kind: "resource-reward"; resources: Resource[] }
  | { kind: "portal-placement"; sectorId: string }
  | { kind: "combat-turn"; retreatTo: string | null }
  | { kind: "initiative-order"; groupIds: string[] }
  | { kind: "bombardment"; squareIds: string[] }
  | { kind: "ancient-part"; blueprint: Blueprint | null };

export type FundableAction =
  | { type: "research"; tileId: string; track: Track }
  | {
      type: "build";
      builds: {
        sectorId: string;
        component: ShipType | "orbital" | "monolith";
      }[];
    };
export interface FundingTrade {
  from: Resource;
  to: Resource;
  amount: number;
}
export type GameCommand =
  | { type: "trade-and-act"; trades: FundingTrade[]; action: FundableAction }
  | { type: "explore"; position: Coordinate }
  | { type: "influence"; removeSectorIds: string[]; addSectorIds: string[] }
  | { type: "research"; tileId: string; track: Track }
  | { type: "upgrade"; blueprints: Blueprint[] }
  | {
      type: "build";
      builds: {
        sectorId: string;
        component: ShipType | "orbital" | "monolith";
      }[];
    }
  | { type: "move"; moves: { shipId: string; path: string[] }[] }
  | { type: "discard-reputation"; values: number[] }
  | { type: "pass" }
  | { type: "end-action" }
  | { type: "finish-upkeep" }
  | { type: "trade"; from: Resource; to: Resource; amount: number }
  | {
      type: "colonize";
      placements: { sectorId: string; squareId: string; resource: Resource }[];
    }
  | { type: "offer-diplomacy"; to: SeatId; resource: Resource }
  | { type: "resolve"; decisionId: string; choice: DecisionChoice };

export interface GameState {
  rulesVersion: string;
  catalogVersion: string;
  revision: number;
  round: number;
  phase: Phase;
  activeSeatId: SeatId | null;
  startSeatId: SeatId;
  firstPasser: SeatId | null;
  seats: Seat[];
  sectors: Sector[];
  ships: Ship[];
  technologyMarket: string[];
  pendingDecision: PendingDecision | null;
  privateSeats: PrivateSeat[];
  random: RandomState;
  supplies: {
    inner: string[];
    middle: string[];
    outer: string[];
    technology: string[];
    discovery: string[];
    reputation: number[];
  };
  /** Only the authoritative engine consumes these continuation records. */
  engine?: EngineContinuation;
}

export interface ActionProgress {
  owner: SeatId;
  action: Action;
  remaining: number;
  influenceSectorIds?: string[];
  coloniesRefreshed?: boolean;
}
export interface BattleGroup {
  id: string;
  owner: string;
  shipType: Ship["type"];
  initiative: number;
}
export interface BattleState {
  id: string;
  sectorId: string;
  attacker: string;
  defender: string;
  stage: "missiles" | "engagement";
  engagement: number;
  groups: BattleGroup[];
  groupIndex: number;
  retreats: {
    owner: string;
    shipType: Ship["type"];
    destination: string;
    engagement: number;
  }[];
  kills: { owner: string; value: number }[];
  participants: string[];
  retreated: string[];
  dice?: { id: string; face: number; damage: number; computer: number; sourceShipId?: string; sourceShipType?: Ship["type"]; weaponKind?: "cannon" | "missile"; weaponColor?: "yellow" | "orange" | "blue" | "red" }[];
  attackingOwner?: string;
  reputationOrder?: string[];
  awarded?: string[];
  participationEligible?: string[];
  orderedGroups?: string[];
  splitDice?: string[];
  forcedRetreat?: boolean;
}
export interface EngineContinuation {
  warpPortals: boolean;
  action: ActionProgress | null;
  decisions: PendingDecision[];
  sectorDiscoveries: { sectorId: string; discoveryId: string }[];
  discardedSectors: { inner: string[]; middle: string[]; outer: string[] };
  discardedDiscoveries: string[];
  boxedSectors: string[];
  battle: BattleState | null;
  battleSectors: string[];
  aftermath?: "bombardment" | "control" | "discovery" | "done";
  aftermathDone?: string[];
  upkeepDone: SeatId[];
  diplomacyDone?: SeatId[];
  diplomacyDeclined?: { proposer: SeatId; offeree: SeatId }[];
  scores: ScoreBreakdown[] | null;
  nextId: number;
  combatInitialized?: boolean;
}

/** Event details are typed and carry explicit visibility; raw commands never enter a public log. */
export interface GameEvent {
  type:
    | "action"
    | "decision"
    | "resource"
    | "draw"
    | "combat"
    | "phase"
    | "score";
  seatId: SeatId | null;
  visibility: "public" | { seatId: SeatId };
  message: string;
  /** Public, read-only combat playback data. Older journal entries omit it. */
  combatVolley?: {
    battleId: string;
    sectorId?: string;
    attacker: string;
    dice: { id: string; face: number; damage: number; computer: number; sourceShipId?: string; sourceShipType?: Ship["type"]; weaponKind?: "cannon" | "missile"; weaponColor?: "yellow" | "orange" | "blue" | "red" }[];
    impacts: { dieId: string; targetId: string; damage: number; hit: boolean }[];
    targets: { id: string; shipType?: Ship["type"]; owner?: string; hpBefore: number; hpAfter: number; excess: number; destroyed: boolean }[];
  };
}
export interface ValidationError {
  code:
    | "NOT_A_SEAT"
    | "NOT_YOUR_TURN"
    | "DECISION_PENDING"
    | "WRONG_DECISION"
    | "STALE_REVISION"
    | "COMMAND_ID_REUSED"
    | "INVALID_COMMAND"
    | "ILLEGAL_ACTION"
    | "INSUFFICIENT_RESOURCES"
    | "VERSION_MISMATCH"
    | "GAME_FINISHED"
    | "TURN_TIMEOUT";
  message: string;
  field: string | null;
}
export type RuleResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: ValidationError };
export interface CommandRequest {
  commandId: string;
  expectedRevision: number;
  command: GameCommand;
}
export interface CommandReceipt {
  commandId: string;
  revision: number;
  eventCount: number;
}
export interface JournalEntry {
  actor: SeatId;
  request: CommandRequest;
  receipt: CommandReceipt;
  events: GameEvent[];
}
export interface MatchAggregate {
  state: GameState;
  journal: JournalEntry[];
}
export type SubmissionResult =
  | {
      ok: true;
      aggregate: MatchAggregate;
      receipt: CommandReceipt;
      duplicate: boolean;
    }
  | { ok: false; aggregate: MatchAggregate; error: ValidationError };

export interface PlayerView {
  rulesVersion: string;
  catalogVersion: string;
  revision: number;
  round: number;
  phase: Phase;
  activeSeatId: SeatId | null;
  startSeatId: SeatId;
  viewerSeatId: SeatId;
  /** Public turn order and optional-rule configuration, also used by fair AI rollouts. */
  firstPasser?: SeatId | null;
  warpPortals?: boolean;
  seats: Seat[];
  sectors: Sector[];
  ships: Ship[];
  technologyMarket: string[];
  private: PrivateSeat;
  pendingDecision: PendingDecision | null;
  waitingFor: { owner: SeatId; kind: PendingDecision["kind"] } | null;
  hiddenTileCounts: {
    seatId: SeatId;
    reputation: number;
    discoveriesKept: number;
  }[];
  supplyCounts?: {
    inner: number;
    middle: number;
    outer: number;
    technology: number;
    discovery: number;
    reputation: number;
  };
  actionProgress?: ActionProgress | null;
  scores?: ScoreBreakdown[] | null;
  battle?: {
    id?: string;
    sectorId: string;
    attacker: string;
    defender: string;
    stage: string;
    engagement: number;
  } | null;
}
