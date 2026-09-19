import { expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import BattleOverview from "../second-dawn-game/BattleOverview";
import fixturesJson from "../second-dawn-game/reviewFixtures.json?raw";
import type { GameState } from "../../shared/eclipse/types";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { neutralBlueprint } from "../../shared/eclipse/blueprints";

it("shows the active attacking and defending fleets with their public blueprint statistics", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).combat;
  const view = getPlayerView(state, state.pendingDecision!.owner)!;
  render(<BattleOverview view={view} />);
  expect(
    screen.getByRole("region", { name: /Attacker fleet/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: /Defender fleet/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Dreadnought blueprint silhouette" }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("img", { name: /Initiative:/ }).length,
  ).toBeGreaterThan(0);
});
it("uses the actual Ancient blueprint and remaining damage without inventing neutral bonuses", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).combat;
  const view = getPlayerView(state, state.pendingDecision!.owner)!;
  view.battle!.defender = "ancient";
  view.ships = view.ships.filter((s) => s.owner === view.battle!.attacker);
  view.ships.push({
    id: "ancient-visible",
    type: "ancient",
    owner: "ancient",
    sectorId: view.battle!.sectorId,
    damage: 1,
  });
  render(<BattleOverview view={view} />);
  const defender = screen.getByRole("region", {
    name: "Defender fleet: Ancients",
  });
  const stats = neutralBlueprint("ancient-standard").stats;
  expect(
    within(defender).getByRole("img", { name: "Ancient ship silhouette" }),
  ).toBeInTheDocument();
  expect(
    within(defender).getByRole("img", {
      name: `HP: ${stats.hull}/${stats.hull + 1}`,
    }),
  ).toBeInTheDocument();
  expect(
    within(defender).getByRole("img", { name: `Computer: +${stats.computer}` }),
  ).toBeInTheDocument();
});
it("presents authoritative recent impacts in battle with an explicit fast playback control",()=>{const state=(JSON.parse(fixturesJson) as Record<string,GameState>).combat;const view=getPlayerView(state,state.pendingDecision!.owner)!;render(<BattleOverview view={view} recentVolleys={[{battleId:'battle',attacker:'ancient',dice:[{id:'d1',face:6,damage:2,computer:0,sourceShipType:'ancient',weaponKind:'cannon',weaponColor:'orange'}],impacts:[{dieId:'d1',targetId:'target',damage:2,hit:true}],targets:[{id:'target',hpBefore:2,hpAfter:0,excess:0,destroyed:true}]}]}/>);expect(screen.getByRole('region',{name:'Recent combat impacts'})).toHaveTextContent('2 → 0 HP');expect(screen.getByRole('group',{name:'Ship destroyed'})).toHaveTextContent('Destroyed');fireEvent.click(screen.getByRole('button',{name:'Skip volley animation'}));expect(screen.getByRole('button',{name:'Fast playback on'})).toBeDisabled();});
