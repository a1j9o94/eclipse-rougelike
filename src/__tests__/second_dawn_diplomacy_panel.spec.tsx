import { expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import DiplomacyPanel from "../second-dawn-game/DiplomacyPanel";
import fixturesJson from "../second-dawn-game/reviewFixtures.json?raw";
import type { GameState } from "../../shared/eclipse/types";
import { getPlayerView } from "../../shared/eclipse/protocol";
import { incomeForPopulationAway } from "../../shared/eclipse/tracks";

it("shows retained ambassadors by faction and keeps opponent reputation face down", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  state.seats[0].ambassadors = [state.seats[1].id];
  state.seats[1].ambassadors = [state.seats[0].id];
  state.privateSeats[0].reputation = [3, 4];
  state.privateSeats[1].reputation = [2, 2];
  const view = getPlayerView(state, state.seats[0].id)!;
  render(
    <DiplomacyPanel
      view={view}
      candidates={[]}
      disabled={false}
      onSubmit={() => {}}
    />,
  );
  expect(
    screen.getByLabelText("Your ambassador from Hydran Progress"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Your reputation: 3 VP")).toBeInTheDocument();
  const opponent = screen.getByRole("region", {
    name: "Hydran Progress diplomatic rack",
  });
  expect(
    within(opponent).getAllByLabelText("Face-down reputation tile"),
  ).toHaveLength(2);
  expect(within(opponent).queryByText("2 VP")).not.toBeInTheDocument();
});
it("submits only a supplied legal offer and disables it when disconnected", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  const view = getPlayerView(state, state.seats[0].id)!;
  const command = {
    type: "offer-diplomacy" as const,
    to: state.seats[1].id,
    resource: "science" as const,
  };
  const onSubmit = vi.fn();
  const props = {
    view,
    candidates: [
      {
        command,
        label: "Offer diplomacy",
        description: "Exchange using science.",
      },
    ],
    disabled: false,
    onSubmit,
  };
  const { rerender } = render(<DiplomacyPanel {...props} />);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Offer ambassador exchange to Hydran Progress",
    }),
  );
  expect(onSubmit).toHaveBeenCalledWith(command);
  rerender(<DiplomacyPanel {...props} disabled />);
  expect(
    screen.getByRole("button", {
      name: "Offer ambassador exchange to Hydran Progress",
    }),
  ).toBeDisabled();
});

it("chooses a legal population cube visually and keeps unavailable resources explained", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  state.seats[0].populationTracks.science = 2;
  const view = getPlayerView(state, state.seats[0].id)!;
  const onSubmit = vi.fn();
  render(<DiplomacyPanel view={view} candidates={[
    { command: { type: "offer-diplomacy", to: state.seats[1].id, resource: "science" }, label: "Offer diplomacy", description: "Exchange using science." },
  ]} disabled={false} onSubmit={onSubmit} />);
  expect(screen.queryByRole("combobox")).toBeNull();
  const science = screen.getByRole("button", { name: "Offer science population cube to Hydran Progress" });
  expect(science).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(`Income ${incomeForPopulationAway(2)} → ${incomeForPopulationAway(3)}`)).toBeInTheDocument();
  expect(screen.getByLabelText(`Your science income: ${incomeForPopulationAway(2)} → ${incomeForPopulationAway(3)}`)).toBeInTheDocument();
  expect(screen.queryByText(/Each player loses/)).toBeNull();
  expect(screen.getByRole("button", { name: "Money population cube unavailable for exchange with Hydran Progress" })).toBeDisabled();
  fireEvent.click(science);
  fireEvent.click(screen.getByRole("button", { name: "Offer ambassador exchange to Hydran Progress" }));
  expect(onSubmit).toHaveBeenCalledWith({ type: "offer-diplomacy", to: state.seats[1].id, resource: "science" });
});

it("inspects an opponent without rendering the viewer’s secret reputation values or actions", () => {
  const state = (JSON.parse(fixturesJson) as Record<string, GameState>).opening;
  state.privateSeats[0].reputation = [4];
  state.privateSeats[1].reputation = [2, 3];
  state.seats[1].traitor = true;
  const view = getPlayerView(state, state.seats[0].id)!;
  render(
    <DiplomacyPanel
      view={view}
      inspectedSeatId={state.seats[1].id}
      candidates={[]}
      disabled={false}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getAllByLabelText("Face-down reputation tile")).toHaveLength(2);
  expect(
    screen.queryByLabelText("Your reputation: 4 VP"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("3 VP")).not.toBeInTheDocument();
  expect(screen.getByText(/Traitor card · −2 VP/)).toBeInTheDocument();
});
