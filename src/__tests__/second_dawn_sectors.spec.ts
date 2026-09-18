import { describe, expect, it } from "vitest";
import { SECTORS, sectorDefinition } from "../../shared/eclipse/sectors";
import { BASE_FACTIONS } from "../../shared/eclipse/catalog";

describe("Second Dawn physical sector faces", () => {
  it("includes exactly the base 54 tiles represented by 60 faces", () => {
    expect(SECTORS).toHaveLength(60);
    expect(new Set(SECTORS.map((s) => s.id)).size).toBe(60);
    expect(SECTORS.filter((s) => s.id >= 101 && s.id <= 110)).toHaveLength(10);
    expect(
      SECTORS.filter(
        (s) => s.id >= 201 && (s.id <= 211 || s.id === 214 || s.id === 281),
      ),
    ).toHaveLength(13);
    expect(SECTORS.filter((s) => s.id >= 301)).toHaveLength(20);
    expect(sectorDefinition(295)).toBeUndefined();
    expect(sectorDefinition(321)).toBeUndefined();
  });
  it("uses printed population squares rather than mistaken spreadsheet totals", () => {
    expect(sectorDefinition(107)?.population).toHaveLength(3);
    expect(sectorDefinition(106)?.population).toHaveLength(2);
    expect(sectorDefinition(110)?.population).toEqual([
      { resource: "money", advanced: true },
      { resource: "gray", advanced: true },
    ]);
    expect(sectorDefinition(208)?.wormholes).toEqual([1, 2, 4, 5]);
    expect(sectorDefinition(104)?.wormholes).toEqual([0, 1, 3, 4]);
    expect(sectorDefinition(311)?.wormholes).toEqual([1, 4, 5]);
    expect(sectorDefinition(109)?.victoryPoints).toBe(4);
    expect(sectorDefinition(318)?.victoryPoints).toBe(1);
  });
  it("matches the independently audited publisher home population counts", () => {
    for (const faction of BASE_FACTIONS) {
      const sector = sectorDefinition(faction.homeSector)!;
      expect(sector.homeArrow).toBe(1);
      expect(sector.wormholes).toEqual([0, 1, 3, 4]);
      for (const resource of ["money", "science", "materials"] as const) {
        expect(
          sector.population.filter(
            (p) => p.resource === resource && !p.advanced,
          ),
        ).toHaveLength(faction.normalHomePopulation[resource]);
        expect(
          sector.population.filter(
            (p) => p.resource === resource && p.advanced,
          ),
        ).toHaveLength(faction.advancedHomePopulation[resource]);
      }
    }
  });
  it("distinguishes discoveries, ancients, guardians and the center defender", () => {
    expect(sectorDefinition(101)).toMatchObject({
      ancients: 1,
      discovery: true,
      artifacts: 0,
    });
    expect(sectorDefinition(104)).toMatchObject({
      ancients: 2,
      discovery: true,
    });
    expect(sectorDefinition(271)).toMatchObject({
      guardian: true,
      ancients: 0,
      discovery: true,
      artifacts: 1,
      homeArrow: 1,
    });
    expect(sectorDefinition(1)).toMatchObject({
      gcds: true,
      discovery: true,
      victoryPoints: 4,
      wormholes: [0, 1, 2, 3, 4, 5],
    });
    expect(SECTORS.filter((s) => s.warpPortal).map((s) => s.id)).toEqual([
      281, 381, 382,
    ]);
  });
  it("provides unique valid edges and traceable component evidence for every face", () => {
    for (const sector of SECTORS) {
      expect(new Set(sector.wormholes).size).toBe(sector.wormholes.length);
      expect(
        sector.wormholes.every((e) => Number.isInteger(e) && e >= 0 && e <= 5),
      ).toBe(true);
      expect(sector.source).toContain("steamusercontent.com/ugc/");
      expect(sector.ancients === 0 || sector.discovery).toBe(true);
    }
  });
});
