import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SectorPlanets from "../second-dawn-game/SectorPlanets";
import fixturesJson from "../second-dawn-game/reviewFixtures.json?raw";
import type { GameState } from "../../shared/eclipse/types";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { sectorDefinition } from "../../shared/eclipse/sectors";

it("lists every printed planet including empty advanced spaces with their technology requirement", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  const view = getPlayerView(state, state.seats[0].id)!;
  const sector = view.sectors.find((s) => s.owner === view.viewerSeatId)!;
  sector.population = [];
  const { container } = render(
    <SectorPlanets view={view} sector={sector} candidates={[]} />,
  );
  expect(container.querySelectorAll("[data-planet-square]")).toHaveLength(
    sectorDefinition(Number(sector.tileId))!.population.length,
  );
  expect(
    screen.getAllByRole("img", { name: "Empty population square" }).length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText("Advanced").length).toBeGreaterThan(0);
  expect(screen.queryByText('Colonization requirements')).not.toBeInTheDocument();
  const advanced=sectorDefinition(Number(sector.tileId))!.population.findIndex(square=>square.advanced&&square.resource==='money');
  fireEvent.click(screen.getByRole('button',{name:`Inspect Money planet p${advanced} in sector ${sector.tileId}`}));
  expect(screen.getByText(/Requires Advanced Economy/)).toBeInTheDocument();
});
it("matches occupied cubes by square id and shows gray/orbital choices and actual legal colony eligibility", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  const view = getPlayerView(state, state.seats[0].id)!;
  const sector = view.sectors.find((s) => s.owner === view.viewerSeatId)!;
  sector.population = [{ squareId: "p0", resource: "money" }];
  sector.orbital = true;
  render(
    <SectorPlanets
      view={view}
      sector={sector}
      candidates={[
        {
          label: "Colonize orbital",
          description: "",
          command: {
            type: "colonize",
            placements: [
              { sectorId: sector.id, squareId: "orbital", resource: "science" },
            ],
          },
        },
      ]}
    />,
  );
  expect(screen.getByLabelText("Occupied · Money cube")).toBeInTheDocument();
  expect(screen.getAllByText("Orbital")[0]).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:`Inspect Orbital planet orbital in sector ${sector.tileId}`}));
  expect(screen.getByText("Science · 1 colony ship")).toBeInTheDocument();
});

it("uses population cubes and advanced symbols instead of repeating status words on each planet", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  const view = getPlayerView(state, state.seats[0].id)!;
  const sector = view.sectors.find((s) => s.owner === view.viewerSeatId)!;
  const { container } = render(
    <SectorPlanets view={view} sector={sector} candidates={[]} />,
  );
  for (const tile of container.querySelectorAll("[data-planet-square]"))
    expect(tile.textContent).not.toMatch(/Standard|Occupied|Empty/);
  expect(
    screen.getAllByRole("img", { name: /Occupied|Empty population square/ })
      .length,
  ).toBe(sectorDefinition(Number(sector.tileId))!.population.length);
  expect(
    screen.getAllByRole("img", { name: "Advanced planet" }).length,
  ).toBeGreaterThan(0);
});
