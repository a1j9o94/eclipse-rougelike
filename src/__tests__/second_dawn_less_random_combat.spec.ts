import { describe, expect, it } from "vitest";
import { applyLessRandomReputation } from "../../shared/eclipse/reputation";
import { substituteSuperJokerDice, superJokerFaces } from "../../shared/eclipse/lessRandomCombat";
import { createGame } from "../../shared/eclipse/setup";

describe("Less Random combat and reputation tables", () => {
  it("starts with the exact public 33-tile supply and queues Eridani's two draw credits", () => {
    const state = createGame({seed:17,warpPortals:false,rulesMode:"less-random-v1",seats:[
      {id:"e",faction:"eridani",controller:"human"},
      {id:"h",faction:"hydran",controller:"human"},
    ]});
    expect(state.lessRandom?.reputationSupply.reduce<Record<number,number>>((counts,value)=>({...counts,[value]:(counts[value]??0)+1}),{})).toEqual({1:12,2:10,3:7,4:4});
    expect(state.lessRandom?.reputationBySeat).toEqual({e:[],h:[]});
    expect([state.pendingDecision,...(state.engine?.decisions??[])]).toContainEqual(expect.objectContaining({owner:"e",kind:"less-random-reputation",draws:2}));
  });
  it("transcribes the Super Joker face counts at both source-page boundaries", () => {
    expect(superJokerFaces(1)).toEqual([3]);
    expect(superJokerFaces(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(superJokerFaces(25)).toEqual([
      1,1,1,1, 2,2,2,2, 3,3,3,3,3, 4,4,4,4, 5,5,5,5, 6,6,6,6,
    ]);
    expect(superJokerFaces(26)).toHaveLength(26);
    expect(superJokerFaces(50)).toEqual([
      1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3,3,
      4,4,4,4,4,4,4,4,4, 5,5,5,5,5,5,5,5, 6,6,6,6,6,6,6,6,
    ]);
    expect(superJokerFaces(0)).toBeNull();
    expect(superJokerFaces(51)).toBeNull();
    for (let dice = 1; dice <= 50; dice++) expect(superJokerFaces(dice)).toHaveLength(dice);
  });

  it("preserves mixed weapon provenance and derives Rift damage from substituted faces", () => {
    const dice = [
      { id:"yellow", face:6, damage:1, computer:0, weaponColor:"yellow" as const },
      { id:"rift", face:1, damage:0, computer:4, weaponColor:"magenta" as const },
    ];
    expect(substituteSuperJokerDice(dice)).toEqual([
      { ...dice[0], face:3 },
      { ...dice[1], face:4, damage:2 },
    ]);
  });

  it("adds and upgrades public tiles at their exact draw costs while conserving supply", () => {
    const supply = [1,1,2,2,3,4];
    const result = applyLessRandomReputation([1], supply, 4, 4, [
      { type:"upgrade", from:1 }, { type:"upgrade", from:2 }, { type:"add" },
    ]);
    expect(result).toEqual({ kept:[3,1], supply:[1,2,4,1,2], spent:4 });
    expect([...result.kept, ...result.supply].sort()).toEqual([1,1,1,2,2,3,4]);
  });

  it("rejects unavailable tiles, full tracks, and overspending", () => {
    expect(() => applyLessRandomReputation([], [2], 4, 1, [{type:"add"}])).toThrow("No 1 VP");
    expect(() => applyLessRandomReputation([1], [1,2], 1, 1, [{type:"add"}])).toThrow("no empty space");
    expect(() => applyLessRandomReputation([2], [3], 4, 1, [{type:"upgrade",from:2}])).toThrow("exceed");
  });

  it("allows blocked draw credits to remain unspent when the finite supply is exhausted", () => {
    expect(applyLessRandomReputation([4,4,4,4], [], 4, 5, [])).toEqual({
      kept:[4,4,4,4], supply:[], spent:0,
    });
  });
});
