import { describe, expect, it } from "vitest";
import {
  BASE_COMPONENTS,
  BASE_FACTIONS,
  getFaction,
} from "../../shared/eclipse/catalog";
import { createGame } from "../../shared/eclipse/setup";
import { processGameCommand } from "../../shared/eclipse/engine";
import { chooseAiCommand } from "../../shared/eclipse/ai";
import { getPlayerView } from "../../shared/eclipse/protocol";
import type { GameState } from "../../shared/eclipse/types";
function conservation(s: GameState): void {
  const e = s.engine!;
  const physicalResearch = s.seats.reduce(
    (n, p) =>
      n +
      Object.values(p.technologies).flat().length -
      getFaction(p.faction).startingTechnologies.length,
    0,
  );
  expect(
    s.supplies.technology.length + s.technologyMarket.length + physicalResearch,
  ).toBe(e.warpPortals ? 114 : 113);
  const discoveries =
    s.supplies.discovery.length +
    e.sectorDiscoveries.length +
    e.discardedDiscoveries.length +
    s.privateSeats.reduce((n, p) => n + p.discoveriesKept.length, 0) +
    [s.pendingDecision, ...e.decisions].filter((d) => d?.kind === "discovery")
      .length;
  expect(discoveries).toBe(e.warpPortals ? 36 : 35);
  const reputation =
    s.supplies.reputation.length +
    s.privateSeats.reduce((n, p) => n + p.reputation.length, 0) +
    (s.pendingDecision?.kind === "reputation"
      ? s.pendingDecision.drawn.length
      : 0);
  expect(reputation).toBe(33);
  const explored = s.sectors
    .filter((x) => {
      const n = Number(x.tileId);
      return (
        (n >= 101 && n <= 110) ||
        (n >= 201 && n <= 211) ||
        n === 214 ||
        n === 281 ||
        (n >= 301 && n <= 318) ||
        n === 381 ||
        n === 382
      );
    })
    .map((x) => Number(x.tileId));
  const sectorIds = [
    ...s.supplies.inner,
    ...s.supplies.middle,
    ...s.supplies.outer,
    ...e.discardedSectors.inner,
    ...e.discardedSectors.middle,
    ...e.discardedSectors.outer,
    ...e.boxedSectors,
    ...(s.pendingDecision?.kind === "exploration"
      ? s.pendingDecision.drawnTileIds
      : []),
  ]
    .map(Number)
    .concat(explored);
  expect(sectorIds).toHaveLength(43);
  expect(new Set(sectorIds).size).toBe(43);
  for (const seat of s.seats) {
    const population =
      s.sectors
        .filter((x) => x.owner === seat.id)
        .reduce((n, x) => n + x.population.length, 0) +
      seat.ambassadors.length +
      Object.values(seat.graveyard ?? {}).reduce((n, x) => n + x, 0) +
      [s.pendingDecision, ...e.decisions].reduce(
        (n, d) =>
          n +
          (d?.kind === "population-return" && d.owner === seat.id
            ? d.count
            : 0),
        0,
      );
    expect(
      Object.values(seat.populationTracks).reduce((n, x) => n + x, 0),
      `population ${seat.faction},round ${s.round},decision ${s.pendingDecision?.kind}`,
    ).toBe(population);
    const techs = Object.values(seat.technologies).flat();
    const extra =
      Number(techs.includes("advanced-robotics")) +
      2 * Number(techs.includes("quantum-grid"));
    const discs =
      seat.influenceOnTrack +
      Object.values(seat.actionDiscs).reduce((n, x) => n + x, 0) +
      s.sectors.filter((x) => x.owner === seat.id).length;
    expect(discs).toBe(getFaction(seat.faction).startingInfluenceDiscs + extra);
    for (const type of [
      "interceptor",
      "cruiser",
      "dreadnought",
      "starbase",
    ] as const)
      expect(
        s.ships.filter((x) => x.owner === seat.id && x.type === type).length,
      ).toBeLessThanOrEqual(BASE_COMPONENTS.perColor[type]);
  }
}
describe("independent all-faction conservation and replay", () => {
  it.each(BASE_FACTIONS.map((f, i) => ({ faction: f.id, index: i })))(
    "$faction preserves supplies through complete seeded play",
    ({ faction, index }) => {
      const main = getFaction(faction),
        count = 2 + (index % 5);
      const others = BASE_FACTIONS.filter(
        (f) => f.species === main.species && f.color !== main.color,
      ).slice(0, count - 1);
      let s = createGame({
          seed: 7001 + index * 113,
          warpPortals: index % 2 === 0,
          seats: [main, ...others].map((f, i) => ({
            id: `p${i}`,
            faction: f.id,
            controller: "ai",
          })),
        }),
        mirror = structuredClone(s);
      let n = 0;
      conservation(s);
      while (s.phase !== "finished" && n < 6000) {
        const actor = s.pendingDecision?.owner ?? s.activeSeatId;
        if (!actor) throw Error(`Missing actor in ${s.phase}`);
        const chosen = chooseAiCommand(getPlayerView(s, actor), 10000 + n);
        if (!chosen)
          throw Error(
            `No legal candidate for ${faction},step${n},${JSON.stringify(s.pendingDecision)}`,
          );
        if (n % 20 === 0) {
          const before = structuredClone(s);
          const rejected = processGameCommand(s, actor, {
            type: "resolve",
            decisionId: "not-an-issued-decision",
            choice: { kind: "control", accept: true },
          });
          expect(rejected.ok).toBe(false);
          expect(s).toEqual(before);
        }
        const accepted = processGameCommand(s, actor, chosen.command),
          replayed = processGameCommand(mirror, actor, chosen.command);
        if (!accepted.ok)
          throw Error(
            `${faction},step${n}:${accepted.error.message};${JSON.stringify(chosen.command)}`,
          );
        expect(replayed.ok).toBe(true);
        if (!replayed.ok) return;
        s = accepted.state;
        mirror = replayed.state;
        expect(mirror).toEqual(s);
        conservation(s);
        n++;
      }
      expect(s.phase, `${faction} stalled after ${n} commands`).toBe(
        "finished",
      );
      expect(s.engine?.scores).toHaveLength(count);
    },
    30000,
  );
});
