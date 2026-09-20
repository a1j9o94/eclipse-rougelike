import { expect, it } from "vitest";
import {
  calculateRatingDeltas,
  INITIAL_RATING,
} from "../../shared/eclipse/ratings";
it("starts at 1000 and awards equal opponents +16/-16 for a decisive result", () => {
  expect(INITIAL_RATING).toBe(1000);
  expect(
    calculateRatingDeltas([
      { playerId: "a", rating: 1000, place: 1, resigned: false },
      { playerId: "b", rating: 1000, place: 2, resigned: false },
    ]),
  ).toEqual([
    { playerId: "a", delta: 16 },
    { playerId: "b", delta: -16 },
  ]);
});
it("averages human comparisons rather than multiplying K by the number of opponents", () => {
  expect(
    calculateRatingDeltas(
      [1, 2, 3].map((place) => ({
        playerId: String(place),
        rating: 1000,
        place,
        resigned: false,
      })),
    ),
  ).toEqual([
    { playerId: "1", delta: 16 },
    { playerId: "2", delta: 0 },
    { playerId: "3", delta: -16 },
  ]);
});
it("treats tied scores as draws and a resigned higher scorer as a loss", () => {
  expect(
    calculateRatingDeltas([
      { playerId: "a", rating: 1000, place: 1, resigned: false },
      { playerId: "b", rating: 1000, place: 1, resigned: false },
    ]).map((p) => p.delta),
  ).toEqual([0, 0]);
  expect(
    calculateRatingDeltas([
      { playerId: "a", rating: 1000, place: 1, resigned: true },
      { playerId: "b", rating: 1000, place: 2, resigned: false },
    ]).map((p) => p.delta),
  ).toEqual([-16, 16]);
});
it("rewards an upset more than an expected win and rejects a solo rating", () => {
  expect(
    calculateRatingDeltas([
      { playerId: "a", rating: 800, place: 1, resigned: false },
      { playerId: "b", rating: 1200, place: 2, resigned: false },
    ]).map((p) => p.delta),
  ).toEqual([29, -29]);
  expect(
    calculateRatingDeltas([
      { playerId: "a", rating: 1000, place: 1, resigned: false },
    ]),
  ).toEqual([]);
});
