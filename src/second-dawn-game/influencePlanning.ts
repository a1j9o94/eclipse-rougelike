import type { CommandCandidate } from "./SecondDawnBoard";

export interface InfluenceChoices {
  refresh: CommandCandidate | null;
  removeOnly: CommandCandidate[];
  addOnly: CommandCandidate[];
  transfersBySource: Map<string, CommandCandidate[]>;
}

/** Splits the authoritative Influence candidates into the visible disc choices. */
export function influenceChoices(
  candidates: readonly CommandCandidate[],
): InfluenceChoices {
  const refresh =
    candidates.find(
      (candidate) =>
        candidate.command.type === "influence" &&
        candidate.command.removeSectorIds.length === 0 &&
        candidate.command.addSectorIds.length === 0,
    ) ?? null;
  const removeOnly: CommandCandidate[] = [];
  const addOnly: CommandCandidate[] = [];
  const transfersBySource = new Map<string, CommandCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.command.type !== "influence") continue;
    const command = candidate.command;
    if (command.removeSectorIds.length && command.addSectorIds.length) {
      const source = command.removeSectorIds[0];
      transfersBySource.set(source, [
        ...(transfersBySource.get(source) ?? []),
        candidate,
      ]);
    } else if (command.removeSectorIds.length) removeOnly.push(candidate);
    else if (command.addSectorIds.length) addOnly.push(candidate);
  }
  return { refresh, removeOnly, addOnly, transfersBySource };
}
