export type PlayerRec = { playerId: string; isReady: boolean };
export type PlayerStates = Record<string, { fleetValid?: boolean } | undefined>;

export function canStartCombat(players: PlayerRec[], states: PlayerStates): boolean {
  if (!players || players.length !== 2) return false;
  // Everyone must be ready and valid
  for (const p of players) {
    if (!p.isReady) return false;
    const st = states[p.playerId];
    if (st && st.fleetValid === false) return false;
  }
  return true;
}

