import { ALL_PARTS, type Part } from '../config/parts';
import type { FrameId } from '../config/frames';
import { getFrame, makeShip } from '../game';
import type { Ship } from '../config/types';

export function applyBlueprintHints(
  current: Record<string, Part[]>,
  hints: Record<string, string[]>
): Record<string, Part[]> {
  const next: Record<string, Part[]> = { ...current };
  Object.keys(hints).forEach((frameId) => {
    const ids = hints[frameId] || [];
    const mapped: Part[] = ids
      .map((id) => (ALL_PARTS as Part[]).find((p) => p.id === id))
      .filter(Boolean) as Part[];
    if (mapped.length > 0) {
      next[frameId as FrameId] = mapped;
    }
  });
  return next;
}

/**
 * Authoritative mapping from blueprint ID lists (by frame) to concrete Part arrays (by frame).
 * Unknown IDs are ignored. Frames without IDs produce an empty array.
 */
export function mapBlueprintIdsToParts(ids: Record<FrameId, string[]>): Record<FrameId, Part[]> {
  const result: Record<FrameId, Part[]> = {
    interceptor: [],
    cruiser: [],
    dread: [],
  };
  (Object.keys(ids) as FrameId[]).forEach((frameId: FrameId) => {
    const list = ids[frameId] || [];
    const mapped: Part[] = list
      .map((id) => (ALL_PARTS as Part[]).find((p) => p.id === id))
      .filter((p): p is Part => Boolean(p));
    result[frameId] = mapped;
  });
  return result;
}

/**
 * Build a deterministic fleet from a list of part IDs for a given frame.
 * Used for the initial MP seed when a server snapshot is absent.
 */
export function seedFleetFromBlueprints(frameId: FrameId, partIds: string[], count: number): Ship[] {
  const parts: Part[] = partIds
    .map((id) => (ALL_PARTS as Part[]).find((p) => p.id === id))
    .filter((p): p is Part => Boolean(p));
  const n = Math.max(0, Math.floor(count));
  const frame = getFrame(frameId);
  const ships: Ship[] = Array.from({ length: n }, () => makeShip(frame, [ ...parts ]));
  return ships;
}
