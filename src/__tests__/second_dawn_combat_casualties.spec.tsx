import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { getFaction } from "../../shared/eclipse/catalog";
import { getPlayerView } from "../../shared/eclipse/protocol";
import type { GameEvent, GameState } from "../../shared/eclipse/types";
import { CombatPlayback } from "../second-dawn-game/BattleOverview";
import fixturesJson from "../second-dawn-game/reviewFixtures.json?raw";

function battleView() {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).combat;
  return getPlayerView(state, state.pendingDecision!.owner)!;
}
function destroyedVolley(): NonNullable<GameEvent["combatVolley"]> {
  return {
    battleId: "resolved-battle",
    sectorId: "battle-sector",
    attacker: "attacker",
    dice: [{ id: "die", face: 6, damage: 3, computer: 0 }],
    impacts: [{ dieId: "die", targetId: "lost-cruiser", damage: 3, hit: true }],
    targets: [{ id: "lost-cruiser", shipType: "cruiser", owner: battleView().seats[0].id, hpBefore: 2, hpAfter: 0, excess: 1, destroyed: true }],
  };
}

it("keeps a named casualty and silhouette visible after its ship and battle disappear", () => {
  const view = battleView();
  view.battle = null;
  view.ships = [];
  render(<CombatPlayback view={view} volleys={[destroyedVolley()]} />);
  const casualty = screen.getByRole("group", { name: "Cruiser destroyed" });
  expect(within(casualty).getByRole("img", { name: "Cruiser blueprint silhouette" })).toBeInTheDocument();
  expect(casualty).toHaveTextContent(getFaction(view.seats[0].faction).name);
  expect(casualty).toHaveTextContent("2 → 0 HP");
  expect(casualty).toHaveTextContent("Destroyed");
  expect(screen.getByRole("status")).toHaveTextContent("1 ship destroyed");
});

it('keeps a destroyed Exiles Orbital distinct from a Starbase in recorded combat', () => {
  const volley = destroyedVolley();
  volley.targets = [{ ...volley.targets[0], id: 'orbital-1', shipType: 'starbase', orbitalShip: true }];
  volley.impacts = volley.impacts.map(impact => ({ ...impact, targetId: 'orbital-1' }));
  render(<CombatPlayback volleys={[volley]} />);
  const casualty = screen.getByRole('group', { name: 'Orbital destroyed' });
  expect(within(casualty).getByRole('img', { name: 'Orbital blueprint silhouette' })).toBeInTheDocument();
  expect(screen.getByLabelText('Orbital: 1 hit, 0 misses, destroyed')).toBeInTheDocument();
});

it("uses neutral ship art and never invents an owner for legacy journal entries", () => {
  const volley = destroyedVolley();
  volley.targets = [{ ...volley.targets[0], shipType: "ancient", owner: "ancient" }, { id: "legacy-ship", hpBefore: 1, hpAfter: 0, excess: 0, destroyed: true }];
  render(<CombatPlayback volleys={[volley]} />);
  const ancient = screen.getByRole("group", { name: "Ancient destroyed" });
  expect(within(ancient).getByRole("img", { name: "Ancient ship silhouette" })).toBeInTheDocument();
  expect(ancient).toHaveTextContent("Ancients");
  expect(screen.getByRole("group", { name: "Ship destroyed" })).toHaveTextContent("legacy-ship");
  expect(screen.getByRole("status")).toHaveTextContent("2 ships destroyed");
});

it("distinguishes damage from destruction and supports disabling impact motion", () => {
  const volley = destroyedVolley();
  volley.targets.push({ id: "damaged", hpBefore: 3, hpAfter: 2, excess: 0, destroyed: false });
  const { rerender } = render(<CombatPlayback volleys={[volley]} />);
  expect(screen.getByRole("group", { name: "Ship damaged" })).toHaveTextContent("3 → 2 HP");
  fireEvent.click(screen.getByRole("button", { name: "Skip volley animation" }));
  expect(screen.getByRole("region", { name: "Recent combat impacts" })).toHaveClass("is-fast");
  rerender(<CombatPlayback volleys={[volley]} fast />);
  expect(screen.getByRole("button", { name: "Fast playback on" })).toBeDisabled();
  expect(screen.getByRole("group", { name: "Cruiser destroyed" })).toBeVisible();
});

it("recovers older event identity from previously visible ships without requiring a live ship", () => {
  const volley = destroyedVolley();
  volley.targets = [{ id: "legacy-ship", hpBefore: 1, hpAfter: 0, excess: 0, destroyed: true }];
  render(<CombatPlayback volleys={[volley]} knownShips={[{ id: "legacy-ship", type: "guardian", owner: "guardian" }]} />);
  const casualty = screen.getByRole("group", { name: "Guardian destroyed" });
  expect(within(casualty).getByRole("img", { name: "Guardian ship silhouette" })).toBeInTheDocument();
  expect(casualty).toHaveTextContent("Guardians");
});

it("responds when the global motion preference changes during combat", () => {
  const volleys = [destroyedVolley()];
  const { rerender } = render(<CombatPlayback volleys={volleys} />);
  rerender(<CombatPlayback volleys={volleys} fast />);
  expect(screen.getByRole("region", { name: "Recent combat impacts" })).toHaveClass("is-fast");
  expect(screen.getByRole("button", { name: "Fast playback on" })).toBeDisabled();
});
