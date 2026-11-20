import { describe, expect, it } from "vitest";
import { chooseAiCommand, evaluateAiCommand } from "../../shared/eclipse/ai";
import { processGameCommand } from "../../shared/eclipse/engine";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { createGame } from "../../shared/eclipse/setup";
import { aiWeaponValue } from "../../shared/eclipse/aiWeaponValue";

describe("Rift AI weapon valuation", () => {
  it("researches and legally equips Rift Cannon when multiple cruisers can use it", () => {
    const state = createGame({ seed: 88, riftCannons: true, seats: [
      { id: 'a', faction: 'orion', controller: 'ai' },
      { id: 'b', faction: 'hydran', controller: 'ai' },
    ] });
    state.round = 5;
    state.technologyMarket = ['rift-cannon', 'fusion-source'];
    state.supplies.technology = state.supplies.technology.filter(id => id !== 'rift-cannon');
    const seat = state.seats[0];
    seat.resources = { money: 15, science: 9, materials: 0 };
    seat.colonyShipsAvailable = 0;
    const cruiser = state.ships.find(ship => ship.owner === seat.id)!;
    state.ships.push({ ...cruiser, id: 'cruiser-2' }, { ...cruiser, id: 'cruiser-3' });
    const view = getPlayerView(state, seat.id);
    expect(evaluateAiCommand(view, { type: 'research', tileId: 'rift-cannon', track: 'grid' }))
      .toBeGreaterThan(evaluateAiCommand(view, { type: 'research', tileId: 'fusion-source', track: 'grid' }) + 5);
    const research = chooseAiCommand(view, 19)!;
    expect(research.command).toMatchObject({ type: 'research', tileId: 'rift-cannon' });
    const researched = processGameCommand(state, seat.id, research.command);
    expect(researched.ok).toBe(true);
    if (!researched.ok) return;
    const passed = processGameCommand(researched.state, 'b', { type: 'pass' });
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    const upgrade = chooseAiCommand(getPlayerView(passed.state, seat.id), 19)!;
    expect(upgrade.command).toMatchObject({ type: 'upgrade', blueprints: [{ shipType: 'cruiser', parts: expect.arrayContaining(['rift-cannon']) }] });
    const refitted = processGameCommand(passed.state, seat.id, upgrade.command);
    expect(refitted.ok).toBe(true);
  });
  it("values shield-bypassing expected damage after backfire without a computer bonus", () => {
    const rift = {
      color: "magenta",
      kind: "cannon",
      dice: 1,
      damage: 1,
    } as const;
    expect(aiWeaponValue(rift)).toBe(2);
    expect(aiWeaponValue(rift, 3)).toBe(2);
  });
  it("preserves normal damage, count and computer scaling", () => {
    expect(
      aiWeaponValue(
        { color: "orange", kind: "missile", dice: 2, damage: 2 },
        1.5,
      ),
    ).toBe(6);
  });
});
