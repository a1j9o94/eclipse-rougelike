// Action handlers for Eclipse's six action types
// Each action modifies game state in specific ways

import type { Resources, Research } from '../../shared/defaults';
import type { FrameId } from '../../shared/frames';
import type { ShipSnap } from './combat';

// Action results represent the outcome of executing an action
export type ActionResult = {
  success: boolean;
  message?: string;
  resourceChanges?: Partial<Resources>;
  researchChanges?: Partial<Research>;
  fleetChanges?: ShipSnap[];
  influenceChanges?: number;
};

// Explore action - draw and place new sector
export type ExploreAction = {
  type: 'explore';
  playerId: string;
  // Future: sector placement data
};

// Influence action - manage influence discs and refresh colony ships
export type InfluenceAction = {
  type: 'influence';
  playerId: string;
  discPlacements?: number; // Number of discs to place/move
  refreshShips?: number;    // Colony ships to refresh
};

// Research action - purchase technology
export type ResearchAction = {
  type: 'research';
  playerId: string;
  techId: string;
  scienceCost: number;
};

// Upgrade action - replace ship parts
export type UpgradeAction = {
  type: 'upgrade';
  playerId: string;
  frameId: FrameId;
  removePartIds: string[];
  addPartIds: string[];
  materialCost?: number;
};

// Build action - construct ships or structures
export type BuildAction = {
  type: 'build';
  playerId: string;
  buildType: 'ship' | 'structure';
  frameId?: FrameId; // For ships
  structureType?: string; // For structures
  creditCost: number;
  materialCost: number;
};

// Move action - move one ship
export type MoveAction = {
  type: 'move';
  playerId: string;
  shipId: string;
  fromSector: number;
  toSector: number;
};

export type GameAction =
  | ExploreAction
  | InfluenceAction
  | ResearchAction
  | UpgradeAction
  | BuildAction
  | MoveAction;

/**
 * Execute an Explore action
 * In Eclipse, this draws a new sector tile and places it adjacent to controlled space
 */
export function executeExplore(
  action: ExploreAction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _playerState: { resources: Resources; sector: number }
): ActionResult {
  // In full implementation, this would:
  // 1. Draw a random sector tile from the deck
  // 2. Place it adjacent to player's controlled sectors
  // 3. Potentially trigger discovery bonuses

  // Simplified: just advance sector counter
  return {
    success: true,
    message: `Player ${action.playerId} explored a new sector`,
    // Sector advancement would be handled by game state update
  };
}

/**
 * Execute an Influence action
 * In Eclipse, this allows picking up and placing up to 2 influence discs
 * and refreshing 2 colony ships
 */
export function executeInfluence(
  action: InfluenceAction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _playerState: { resources: Resources }
): ActionResult {
  const discPlacements = action.discPlacements || 2;
  const shipsRefreshed = action.refreshShips || 2;

  return {
    success: true,
    message: `Player ${action.playerId} managed influence (${discPlacements} discs, ${shipsRefreshed} ships)`,
    influenceChanges: discPlacements,
  };
}

/**
 * Execute a Research action
 * Purchase a technology tile with science
 */
export function executeResearch(
  action: ResearchAction,
  playerState: { resources: Resources; research: Research }
): ActionResult {
  const currentScience = playerState.resources.science;

  if (currentScience < action.scienceCost) {
    return {
      success: false,
      message: `Not enough science (need ${action.scienceCost}, have ${currentScience})`,
    };
  }

  // Deduct science cost
  const resourceChanges: Partial<Resources> = {
    science: currentScience - action.scienceCost,
  };

  // In full implementation, this would:
  // 1. Add the technology tile to player's board
  // 2. Apply technology effects (better weapons, shields, etc.)
  // 3. Update research tracks

  return {
    success: true,
    message: `Player ${action.playerId} researched technology ${action.techId}`,
    resourceChanges,
  };
}

/**
 * Execute an Upgrade action
 * Replace ship parts with better ones
 */
export function executeUpgrade(
  action: UpgradeAction,
  playerState: { resources: Resources; blueprints: Record<FrameId, unknown[]> }
): ActionResult {
  const materialCost = action.materialCost || 0;
  const currentMaterials = playerState.resources.materials;

  if (currentMaterials < materialCost) {
    return {
      success: false,
      message: `Not enough materials (need ${materialCost}, have ${currentMaterials})`,
    };
  }

  // Deduct materials
  const resourceChanges: Partial<Resources> = {
    materials: currentMaterials - materialCost,
  };

  // In full implementation, this would:
  // 1. Remove old parts from blueprint
  // 2. Add new parts to blueprint
  // 3. Recalculate ship stats
  // 4. Validate ship configuration

  return {
    success: true,
    message: `Player ${action.playerId} upgraded ${action.frameId} (removed ${action.removePartIds.length}, added ${action.addPartIds.length} parts)`,
    resourceChanges,
  };
}

/**
 * Execute a Build action
 * Construct ships or structures
 */
export function executeBuild(
  action: BuildAction,
  playerState: { resources: Resources; fleet: ShipSnap[] }
): ActionResult {
  const currentCredits = playerState.resources.credits;
  const currentMaterials = playerState.resources.materials;

  // Check costs
  if (currentCredits < action.creditCost) {
    return {
      success: false,
      message: `Not enough credits (need ${action.creditCost}, have ${currentCredits})`,
    };
  }

  if (currentMaterials < action.materialCost) {
    return {
      success: false,
      message: `Not enough materials (need ${action.materialCost}, have ${currentMaterials})`,
    };
  }

  // Deduct costs
  const resourceChanges: Partial<Resources> = {
    credits: currentCredits - action.creditCost,
    materials: currentMaterials - action.materialCost,
  };

  if (action.buildType === 'ship' && action.frameId) {
    // In full implementation:
    // 1. Create new ship from blueprint
    // 2. Add to fleet
    // 3. Check capacity limits

    return {
      success: true,
      message: `Player ${action.playerId} built a ${action.frameId}`,
      resourceChanges,
    };
  } else if (action.buildType === 'structure') {
    // Structures provide bonuses (orbital platforms, starbases, etc.)
    return {
      success: true,
      message: `Player ${action.playerId} built a ${action.structureType}`,
      resourceChanges,
    };
  }

  return {
    success: false,
    message: 'Invalid build action',
  };
}

/**
 * Execute a Move action
 * Move one ship from one sector to another
 */
export function executeMove(
  action: MoveAction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _playerState: { fleet: ShipSnap[]; sector: number }
): ActionResult {
  // In full implementation, this would:
  // 1. Validate ship exists and is in fromSector
  // 2. Check if toSector is adjacent/reachable
  // 3. Check for intercepting enemy ships
  // 4. Update ship location
  // 5. Potentially trigger combat

  return {
    success: true,
    message: `Player ${action.playerId} moved ship ${action.shipId} from sector ${action.fromSector} to ${action.toSector}`,
  };
}

/**
 * Main action executor - routes to specific handlers
 */
export function executeGameAction(
  action: GameAction,
  playerState: {
    resources: Resources;
    research: Research;
    fleet: ShipSnap[];
    sector: number;
    blueprints: Record<FrameId, unknown[]>;
  }
): ActionResult {
  switch (action.type) {
    case 'explore':
      return executeExplore(action, playerState);
    case 'influence':
      return executeInfluence(action, playerState);
    case 'research':
      return executeResearch(action, playerState);
    case 'upgrade':
      return executeUpgrade(action, playerState);
    case 'build':
      return executeBuild(action, playerState);
    case 'move':
      return executeMove(action, playerState);
    default:
      return {
        success: false,
        message: 'Unknown action type',
      };
  }
}

/**
 * Validate action before execution
 */
export function validateGameAction(
  action: GameAction,
  playerState: {
    resources: Resources;
    research: Research;
    fleet: ShipSnap[];
    sector: number;
  }
): { valid: boolean; reason?: string } {
  switch (action.type) {
    case 'research': {
      if (playerState.resources.science < action.scienceCost) {
        return {
          valid: false,
          reason: `Not enough science (need ${action.scienceCost}, have ${playerState.resources.science})`,
        };
      }
      break;
    }
    case 'build': {
      if (playerState.resources.credits < action.creditCost) {
        return { valid: false, reason: 'Not enough credits' };
      }
      if (playerState.resources.materials < action.materialCost) {
        return { valid: false, reason: 'Not enough materials' };
      }
      break;
    }
    case 'upgrade': {
      const materialCost = action.materialCost || 0;
      if (playerState.resources.materials < materialCost) {
        return { valid: false, reason: 'Not enough materials' };
      }
      break;
    }
  }

  return { valid: true };
}

export default {
  executeGameAction,
  validateGameAction,
  executeExplore,
  executeInfluence,
  executeResearch,
  executeUpgrade,
  executeBuild,
  executeMove,
};
