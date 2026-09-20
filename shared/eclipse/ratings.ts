import type { FactionId } from "./catalog";

export const INITIAL_RATING = 1000;
export const RATING_K = 32;
export type LeaderboardSort = "rating" | "wins" | "win-rate";
export interface FactionWinRecord {
  faction: FactionId;
  wins: number;
  games: number;
}
export interface LeaderboardRow {
  playerId: string;
  username: string;
  rating: number;
  games: number;
  wins: number;
  /** Fraction from zero to one. */
  winRate: number;
  factionWins: FactionWinRecord[];
}
export interface LeaderboardResult {
  rows: LeaderboardRow[];
}
export interface RatedPlayerResult {
  playerId: string;
  rating: number;
  place: number;
  resigned: boolean;
}
export interface RatingDelta {
  playerId: string;
  delta: number;
}

/** Human-only pairwise Elo, averaged across opponents; exact place ties draw. */
export function calculateRatingDeltas(
  players: readonly RatedPlayerResult[],
): RatingDelta[] {
  if (players.length < 2) return [];
  return players.map((player) => {
    let difference = 0;
    for (const opponent of players) {
      if (opponent.playerId === player.playerId) continue;
      const outcome =
        player.resigned !== opponent.resigned
          ? Number(!player.resigned)
          : player.resigned || player.place === opponent.place
            ? 0.5
            : Number(player.place < opponent.place);
      const expected =
        1 / (1 + 10 ** ((opponent.rating - player.rating) / 400));
      difference += outcome - expected;
    }
    return {
      playerId: player.playerId,
      delta: Math.round((RATING_K * difference) / (players.length - 1)),
    };
  });
}
