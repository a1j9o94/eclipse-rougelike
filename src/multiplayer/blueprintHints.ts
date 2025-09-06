import { ALL_PARTS, type Part } from '../../shared/parts';
import { INITIAL_BLUEPRINTS } from '../../shared/defaults';
import type { FrameId } from '../../shared/frames';
import { getFrame, makeShip } from '../game';
import type { Ship } from '../../shared/types';

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
  const frames: FrameId[] = ['interceptor','cruiser','dread'];
  const result: Record<FrameId, Part[]> = { interceptor: [], cruiser: [], dread: [] };
  for (const frameId of frames) {
    const list = (ids && ids[frameId]) ? ids[frameId] : [];
    const mapped: Part[] = list
      .map((id) => (ALL_PARTS as Part[]).find((p) => p.id === id))
      .filter((p): p is Part => Boolean(p));
    // Per-frame fallback: if server didn’t specify blueprint ids for a frame,
    // backfill from INITIAL_BLUEPRINTS so newly-built ships are deployable.
    // This is especially important for Warmongers building Interceptors when
    // only Cruiser blueprints are provided.
    result[frameId] = mapped.length > 0
      ? mapped
      : ([ ...INITIAL_BLUEPRINTS[frameId] ] as Part[]);
  }
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
