import type { FactionId } from './catalog';
import type { AncientShipPartId } from './discoveries';
import type { TechnologyId } from './technologies';
import { getShipPart, type ShipPartId } from './parts';
import { validateBlueprint, type ShipBlueprint } from './blueprints';

export interface UpgradeStep {
  removeSlots: number[];
  /** A null slot installs Muon Source outside the blueprint grid. */
  install: { slot: number | null; part: ShipPartId } | null;
}
export type UpgradePlanResult =
  | { ok: true; installations: number; steps: UpgradeStep[] }
  | { ok: false; code: 'INVALID_BLUEPRINT' | 'ANCIENT_RELOCATION' | 'SEARCH_BOUND' | 'NO_LEGAL_ORDER'; message: string };
interface Edit { slot: number | null; old: ShipPartId | null; next: ShipPartId | null }
/** Finds a legal sequence of the requested final edits, with <=9 changed slots (eight grid slots plus Muon).
 * No temporary parts or extra installs are invented. Each activation returns any chosen
 * overlays, then installs one final part; its completed blueprint must be legal (p12).
 * This checks order only. The command processor enforces total activations across ships.
 */
export function planBlueprintUpgrade(faction: FactionId, previous: ShipBlueprint, next: ShipBlueprint, researched: readonly TechnologyId[], availableAncientParts: readonly AncientShipPartId[]): UpgradePlanResult {
  const invalid = (message: string): UpgradePlanResult => ({ ok: false, code: 'INVALID_BLUEPRINT', message });
  if (previous.shipType !== next.shipType || previous.parts.length !== next.parts.length) return invalid('Edit the same blueprint with the same number of slots.');
  const issues = validateBlueprint(faction, next, researched, availableAncientParts, previous);
  if (issues.length) return invalid(issues.map(issue => issue.message).join(' '));
  for (let slot = 0; slot < previous.parts.length; slot++) {
    const id = previous.parts[slot];
    if (id && getShipPart(id).access.kind === 'ancient' && next.parts.includes(id) && next.parts[slot] !== id) return { ok: false, code: 'ANCIENT_RELOCATION', message: 'An ancient part removed from its slot cannot be installed elsewhere.' };
  }
  if (!previous.outsideParts.every((id, slot) => next.outsideParts[slot] === id) || next.outsideParts.length > previous.outsideParts.length + 1) return invalid('Permanent outside-grid parts cannot be moved.');
  const edits: Edit[] = previous.parts.flatMap((old, slot) => old === next.parts[slot] ? [] : [{ slot, old, next: next.parts[slot] }]);
  if (next.outsideParts.length > previous.outsideParts.length) edits.push({ slot: null, old: null, next: next.outsideParts[next.outsideParts.length - 1] });
  if (edits.length > 9) return { ok: false, code: 'SEARCH_BOUND', message: 'At most nine changed slots can be planned in one bounded upgrade.' };
  const installMask = edits.reduce((mask, edit, index) => edit.next !== null ? mask | (1 << index) : mask, 0);
  const removalOnlyMask = edits.reduce((mask, edit, index) => edit.next === null ? mask | (1 << index) : mask, 0);
  const installations = edits.filter(edit => edit.next !== null).length;
  if (!installations) return { ok: true, installations: 0, steps: edits.length ? [{ removeSlots: edits.flatMap(edit => edit.slot === null ? [] : [edit.slot]), install: null }] : [] };
  const seen = new Set<string>();
  const materialize = (installed: number, removed: number): ShipBlueprint => {
    const draft: ShipBlueprint = { shipType: previous.shipType, parts: [...previous.parts], outsideParts: [...previous.outsideParts] };
    edits.forEach((edit, index) => {
      const bit = 1 << index;
      if (edit.slot === null) { if (installed & bit && edit.next) draft.outsideParts.push(edit.next); }
      else if (installed & bit) draft.parts[edit.slot] = edit.next;
      else if (removed & bit) draft.parts[edit.slot] = null;
    });
    return draft;
  };
  const search = (installed: number, removed: number): UpgradeStep[] | null => {
    if (installed === installMask && (removed & removalOnlyMask) === removalOnlyMask) return [];
    const key = `${installed}:${removed}`; if (seen.has(key)) return null; seen.add(key);
    let removable = 0;
    edits.forEach((edit, index) => { const bit = 1 << index; if (edit.old !== null && !(installed & bit) && !(removed & bit)) removable |= bit; });
    for (let index = 0; index < edits.length; index++) {
      const bit = 1 << index; const edit = edits[index];
      if (!(installMask & bit) || installed & bit || edit.next === null) continue;
      const lastInstall = (installed | bit) === installMask;
      const required = (edit.old !== null && !(removed & bit) ? bit : 0) | (lastInstall ? removalOnlyMask & ~removed : 0);
      for (let subset = 0; subset < 1 << edits.length; subset++) {
        if ((subset & ~removable) !== 0 || (subset & required) !== required) continue;
        const removedNext = removed | subset;
        const draft = materialize(installed | bit, removedNext);
        if (validateBlueprint(faction, draft, researched, availableAncientParts, previous).length) continue;
        const rest = search(installed | bit, removedNext);
        if (rest) return [{ removeSlots: edits.flatMap((candidate, candidateIndex) => subset & (1 << candidateIndex) && candidate.slot !== null ? [candidate.slot] : []), install: { slot: edit.slot, part: edit.next } }, ...rest];
      }
    }
    return null;
  };
  const steps = search(0, 0);
  return steps ? { ok: true, installations, steps } : { ok: false, code: 'NO_LEGAL_ORDER', message: 'No ordering keeps each completed upgrade activation within energy and drive restrictions.' };
}
