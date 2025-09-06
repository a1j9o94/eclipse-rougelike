import { ALL_PARTS, type Part } from '../config/parts';
import type { FrameId } from '../config/frames';

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

