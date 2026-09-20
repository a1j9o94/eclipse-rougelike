import { validateBlueprint, type ShipBlueprint } from './blueprints';
import type { AncientShipPartId } from './discoveries';
import { getShipPart, isShipPartId, type ShipPartId } from './parts';
import { researchedTechnologyIds } from './technologies';
import { queueDecision, requireRule, uniqueId } from './rulesState';
import type { Blueprint, DecisionChoice, GameState, PendingDecision, Seat } from './types';

function ancientId(id: string): AncientShipPartId {
  requireRule(isShipPartId(id) && getShipPart(id).access.kind === 'ancient', 'Choose a base-game ancient ship part.', 'INVALID_COMMAND');
  return id as AncientShipPartId;
}
function blueprintParts(blueprint: Blueprint): ShipBlueprint {
  const part = (id: string): ShipPartId => { requireRule(isShipPartId(id), 'Blueprint contains an unknown part.', 'INVALID_COMMAND'); return id; };
  return { shipType: blueprint.shipType, parts: blueprint.parts.map(id => id === null ? null : part(id)), outsideParts: (blueprint.outsideParts ?? []).map(part) };
}
/** Publisher p9: offer immediate free installation or storage; neither uses an upgrade activation. */
export function queueAncientPart(state: GameState, seat: Seat, part: string): void {
  const partId = ancientId(part);
  requireRule(!state.seats.some(owner => (owner.storedParts ?? []).includes(partId) || owner.blueprints.some(blueprint => [...blueprint.parts, ...(blueprint.outsideParts ?? [])].includes(partId))), 'This unique ancient part is already owned.');
  queueDecision(state, { id: uniqueId(state, 'ancient-part'), owner: seat.id, kind: 'ancient-part', partId });
}
/** A response supplies one complete blueprint. Its only change is installation of the discovered part.
 * Replacing an ancient overlay destroys that overlay; it is not moved to storage or another blueprint.
 * Main command processor clears pending decision, logs the event and advances the persisted queue.
 */
export function resolveAncientPart(state: GameState, seat: Seat, decision: PendingDecision, choice: DecisionChoice): void {
  requireRule(decision.kind === 'ancient-part' && choice.kind === 'ancient-part', 'The response must match the ancient-part decision.');
  requireRule(decision.owner === seat.id && state.seats.some(owner => owner.id === seat.id), 'This ancient part belongs to another player.');
  const id = ancientId(decision.partId);
  requireRule(!state.seats.some(owner => (owner.storedParts ?? []).includes(id) || owner.blueprints.some(blueprint => [...blueprint.parts, ...(blueprint.outsideParts ?? [])].includes(id))), 'This unique ancient part is already owned.');
  if (choice.blueprint === null) { seat.storedParts = [...(seat.storedParts ?? []), id]; return; }
  const next = blueprintParts(choice.blueprint);
  const index = seat.blueprints.findIndex(blueprint => blueprint.shipType === next.shipType);
  requireRule(index >= 0, 'The chosen blueprint does not belong to this civilization.');
  const previous = blueprintParts(seat.blueprints[index]);
  requireRule(next.parts.length === previous.parts.length, 'Ancient acquisition cannot change the blueprint grid.');
  if (getShipPart(id).placement === 'outside') {
    requireRule(next.parts.every((part, slot) => part === previous.parts[slot]) && next.outsideParts.length === previous.outsideParts.length + 1 && previous.outsideParts.every((part, slot) => part === next.outsideParts[slot]) && next.outsideParts[next.outsideParts.length - 1] === id, 'Muon Source is added outside the grid without moving other parts.');
  } else {
    const changed = next.parts.flatMap((part, slot) => part === previous.parts[slot] ? [] : [slot]);
    requireRule(changed.length === 1 && next.parts[changed[0]] === id, 'Install the discovered part in exactly one slot; other parts cannot move.');
    requireRule(next.outsideParts.length === previous.outsideParts.length && next.outsideParts.every((part, slot) => part === previous.outsideParts[slot]), 'Permanent outside-grid parts cannot be removed or replaced.');
  }
  const ownedAncients = [...previous.parts, ...previous.outsideParts].filter((part): part is ShipPartId => part !== null).filter(part => getShipPart(part).access.kind === 'ancient').map(ancientId);
  const researched = researchedTechnologyIds(seat);
  const issues = validateBlueprint(seat.faction, next, researched, [...ownedAncients, id], previous);
  requireRule(issues.length === 0, issues.map(issue => issue.message).join(' '));
  seat.blueprints[index] = { shipType: next.shipType, parts: [...next.parts], outsideParts: [...next.outsideParts] };
}
